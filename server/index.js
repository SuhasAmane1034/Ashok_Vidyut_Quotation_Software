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

const normalizeTokens = (text = '') =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const toFtsQuery = (text = '') => {
  const tokens = normalizeTokens(text);
  if (!tokens.length) return '';
  return tokens.map((t) => `${t}*`).join(' AND ');
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
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);

    const tokens = normalizeTokens(q);
    const ftsQuery = toFtsQuery(q);
    const scored = new Map();

    if (ftsQuery) {
      const { rows: ftsRows } = await db.execute({
        sql: `SELECT p.*, bm25(products_fts, 1.0, 0.3, 0.2) as rank
              FROM products_fts f
              JOIN products p ON p.id = f.product_id
              WHERE products_fts MATCH ?
              ORDER BY rank
              LIMIT 40`,
        args: [ftsQuery],
      });
      ftsRows.forEach((row, idx) => {
        scored.set(row.id, { ...row, _score: 1000 - idx * 10 + Number(row.rank || 0) * -10 });
      });
    }

    if (tokens.length) {
      const keywordWhere = tokens.map(() => 'LOWER(keyword) LIKE ?').join(' OR ');
      const { rows: keywordRows } = await db.execute({
        sql: `SELECT p.*, GROUP_CONCAT(pk.keyword) as kw_hits
              FROM product_keywords pk
              JOIN products p ON p.id = pk.product_id
              WHERE ${keywordWhere}
              GROUP BY p.id
              LIMIT 60`,
        args: tokens.map((t) => `%${t}%`),
      });
      keywordRows.forEach((row) => {
        const existing = scored.get(row.id);
        const hitCount = String(row.kw_hits || '').split(',').filter(Boolean).length;
        const kwScore = 200 + hitCount * 30;
        scored.set(row.id, { ...(existing || row), _score: (existing?._score || 0) + kwScore });
      });
    }

    if (!scored.size) {
      const like = `%${q}%`;
      const { rows } = await db.execute({
        sql: 'SELECT * FROM products WHERE name LIKE ? OR code LIKE ? OR category LIKE ? ORDER BY name LIMIT 20',
        args: [like, like, like],
      });
      return res.json(rows);
    }

    const ranked = Array.from(scored.values())
      .sort((a, b) => (b._score || 0) - (a._score || 0))
      .slice(0, 20)
      .map(({ _score, ...rest }) => rest);
    res.json(ranked);
  })
);

app.get(
  '/api/products',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { search } = req.query;
    if (search) {
      const { rows } = await db.execute({
        sql: 'SELECT * FROM products WHERE name LIKE ? OR code LIKE ? ORDER BY name LIMIT 20',
        args: [`%${search}%`, `%${search}%`],
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
    await db.execute({
      sql: 'INSERT INTO products_fts (product_id, product_name, code, category) VALUES (?, ?, ?, ?)',
      args: [id, p.name, p.code || '', p.category || ''],
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
    await db.execute({ sql: 'DELETE FROM products_fts WHERE product_id = ?', args: [req.params.id] });
    await db.execute({
      sql: 'INSERT INTO products_fts (product_id, product_name, code, category) VALUES (?, ?, ?, ?)',
      args: [req.params.id, p.name, p.code || '', p.category || ''],
    });
    res.json({ success: true });
  })
);

app.delete(
  '/api/products/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    await db.execute({ sql: 'DELETE FROM products WHERE id=?', args: [req.params.id] });
    await db.execute({ sql: 'DELETE FROM products_fts WHERE product_id=?', args: [req.params.id] });
    await db.execute({ sql: 'DELETE FROM product_keywords WHERE product_id=?', args: [req.params.id] });
    res.json({ success: true });
  })
);

app.delete(
  '/api/products/category/:category',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const category = decodeURIComponent(req.params.category);
    await db.execute({ sql: 'DELETE FROM products_fts WHERE product_id IN (SELECT id FROM products WHERE category = ?)', args: [category] });
    await db.execute({ sql: 'DELETE FROM product_keywords WHERE product_id IN (SELECT id FROM products WHERE category = ?)', args: [category] });
    await db.execute({ sql: 'DELETE FROM products WHERE category = ?', args: [category] });
    res.json({ success: true });
  })
);

app.get(
  '/api/products/:id/keywords',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { rows } = await db.execute({
      sql: 'SELECT id, keyword FROM product_keywords WHERE product_id = ? ORDER BY keyword',
      args: [req.params.id],
    });
    res.json(rows);
  })
);

app.put(
  '/api/products/:id/keywords',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const keywords = Array.isArray(req.body?.keywords)
      ? [...new Set(req.body.keywords.map((k) => String(k || '').trim().toLowerCase()).filter(Boolean))]
      : [];
    const stmts = [{ sql: 'DELETE FROM product_keywords WHERE product_id=?', args: [req.params.id] }];
    keywords.forEach((keyword) => {
      stmts.push({ sql: 'INSERT INTO product_keywords (product_id, keyword) VALUES (?, ?)', args: [req.params.id, keyword] });
    });
    await db.batch(stmts, 'write');
    res.json({ success: true, count: keywords.length });
  })
);

// ── SALESPERSONS ──────────────────────────────────────────
app.get(
  '/api/salespersons',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { rows } = await db.execute('SELECT id, name, is_default FROM salespersons ORDER BY name');
    res.json(rows.map((r) => ({ ...r, is_default: !!r.is_default })));
  })
);

app.post(
  '/api/salespersons',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const isDefault = !!req.body?.is_default;
    if (!name) return res.status(400).json({ error: 'Salesperson name is required' });
    const tx = await db.transaction('write');
    try {
      if (isDefault) await tx.execute('UPDATE salespersons SET is_default = 0');
      const row = await tx.execute({
        sql: 'INSERT INTO salespersons (name, is_default) VALUES (?, ?)',
        args: [name, isDefault ? 1 : 0],
      });
      await tx.commit();
      res.status(201).json({ id: Number(row.lastInsertRowid), name, is_default: isDefault });
    } catch (e) {
      await tx.rollback();
      if (String(e.message || '').toLowerCase().includes('unique')) {
        return res.status(400).json({ error: 'Salesperson already exists' });
      }
      throw e;
    } finally {
      tx.close();
    }
  })
);

app.put(
  '/api/salespersons/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const isDefault = !!req.body?.is_default;
    if (!name) return res.status(400).json({ error: 'Salesperson name is required' });
    const tx = await db.transaction('write');
    try {
      if (isDefault) await tx.execute('UPDATE salespersons SET is_default = 0');
      await tx.execute({
        sql: 'UPDATE salespersons SET name=?, is_default=? WHERE id=?',
        args: [name, isDefault ? 1 : 0, Number(req.params.id)],
      });
      await tx.commit();
      res.json({ success: true });
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      tx.close();
    }
  })
);

app.delete(
  '/api/salespersons/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    await db.execute({ sql: 'DELETE FROM salespersons WHERE id=?', args: [Number(req.params.id)] });
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
        sql: `INSERT INTO quotations (id,quote_number,company_name,company_logo,customer_name,customer_mobile,customer_city,customer_address,salesperson,date,validity_days,subtotal,discount,tax,tax_rate,total,notes,terms,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          id,
          quote_number,
          q.company_name || '',
          logo,
          q.customer_name || '',
          q.customer_mobile || '',
          q.customer_city || '',
          q.customer_address || '',
          q.salesperson || '',
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
        sql: `UPDATE quotations SET company_name=?,company_logo=?,customer_name=?,customer_mobile=?,customer_city=?,customer_address=?,salesperson=?,date=?,validity_days=?,subtotal=?,discount=?,tax=?,tax_rate=?,total=?,notes=?,terms=?,status=?,updated_at=datetime('now') WHERE id=?`,
        args: [
          q.company_name || '',
          logo,
          q.customer_name || '',
          q.customer_mobile || '',
          q.customer_city || '',
          q.customer_address || '',
          q.salesperson || '',
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

    let skipped = 0;
    const errors = [];
    const excelCodes = new Set();

    const getExcelVal = (row, keys) => {
      for (const k of Object.keys(row)) {
        const cleanKey = k.replace(/\s+/g, ' ').trim().toLowerCase();
        if (keys.includes(cleanKey)) {
          return row[k];
        }
      }
      return undefined;
    };

    const parseNumericValue = (val, fieldName) => {
      if (val === undefined || val === null) return null;
      const str = String(val).trim();
      if (str === '') return null;
      // Extract numeric characters, minus sign, and dot (removing commas, currency symbols like ₹, $, Rs., etc.)
      const cleanStr = str.replace(/[^\d.-]/g, '');
      if (cleanStr === '') {
        throw new Error(`Invalid ${fieldName}: must be a number`);
      }
      const num = Number(cleanStr);
      if (isNaN(num)) {
        throw new Error(`Invalid ${fieldName}: must be a number`);
      }
      return num;
    };

    // 1. Fetch all existing products to map in-memory
    const { rows: dbProducts } = await db.execute('SELECT * FROM products');
    const productMapByCode = new Map();
    const productMapByName = new Map();

    dbProducts.forEach((p) => {
      const productObj = { ...p, isNew: false, isUpdated: false };
      if (p.code && p.code.trim()) {
        productMapByCode.set(p.code.trim().toUpperCase(), productObj);
      }
      if (p.name && p.name.trim()) {
        productMapByName.set(p.name.trim().toLowerCase(), productObj);
      }
    });

    // 2. Process each row in-memory
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const code = String(getExcelVal(row, ['code', 'product code', 'product_code']) || '').trim();
      const name = String(getExcelVal(row, ['name', 'product name', 'product_name', 'title']) || '').trim();

      // Skip invalid rows (completely empty or containing no name/code)
      if (!code && !name) {
        skipped++;
        continue;
      }
      if (!name) {
        skipped++;
        continue;
      }

      const codeUpper = code.toUpperCase();
      const nameLower = name.toLowerCase();

      // Check duplicate code inside the Excel file
      if (code) {
        if (excelCodes.has(codeUpper)) {
          errors.push({
            row: idx + 2,
            code,
            name: name || '',
            message: 'Duplicate product code found within spreadsheet',
          });
          skipped++;
          continue;
        }
        excelCodes.add(codeUpper);
      }

      try {
        // Retrieve existing product:
        // A. Match by product code first
        let existing = null;
        if (code) {
          existing = productMapByCode.get(codeUpper);
        }
        // B. Fall back to exact name if code matches nothing or is not in the row,
        // provided the DB product has no code, the row has no code, or the codes are identical
        if (!existing && name) {
          const matchByName = productMapByName.get(nameLower);
          if (matchByName) {
            if (!matchByName.code || matchByName.code.trim() === '' || !code || matchByName.code.trim().toUpperCase() === codeUpper) {
              existing = matchByName;
            }
          }
        }

        const isNew = !existing;

        // Parse and validate numeric inputs (with currency cleaning)
        const rateRaw = getExcelVal(row, [
          'rate', 'price', 'rate (₹)', 'rate(₹)', 'price (₹)', 'price(₹)',
          'rate (rs)', 'rate(rs)', 'rate rs', 'price (rs)', 'price(rs)', 'price rs',
          'rate(rs.)', 'rate (rs.)', 'price(rs.)', 'price (rs.)'
        ]);
        const mrpRaw = getExcelVal(row, [
          'mrp', 'mrp (₹)', 'mrp(₹)', 'mrp (rs)', 'mrp(rs)', 'mrp rs', 'mrp(rs.)', 'mrp (rs.)'
        ]);
        const stockRaw = getExcelVal(row, ['stock', 'quantity', 'qty', 'stock qty', 'stock quantity']);
        const minStockRaw = getExcelVal(row, ['min_stock', 'minstock', 'min stock', 'minimum stock']);
        const trackStockRaw = getExcelVal(row, ['track_stock', 'trackstock', 'track stock']);

        let rate = null;
        if (rateRaw !== undefined && rateRaw !== null) {
          rate = parseNumericValue(rateRaw, 'rate');
          if (rate !== null && rate < 0) throw new Error('Invalid rate: price cannot be negative');
        }

        let mrp = null;
        if (mrpRaw !== undefined && mrpRaw !== null) {
          mrp = parseNumericValue(mrpRaw, 'mrp');
          if (mrp !== null && mrp < 0) throw new Error('Invalid mrp: price cannot be negative');
        }

        let stock = null;
        if (stockRaw !== undefined && stockRaw !== null) {
          stock = parseNumericValue(stockRaw, 'stock');
          if (stock !== null && stock < 0) throw new Error('Invalid stock: cannot be negative');
        }

        let min_stock = null;
        if (minStockRaw !== undefined && minStockRaw !== null) {
          min_stock = parseNumericValue(minStockRaw, 'min_stock');
          if (min_stock !== null && min_stock < 0) throw new Error('Invalid min_stock: cannot be negative');
        }

        let track_stock = null;
        if (trackStockRaw !== undefined && trackStockRaw !== null && String(trackStockRaw).trim() !== '') {
          const trackStockStr = String(trackStockRaw).trim().toLowerCase();
          if (!['1', 'true', 'yes', 'y', '0', 'false', 'no', 'n'].includes(trackStockStr)) {
            throw new Error('Invalid boolean value for track_stock');
          }
          track_stock = ['1', 'true', 'yes', 'y'].includes(trackStockStr) ? 1 : 0;
        }

        // Parse other fields
        const categoryRaw = getExcelVal(row, ['category', 'cat']);
        const unitRaw = getExcelVal(row, ['unit']);
        const imageRaw = getExcelVal(row, ['image', 'imageurl', 'image url', 'image_url', 'image url']);
        const descriptionRaw = getExcelVal(row, ['description', 'desc']);

        const category = categoryRaw !== undefined && categoryRaw !== null ? String(categoryRaw).trim() : '';
        const unit = unitRaw !== undefined && unitRaw !== null ? String(unitRaw).trim() : '';
        const image = imageRaw !== undefined && imageRaw !== null ? String(imageRaw).trim() : '';
        const description = descriptionRaw !== undefined && descriptionRaw !== null ? String(descriptionRaw).trim() : '';

        if (isNew) {
          const newProduct = {
            id: uuidv4(),
            code,
            name,
            rate: rate ?? 0,
            mrp: mrp ?? null,
            category: category ?? '',
            unit: unit ?? 'Pcs',
            image: image ?? '',
            description: description ?? '',
            track_stock: track_stock ?? 0,
            min_stock: min_stock ?? 5,
            stock: stock ?? 0,
            isNew: true,
            isUpdated: false,
          };
          if (code) productMapByCode.set(codeUpper, newProduct);
          productMapByName.set(nameLower, newProduct);
        } else {
          if (name) {
            existing.name = name;
            existing.isUpdated = true;
          }
          if (code) {
            existing.code = code;
            existing.isUpdated = true;
            // Also map it in the code map so subsequent rows with the same code match it
            productMapByCode.set(codeUpper, existing);
          }
          if (rate !== null) {
            existing.rate = rate;
            existing.isUpdated = true;
          }
          if (mrp !== null) {
            existing.mrp = mrp;
            existing.isUpdated = true;
          }
          if (category) {
            existing.category = category;
            existing.isUpdated = true;
          }
          if (unit) {
            existing.unit = unit;
            existing.isUpdated = true;
          }
          if (image) {
            existing.image = image;
            existing.isUpdated = true;
          }
          if (description) {
            existing.description = description;
            existing.isUpdated = true;
          }
          if (track_stock !== null) {
            existing.track_stock = track_stock;
            existing.isUpdated = true;
          }
          if (min_stock !== null) {
            existing.min_stock = min_stock;
            existing.isUpdated = true;
          }
          if (stock !== null) {
            existing.stock = stock;
            existing.isUpdated = true;
          }
        }
      } catch (e) {
        errors.push({
          row: idx + 2,
          code: code || '',
          name: name || '',
          message: e.message,
        });
        skipped++;
      }
    }

    // 3. Build SQLite Batch queries
    const stmts = [];
    let created = 0;
    let updated = 0;

    const uniqueProductsToSave = new Set([...productMapByCode.values(), ...productMapByName.values()]);

    for (const p of uniqueProductsToSave) {
      if (p.isNew) {
        created++;
        stmts.push({
          sql: 'INSERT INTO products (id,name,code,description,rate,unit,image,mrp,category,stock,min_stock,track_stock) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          args: [
            p.id,
            p.name,
            p.code || '',
            p.description || '',
            p.rate,
            p.unit,
            p.image,
            p.mrp,
            p.category,
            p.stock,
            p.min_stock,
            p.track_stock,
          ],
        });
        stmts.push({
          sql: 'INSERT INTO products_fts (product_id, product_name, code, category) VALUES (?, ?, ?, ?)',
          args: [p.id, p.name, p.code || '', p.category || ''],
        });
      } else if (p.isUpdated) {
        updated++;
        stmts.push({
          sql: 'UPDATE products SET name=?,code=?,description=?,rate=?,unit=?,image=?,mrp=?,category=?,stock=?,min_stock=?,track_stock=? WHERE id=?',
          args: [
            p.name,
            p.code || '',
            p.description || '',
            p.rate,
            p.unit,
            p.image,
            p.mrp,
            p.category,
            p.stock,
            p.min_stock,
            p.track_stock,
            p.id,
          ],
        });
        stmts.push({
          sql: 'DELETE FROM products_fts WHERE product_id = ?',
          args: [p.id],
        });
        stmts.push({
          sql: 'INSERT INTO products_fts (product_id, product_name, code, category) VALUES (?, ?, ?, ?)',
          args: [p.id, p.name, p.code || '', p.category || ''],
        });
      }
    }

    // Execute SQLite queries in chunks
    const CHUNK_SIZE = 500;
    for (let i = 0; i < stmts.length; i += CHUNK_SIZE) {
      const chunk = stmts.slice(i, i + CHUNK_SIZE);
      await db.batch(chunk, 'write');
    }

    // 4. Log Audit Session
    try {
      await db.execute({
        sql: 'INSERT INTO import_logs (id, imported_by, import_time, file_name, products_added, products_updated, products_skipped, total_rows) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          uuidv4(),
          req.user.name || req.user.email || 'Admin',
          new Date().toISOString(),
          req.file?.originalname || 'unknown.xlsx',
          created,
          updated,
          skipped,
          rows.length,
        ],
      });
    } catch (logErr) {
      console.error('Failed to save import log:', logErr);
    }

    res.json({
      success: true,
      created,
      updated,
      skipped,
      errors,
    });
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
