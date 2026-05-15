require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('./config/db');
const cloudinary = require('./config/cloudinary');
const { initDatabase } = require('./db/init');

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'quoteflow_secret_change_in_production';
const JWT_EXPIRES = '7d';
const NODE_ENV = process.env.NODE_ENV || 'development';

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  if (NODE_ENV !== 'production') return callback(null, true);
  if (allowedOrigins.length === 0) {
    console.warn('[CORS] NODE_ENV=production but FRONTEND_URL is empty — allowing all origins. Set FRONTEND_URL for strict CORS.');
    return callback(null, true);
  }
  if (allowedOrigins.includes(origin)) return callback(null, true);
  console.warn(`[CORS] Blocked origin: ${origin}`);
  return callback(null, false);
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

const corsOptions = {
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const imageUpload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'quoteflow',
      resource_type: 'image',
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ── AUTH ROUTES ───────────────────────────────────────────
app.post(
  '/api/auth/register',
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const emailNorm = email.toLowerCase().trim();
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [emailNorm],
    });
    if (existing.rows[0]) {
      return res.status(400).json({ error: 'This email is already registered. Please login instead.' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO users (id, name, email, password_hash) VALUES (?,?,?,?)',
      args: [id, name.trim(), emailNorm, password_hash],
    });
    const token = jwt.sign({ id, name: name.trim(), email: emailNorm }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.status(201).json({ token, user: { id, name: name.trim(), email: emailNorm } });
  })
);

app.post(
  '/api/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const emailNorm = email.toLowerCase().trim();
    const { rows } = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [emailNorm],
    });
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'No account found with this email' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  })
);

app.get(
  '/api/auth/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { rows } = await db.execute({
      sql: 'SELECT id,name,email,role,created_at FROM users WHERE id=?',
      args: [req.user.id],
    });
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  })
);

// ── SETTINGS ────────────────────────────────────────────────
app.get(
  '/api/settings',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { rows } = await db.execute('SELECT key, value FROM settings');
    const obj = {};
    rows.forEach((r) => {
      try {
        obj[r.key] = JSON.parse(r.value);
      } catch {
        obj[r.key] = r.value;
      }
    });
    res.json(obj);
  })
);

app.put(
  '/api/settings',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const stmts = Object.entries(req.body).map(([k, v]) => ({
      sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      args: [k, typeof v === 'object' ? JSON.stringify(v) : String(v)],
    }));
    await db.batch(stmts, 'write');
    res.json({ success: true });
  })
);

// ── PRODUCTS ──────────────────────────────────────────────
app.get(
  '/api/products/search',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const q = req.query.q || '';
    if (!q) return res.json([]);
    const like = `%${q}%`;
    const { rows } = await db.execute({
      sql: 'SELECT * FROM products WHERE name LIKE ? OR code LIKE ? OR category LIKE ? ORDER BY name LIMIT 20',
      args: [like, like, like],
    });
    res.json(rows);
  })
);

app.get(
  '/api/products',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { search } = req.query;
    if (search) {
      const like = `%${search}%`;
      const { rows } = await db.execute({
        sql: 'SELECT * FROM products WHERE name LIKE ? OR code LIKE ? ORDER BY name LIMIT 20',
        args: [like, like],
      });
      return res.json(rows);
    }
    const { rows } = await db.execute('SELECT * FROM products ORDER BY name');
    res.json(rows);
  })
);

app.post(
  '/api/products',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const p = req.body;
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO products (id,name,code,description,rate,unit,image,mrp,category,stock,min_stock,track_stock) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      args: [
        id,
        p.name,
        p.code || '',
        p.description || '',
        p.rate || 0,
        p.unit || 'Pcs',
        p.image || '',
        p.mrp ?? null,
        p.category || '',
        p.stock || 0,
        p.min_stock || 5,
        p.track_stock ? 1 : 0,
      ],
    });
    res.json({ id, ...p });
  })
);

app.put(
  '/api/products/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const p = req.body;
    await db.execute({
      sql: 'UPDATE products SET name=?,code=?,description=?,rate=?,unit=?,image=?,mrp=?,category=?,stock=?,min_stock=?,track_stock=? WHERE id=?',
      args: [
        p.name,
        p.code || '',
        p.description || '',
        p.rate || 0,
        p.unit || 'Pcs',
        p.image || '',
        p.mrp ?? null,
        p.category || '',
        p.stock || 0,
        p.min_stock || 5,
        p.track_stock ? 1 : 0,
        req.params.id,
      ],
    });
    res.json({ success: true });
  })
);

app.delete(
  '/api/products/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    await db.execute({ sql: 'DELETE FROM products WHERE id=?', args: [req.params.id] });
    res.json({ success: true });
  })
);

app.post(
  '/api/products/:id/stock',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { rows } = await db.execute({
      sql: 'SELECT * FROM products WHERE id=?',
      args: [req.params.id],
    });
    const product = rows[0];
    if (!product) return res.status(404).json({ error: 'Not found' });
    const newStock = Math.max(0, (product.stock || 0) + Number(req.body.adjustment));
    await db.execute({
      sql: 'UPDATE products SET stock=? WHERE id=?',
      args: [newStock, req.params.id],
    });
    res.json({ success: true, stock: newStock });
  })
);

app.get(
  '/api/inventory/dashboard',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [total, low, out, val] = await Promise.all([
      db.execute('SELECT COUNT(*) as c FROM products'),
      db.execute('SELECT * FROM products WHERE track_stock=1 AND stock <= min_stock ORDER BY stock ASC'),
      db.execute('SELECT * FROM products WHERE track_stock=1 AND stock=0'),
      db.execute('SELECT COALESCE(SUM(stock*rate),0) as v FROM products WHERE track_stock=1'),
    ]);
    res.json({
      total_products: Number(total.rows[0]?.c ?? 0),
      low_stock: low.rows,
      out_of_stock: out.rows,
      stock_value: val.rows[0]?.v ?? 0,
    });
  })
);

// ── QUOTATIONS ──────────────────────────────────────────────
app.get(
  '/api/quotations',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { rows } = await db.execute('SELECT * FROM quotations ORDER BY created_at DESC');
    res.json(rows);
  })
);

app.get(
  '/api/quotations/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { rows } = await db.execute({
      sql: 'SELECT * FROM quotations WHERE id=?',
      args: [req.params.id],
    });
    const q = rows[0];
    if (!q) return res.status(404).json({ error: 'Not found' });
    const items = await db.execute({
      sql: 'SELECT * FROM quotation_items WHERE quotation_id=? ORDER BY sr_no',
      args: [req.params.id],
    });
    q.items = items.rows;
    res.json(q);
  })
);

app.post(
  '/api/quotations',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = uuidv4();

    // Generate unique quotation number
    const latestQuote = await db.execute({
      sql: "SELECT quote_number FROM quotations ORDER BY created_at DESC LIMIT 1",
    });
    
    let nextNumber = 1;
    
    if (latestQuote.rows[0]?.quote_number) {
      const last = latestQuote.rows[0].quote_number;
      const num = parseInt(last.replace('QT-', ''), 10);
    
      if (!isNaN(num)) {
        nextNumber = num + 1;
      }
    }
    
    const quote_number = `QT-${String(nextNumber).padStart(4, '0')}`;

    const q = req.body;

    const logoRow = await db.execute({
      sql: "SELECT value FROM settings WHERE key='company_logo'",
    });

    const logo = q.company_logo || logoRow.rows[0]?.value || '';

    const stmts = [
      {
        sql: `INSERT INTO quotations (id,quote_number,company_name,company_logo,customer_name,customer_mobile,customer_address,date,validity_days,subtotal,discount,tax,tax_rate,total,notes,terms,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          id,
          quote_number,
          q.company_name || '',
          logo,
          q.customer_name || '',
          q.customer_mobile || '',
          q.customer_address || '',
          q.date || new Date().toISOString().split('T')[0],
          q.validity_days || 30,
          q.subtotal || 0,
          q.discount || 0,
          q.tax || 0,
          q.tax_rate || 0,
          q.total || 0,
          q.notes || '',
          q.terms || '',
          q.status || 'draft',
        ],
      },
    ];

    if (q.items?.length) {
      q.items.forEach((item, i) => {
        stmts.push({
          sql: `INSERT INTO quotation_items (id,quotation_id,sr_no,product_id,product_name,product_image,shape,color,body_color,warranty,quantity,unit,rate,discount,amount,bill_after_warranty,warranty_end_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: [
            uuidv4(),
            id,
            i + 1,
            item.product_id || '',
            item.product_name || '',
            item.product_image || '',
            item.shape || '',
            item.color || '',
            item.body_color || '',
            item.warranty || '',
            item.quantity || 1,
            item.unit || 'Pcs',
            item.rate || 0,
            item.discount || 0,
            item.amount || 0,
            item.bill_after_warranty ? 1 : 0,
            item.warranty_end_date || null,
          ],
        });
      });
    }

    await db.batch(stmts, 'write');

    res.json({ id, quote_number });
  })
);

app.put(
  '/api/quotations/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const q = req.body;
    const logoRow = await db.execute({
      sql: "SELECT value FROM settings WHERE key='company_logo'",
    });
    const logo = q.company_logo || logoRow.rows[0]?.value || '';

    const stmts = [
      {
        sql: `UPDATE quotations SET company_name=?,company_logo=?,customer_name=?,customer_mobile=?,customer_address=?,date=?,validity_days=?,subtotal=?,discount=?,tax=?,tax_rate=?,total=?,notes=?,terms=?,status=?,updated_at=datetime('now') WHERE id=?`,
        args: [
          q.company_name || '',
          logo,
          q.customer_name || '',
          q.customer_mobile || '',
          q.customer_address || '',
          q.date,
          q.validity_days || 30,
          q.subtotal || 0,
          q.discount || 0,
          q.tax || 0,
          q.tax_rate || 0,
          q.total || 0,
          q.notes || '',
          q.terms || '',
          q.status || 'draft',
          req.params.id,
        ],
      },
      {
        sql: 'DELETE FROM quotation_items WHERE quotation_id=?',
        args: [req.params.id],
      },
    ];
    if (q.items?.length) {
      q.items.forEach((item, i) => {
        stmts.push({
          sql: `INSERT INTO quotation_items (id,quotation_id,sr_no,product_id,product_name,product_image,shape,color,body_color,warranty,quantity,unit,rate,discount,amount,bill_after_warranty,warranty_end_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: [
            uuidv4(),
            req.params.id,
            i + 1,
            item.product_id || '',
            item.product_name || '',
            item.product_image || '',
            item.shape || '',
            item.color || '',
            item.body_color || '',
            item.warranty || '',
            item.quantity || 1,
            item.unit || 'Pcs',
            item.rate || 0,
            item.discount || 0,
            item.amount || 0,
            item.bill_after_warranty ? 1 : 0,
            item.warranty_end_date || null,
          ],
        });
      });
    }
    await db.batch(stmts, 'write');
    res.json({ success: true });
  })
);

app.delete(
  '/api/quotations/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    await db.execute({ sql: 'DELETE FROM quotations WHERE id=?', args: [req.params.id] });
    res.json({ success: true });
  })
);

// ── ANALYTICS ───────────────────────────────────────────────
app.get(
  '/api/analytics',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [total_quotes, total_revenue, this_month, top_products, recent, status_counts] = await Promise.all([
      db.execute('SELECT COUNT(*) as c FROM quotations'),
      db.execute("SELECT COALESCE(SUM(total),0) as s FROM quotations WHERE status='approved'"),
      db.execute("SELECT COUNT(*) as c FROM quotations WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now')"),
      db.execute(
        'SELECT product_name,SUM(quantity) as total_qty,SUM(amount) as total_amount FROM quotation_items GROUP BY product_name ORDER BY total_amount DESC LIMIT 5'
      ),
      db.execute('SELECT * FROM quotations ORDER BY created_at DESC LIMIT 5'),
      db.execute('SELECT status,COUNT(*) as c FROM quotations GROUP BY status'),
    ]);
    res.json({
      total_quotes: Number(total_quotes.rows[0]?.c ?? 0),
      total_revenue: total_revenue.rows[0]?.s ?? 0,
      this_month: Number(this_month.rows[0]?.c ?? 0),
      top_products: top_products.rows,
      recent: recent.rows,
      status_counts: status_counts.rows,
    });
  })
);

// ── EXCEL EXPORT / IMPORT ───────────────────────────────────
app.get(
  '/api/products/export',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { rows: products } = await db.execute(
      'SELECT name,code,description,rate,unit,mrp,category,image as imageUrl,stock,min_stock,track_stock FROM products ORDER BY name'
    );
    const ws = XLSX.utils.json_to_sheet(products);
    ws['!cols'] = [
      { wch: 30 },
      { wch: 12 },
      { wch: 40 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
      { wch: 40 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="products.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(buf));
  })
);

app.post(
  '/api/products/import',
  authMiddleware,
  importUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file?.buffer) return res.status(400).json({ error: 'No file uploaded' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    let imported = 0;
    let skipped = 0;
    const errors = [];

    const tx = await db.transaction('write');
    try {
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        try {
          const name = String(row.name || row.Name || row['Product Name'] || '').trim();
          if (!name) {
            skipped++;
            continue;
          }
          const dup = await tx.execute({
            sql: 'SELECT id FROM products WHERE LOWER(name)=LOWER(?)',
            args: [name],
          });
          if (dup.rows[0]) {
            skipped++;
            continue;
          }
          const imageUrl = String(row.imageUrl || row.image || row.Image || row['Image URL'] || '').trim();
          const description = String(row.description || row.Description || '').trim();
          const trackStockRaw = row.track_stock ?? row.trackStock ?? row['Track Stock'] ?? row['track stock'] ?? '';
          const trackStock = ['1', 'true', 'yes', 'y'].includes(String(trackStockRaw).trim().toLowerCase());
          await tx.execute({
            sql: 'INSERT INTO products (id,name,code,description,rate,unit,image,mrp,category,stock,min_stock,track_stock) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            args: [
              uuidv4(),
              name,
              String(row.code || row.Code || '').trim(),
              description,
              Number(row.rate || row.Rate || row.Price || 0),
              String(row.unit || row.Unit || 'Pcs').trim(),
              imageUrl,
              Number(row.mrp || row.MRP || 0) || null,
              String(row.category || row.Category || '').trim(),
              Number(row.stock || 0),
              Number(row.min_stock || 5),
              trackStock ? 1 : 0,
            ],
          });
          imported++;
        } catch (e) {
          errors.push(`Row ${idx + 2}: ${e.message}`);
        }
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      tx.close();
    }

    res.json({ success: true, imported, skipped, errors: errors.slice(0, 10) });
  })
);

// ── IMAGE UPLOAD (Cloudinary) ───────────────────────────────
app.post(
  '/api/upload',
  authMiddleware,
  imageUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file?.path) return res.status(400).json({ error: 'No file' });
    res.json({ url: req.file.path });
  })
);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Optional: serve CRA build from same process (e.g. single-host deploy) ──
const clientBuild = path.join(__dirname, '..', 'client', 'build');
if (process.env.SERVE_CLIENT === 'true' && fs.existsSync(path.join(clientBuild, 'index.html'))) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// ── Errors ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err);
  res.status(500).json({
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Server error',
  });
});

async function start() {
  await initDatabase();

  if (NODE_ENV === 'production' && (!process.env.JWT_SECRET || JWT_SECRET === 'quoteflow_secret_change_in_production')) {
    console.warn('[security] Set a strong, unique JWT_SECRET in production (Render environment variables).');
  }

  app.listen(PORT, '0.0.0.0', async () => {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    let lanIP = 'unknown';
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          lanIP = net.address;
          break;
        }
      }
      if (lanIP !== 'unknown') break;
    }

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║        QuoteFlow Server — READY              ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Local:    http://localhost:${PORT}              ║`);
    console.log(`║  Network:  http://${lanIP}:${PORT}       ║`);
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Health:   http://${lanIP}:${PORT}/api/health ║`);
    console.log('╚══════════════════════════════════════════════╝\n');

    const u = await db.execute('SELECT COUNT(*) as c FROM users');
    const users = Number(u.rows[0]?.c ?? 0);
    if (users === 0) {
      console.log('⚠️  No users yet.');
      console.log(`   Register at http://${lanIP}:3000/register`);
      console.log('   or         http://localhost:3000/register\n');
    } else {
      console.log(`👤  ${users} user(s) in database.\n`);
    }
  });
}

start().catch((e) => {
  console.error('Failed to start server:', e);
  process.exit(1);
});
