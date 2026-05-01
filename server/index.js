const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT       = process.env.PORT       || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'quoteflow_secret_change_in_production';
const JWT_EXPIRES = '7d';

// ── CORS - allow all localhost origins ────────────────────
app.use(cors({
  origin: true,        // reflect the request origin (works for all localhost ports)
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

// ── FILE UPLOAD ───────────────────────────────────────────
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ── AUTH MIDDLEWARE ───────────────────────────────────────
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

// ── DATABASE ──────────────────────────────────────────────
const db = new Database('./quotations.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT DEFAULT '',
    rate REAL DEFAULT 0,
    unit TEXT DEFAULT 'Pcs',
    image TEXT,
    mrp REAL,
    category TEXT,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    track_stock INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  -- Add description column if upgrading from older DB
  CREATE TABLE IF NOT EXISTS _migration_guard (id INTEGER PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY,
    quote_number TEXT UNIQUE,
    company_name TEXT,
    company_logo TEXT,
    customer_name TEXT,
    customer_mobile TEXT,
    customer_address TEXT,
    date TEXT,
    validity_days INTEGER DEFAULT 30,
    subtotal REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    total REAL DEFAULT 0,
    notes TEXT,
    terms TEXT,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS quotation_items (
    id TEXT PRIMARY KEY,
    quotation_id TEXT,
    sr_no INTEGER,
    product_id TEXT,
    product_name TEXT,
    product_image TEXT,
    shape TEXT,
    color TEXT,
    body_color TEXT,
    warranty TEXT,
    quantity REAL DEFAULT 1,
    unit TEXT DEFAULT 'Pcs',
    rate REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    amount REAL DEFAULT 0,
    bill_after_warranty INTEGER DEFAULT 0,
    warranty_end_date TEXT,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
  );
`);

// ── SEED SETTINGS ─────────────────────────────────────────
const defaultSettings = {
  company_name: 'Ashok Vidyut',
  company_logo: '',
  company_address: 'Ashok Chowk, Opp WIT Boys Hostel, Old WIT College Road, SOLAPUR-413005',
  company_phone: '8411022244',
  validity_days: '7',
  default_unit: 'Pcs',
  currency: 'Rs.',
  tax_rate: '18',
  tax_label: 'GST',
  accent_color: '#6366f1',
  dark_mode: 'false',
  terms: 'ALL RATES ARE INCLUSIVE OF GST.\nGoods once sold will not be taken back.\nWarranty as per company policy.\nAdvance Payment Only.',
  shapes: JSON.stringify([
    { key: 'R', value: 'Round' }, { key: 'S', value: 'Square' },
    { key: 'RE', value: 'Rectangle' }, { key: 'OV', value: 'Oval' }
  ]),
  colors: JSON.stringify([
    { key: 'W', value: 'White' }, { key: 'NW', value: 'Natural White' },
    { key: 'WW', value: 'Warm White' }, { key: '3', value: '3 in 1' },
    { key: '5', value: '5000K' }, { key: 'RGB', value: 'RGB' }
  ]),
  body_colors: JSON.stringify([
    { key: 'B', value: 'Black Body' }, { key: 'W', value: 'White Body' },
    { key: 'GB', value: 'Gun Black' }, { key: 'RG', value: 'Rose Gold' },
    { key: 'SS', value: 'Silver' }
  ]),
  warranties: JSON.stringify([
    { key: 'NW', value: 'No Warranty' }, { key: '1', value: '1 Year' },
    { key: '2', value: '2 Year' }, { key: '3', value: '3 Year' },
    { key: '5', value: '5 Year' }, { key: '10', value: '10 Year' }
  ]),
  columns_visible: JSON.stringify({
    sr_no: true, product_image: true, product_name: true, shape: true,
    color: true, body_color: true, warranty: true, quantity: true,
    unit: true, rate: true, discount: true, amount: true
  })
};
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
Object.entries(defaultSettings).forEach(([k, v]) => insertSetting.run(k, v));

// ── SEED PRODUCTS ─────────────────────────────────────────
if (db.prepare('SELECT COUNT(*) as c FROM products').get().c === 0) {
  const ins = db.prepare('INSERT INTO products (id,name,code,rate,unit,category,stock,min_stock,track_stock) VALUES (?,?,?,?,?,?,?,?,?)');
  [
    ['p1','LED Panel Light 18W','PL18W',450,'Pcs','Panel',50,10,1],
    ['p2','LED Panel Light 36W','PL36W',750,'Pcs','Panel',30,5,1],
    ['p3','LED Spot Light 7W','SL7W',180,'Pcs','Spot',100,20,1],
    ['p4','LED Spot Light 12W','SL12W',280,'Pcs','Spot',75,10,1],
    ['p5','LED Strip Light 5050','STR5050',120,'Meter','Strip',200,30,1],
    ['p6','LED Strip Light 3528','STR3528',80,'Meter','Strip',150,20,1],
    ['p7','LED Bulb 9W','BL9W',75,'Pcs','Bulb',200,50,1],
    ['p8','LED Bulb 12W','BL12W',95,'Pcs','Bulb',180,40,1],
    ['p9','LED Tube Light 20W','TL20W',220,'Pcs','Tube',60,10,1],
    ['p10','LED Downlight 10W','DL10W',320,'Pcs','Downlight',80,15,1],
    ['p11','LED Flood Light 50W','FL50W',1200,'Pcs','Flood',20,5,1],
    ['p12','LED Street Light 30W','STRL30W',2500,'Pcs','Street',10,3,1],
    ['p13','LED COB Light 20W','COB20W',550,'Pcs','COB',40,8,1],
    ['p14','LED Driver 12V 5A','DRV12V5A',350,'Pcs','Driver',60,10,1],
    ['p15','LED Driver 24V 10A','DRV24V10A',680,'Pcs','Driver',35,5,1],
    ['p16','LED Batten Light 18W','BAT18W',390,'Pcs','Batten',50,10,1],
    ['p17','LED Ceiling Light 24W','CEL24W',890,'Pcs','Ceiling',25,5,1],
    ['p18','LED Track Light 15W','TRK15W',750,'Pcs','Track',30,5,1],
    ['p19','LED Emergency Light','EMG1',650,'Pcs','Emergency',20,4,1],
    ['p20','LED Solar Light 10W','SOL10W',1800,'Pcs','Solar',15,3,1],
  ].forEach(p => ins.run(...p));
}

// ── AUTH ROUTES (NO auth required) ───────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing)
      return res.status(400).json({ error: 'This email is already registered. Please login instead.' });
    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?,?,?,?)')
      .run(id, name.trim(), email.toLowerCase().trim(), password_hash);
    const token = jwt.sign({ id, name: name.trim(), email: email.toLowerCase().trim() }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.status(201).json({ token, user: { id, name: name.trim(), email: email.toLowerCase().trim() } });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Registration failed: ' + e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user)
      return res.status(401).json({ error: 'No account found with this email' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Incorrect password' });
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Login failed: ' + e.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id,name,email,role,created_at FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ── SETTINGS ──────────────────────────────────────────────
app.get('/api/settings', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  rows.forEach(r => { try { obj[r.key] = JSON.parse(r.value); } catch { obj[r.key] = r.value; } });
  res.json(obj);
});

app.put('/api/settings', authMiddleware, (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  db.transaction((data) => {
    Object.entries(data).forEach(([k, v]) => upsert.run(k, typeof v === 'object' ? JSON.stringify(v) : String(v)));
  })(req.body);
  res.json({ success: true });
});

// ── MIGRATION: add description column if not exists ──────
try { db.exec("ALTER TABLE products ADD COLUMN description TEXT DEFAULT ''"); } catch {}

// ── PRODUCTS ──────────────────────────────────────────────
// Dedicated search endpoint (returns card-style data)
app.get('/api/products/search', authMiddleware, (req, res) => {
  const q = req.query.q || '';
  if (!q) return res.json([]);
  res.json(db.prepare('SELECT * FROM products WHERE name LIKE ? OR code LIKE ? OR category LIKE ? ORDER BY name LIMIT 20').all(`%${q}%`, `%${q}%`, `%${q}%`));
});
app.get('/api/products', authMiddleware, (req, res) => {
  const { search } = req.query;
  if (search) return res.json(db.prepare('SELECT * FROM products WHERE name LIKE ? OR code LIKE ? ORDER BY name LIMIT 20').all(`%${search}%`, `%${search}%`));
  res.json(db.prepare('SELECT * FROM products ORDER BY name').all());
});

app.post('/api/products', authMiddleware, (req, res) => {
  const p = req.body; const id = uuidv4();
  db.prepare('INSERT INTO products (id,name,code,description,rate,unit,image,mrp,category,stock,min_stock,track_stock) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, p.name, p.code||'', p.description||'', p.rate||0, p.unit||'Pcs', p.image||'', p.mrp||null, p.category||'', p.stock||0, p.min_stock||5, p.track_stock?1:0);
  res.json({ id, ...p });
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
  const p = req.body;
  db.prepare('UPDATE products SET name=?,code=?,description=?,rate=?,unit=?,image=?,mrp=?,category=?,stock=?,min_stock=?,track_stock=? WHERE id=?')
    .run(p.name, p.code||'', p.description||'', p.rate||0, p.unit||'Pcs', p.image||'', p.mrp||null, p.category||'', p.stock||0, p.min_stock||5, p.track_stock?1:0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/products/:id/stock', authMiddleware, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  const newStock = Math.max(0, (product.stock||0) + Number(req.body.adjustment));
  db.prepare('UPDATE products SET stock=? WHERE id=?').run(newStock, req.params.id);
  res.json({ success: true, stock: newStock });
});

app.get('/api/inventory/dashboard', authMiddleware, (req, res) => {
  res.json({
    total_products: db.prepare('SELECT COUNT(*) as c FROM products').get().c,
    low_stock:      db.prepare('SELECT * FROM products WHERE track_stock=1 AND stock <= min_stock ORDER BY stock ASC').all(),
    out_of_stock:   db.prepare('SELECT * FROM products WHERE track_stock=1 AND stock=0').all(),
    stock_value:    db.prepare('SELECT COALESCE(SUM(stock*rate),0) as v FROM products WHERE track_stock=1').get().v,
  });
});

// ── QUOTATIONS ────────────────────────────────────────────
app.get('/api/quotations', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM quotations ORDER BY created_at DESC').all());
});

app.get('/api/quotations/:id', authMiddleware, (req, res) => {
  const q = db.prepare('SELECT * FROM quotations WHERE id=?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Not found' });
  q.items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id=? ORDER BY sr_no').all(req.params.id);
  res.json(q);
});

app.post('/api/quotations', authMiddleware, (req, res) => {
  const id = uuidv4();
  const count = db.prepare('SELECT COUNT(*) as c FROM quotations').get().c;
  const quote_number = `QT-${String(count+1).padStart(4,'0')}`;
  const q = req.body;
  const logo = q.company_logo || db.prepare("SELECT value FROM settings WHERE key='company_logo'").get()?.value || '';
  db.prepare(`INSERT INTO quotations (id,quote_number,company_name,company_logo,customer_name,customer_mobile,customer_address,date,validity_days,subtotal,discount,tax,tax_rate,total,notes,terms,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, quote_number, q.company_name||'', logo, q.customer_name||'', q.customer_mobile||'', q.customer_address||'', q.date||new Date().toISOString().split('T')[0], q.validity_days||30, q.subtotal||0, q.discount||0, q.tax||0, q.tax_rate||0, q.total||0, q.notes||'', q.terms||'', q.status||'draft');
  if (q.items?.length) {
    const ins = db.prepare(`INSERT INTO quotation_items (id,quotation_id,sr_no,product_id,product_name,product_image,shape,color,body_color,warranty,quantity,unit,rate,discount,amount,bill_after_warranty,warranty_end_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    db.transaction(() => q.items.forEach((item,i) => {
      ins.run(uuidv4(),id,i+1,item.product_id||'',item.product_name||'',item.product_image||'',item.shape||'',item.color||'',item.body_color||'',item.warranty||'',item.quantity||1,item.unit||'Pcs',item.rate||0,item.discount||0,item.amount||0,item.bill_after_warranty?1:0,item.warranty_end_date||null);
    }))();
  }
  res.json({ id, quote_number });
});

app.put('/api/quotations/:id', authMiddleware, (req, res) => {
  const q = req.body;
  const logo = q.company_logo || db.prepare("SELECT value FROM settings WHERE key='company_logo'").get()?.value || '';
  db.prepare(`UPDATE quotations SET company_name=?,company_logo=?,customer_name=?,customer_mobile=?,customer_address=?,date=?,validity_days=?,subtotal=?,discount=?,tax=?,tax_rate=?,total=?,notes=?,terms=?,status=?,updated_at=datetime('now') WHERE id=?`)
    .run(q.company_name||'',logo,q.customer_name||'',q.customer_mobile||'',q.customer_address||'',q.date,q.validity_days||30,q.subtotal||0,q.discount||0,q.tax||0,q.tax_rate||0,q.total||0,q.notes||'',q.terms||'',q.status||'draft',req.params.id);
  db.prepare('DELETE FROM quotation_items WHERE quotation_id=?').run(req.params.id);
  if (q.items?.length) {
    const ins = db.prepare(`INSERT INTO quotation_items (id,quotation_id,sr_no,product_id,product_name,product_image,shape,color,body_color,warranty,quantity,unit,rate,discount,amount,bill_after_warranty,warranty_end_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    q.items.forEach((item,i) => ins.run(uuidv4(),req.params.id,i+1,item.product_id||'',item.product_name||'',item.product_image||'',item.shape||'',item.color||'',item.body_color||'',item.warranty||'',item.quantity||1,item.unit||'Pcs',item.rate||0,item.discount||0,item.amount||0,item.bill_after_warranty?1:0,item.warranty_end_date||null));
  }
  res.json({ success: true });
});

app.delete('/api/quotations/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM quotations WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── ANALYTICS ─────────────────────────────────────────────
app.get('/api/analytics', authMiddleware, (req, res) => {
  res.json({
    total_quotes:   db.prepare('SELECT COUNT(*) as c FROM quotations').get().c,
    total_revenue:  db.prepare("SELECT COALESCE(SUM(total),0) as s FROM quotations WHERE status='approved'").get().s,
    this_month:     db.prepare("SELECT COUNT(*) as c FROM quotations WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now')").get().c,
    top_products:   db.prepare('SELECT product_name,SUM(quantity) as total_qty,SUM(amount) as total_amount FROM quotation_items GROUP BY product_name ORDER BY total_amount DESC LIMIT 5').all(),
    recent:         db.prepare('SELECT * FROM quotations ORDER BY created_at DESC LIMIT 5').all(),
    status_counts:  db.prepare('SELECT status,COUNT(*) as c FROM quotations GROUP BY status').all(),
  });
});

// ── EXCEL EXPORT ──────────────────────────────────────────
app.get('/api/products/export', authMiddleware, (req, res) => {
  const products = db.prepare('SELECT name,code,description,rate,unit,mrp,category,image as imageUrl,stock,min_stock FROM products ORDER BY name').all();
  const ws = XLSX.utils.json_to_sheet(products);
  ws['!cols'] = [{wch:30},{wch:12},{wch:40},{wch:10},{wch:10},{wch:10},{wch:15},{wch:40},{wch:10},{wch:12}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  const buf = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });
  res.setHeader('Content-Disposition','attachment; filename="products.xlsx"');
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// ── EXCEL IMPORT ──────────────────────────────────────────
app.post('/api/products/import', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const wb = XLSX.readFile(req.file.path);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const ins = db.prepare('INSERT INTO products (id,name,code,description,rate,unit,image,mrp,category,stock,min_stock,track_stock) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
    let imported = 0, skipped = 0, errors = [];
    db.transaction(() => rows.forEach((row, idx) => {
      try {
        const name = String(row.name||row.Name||row['Product Name']||'').trim();
        if (!name) { skipped++; return; }
        // Duplicate detection by name
        const existing = db.prepare('SELECT id FROM products WHERE LOWER(name)=LOWER(?)').get(name);
        if (existing) { skipped++; return; }
        const imageUrl = String(row.imageUrl||row.image||row.Image||row['Image URL']||'').trim();
        const description = String(row.description||row.Description||'').trim();
        ins.run(uuidv4(), name, String(row.code||row.Code||'').trim(), description, Number(row.rate||row.Rate||row.Price||0), String(row.unit||row.Unit||'Pcs').trim(), imageUrl, Number(row.mrp||row.MRP||0)||null, String(row.category||row.Category||'').trim(), Number(row.stock||0), Number(row.min_stock||5), 1);
        imported++;
      } catch(e) { errors.push(`Row ${idx+2}: ${e.message}`); }
    }))();
    fs.unlinkSync(req.file.path);
    res.json({ success: true, imported, skipped, errors: errors.slice(0,10) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── FILE UPLOAD ───────────────────────────────────────────
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ── HEALTH CHECK (no auth) ────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── START — bind to 0.0.0.0 so LAN devices can reach us ──
app.listen(PORT, '0.0.0.0', () => {
  // Detect LAN IP to print a helpful message
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

  const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (users === 0) {
    console.log(`⚠️  No users yet.`);
    console.log(`   Register at http://${lanIP}:3000/register`);
    console.log(`   or         http://localhost:3000/register\n`);
  } else {
    console.log(`👤  ${users} user(s) in database.\n`);
  }
});
