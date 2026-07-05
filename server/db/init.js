const db = require('../config/db');

const SCHEMA_SQL = `
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
CREATE TABLE IF NOT EXISTS product_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  keyword TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_keyword ON product_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_product ON product_keywords(product_id);
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts
USING fts5(
  product_id UNINDEXED,
  product_name,
  code,
  category,
  tokenize='unicode61'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code ON products(code) WHERE code IS NOT NULL AND code <> '';
CREATE TABLE IF NOT EXISTS import_logs (
  id TEXT PRIMARY KEY,
  imported_by TEXT NOT NULL,
  import_time TEXT NOT NULL,
  file_name TEXT NOT NULL,
  products_added INTEGER NOT NULL,
  products_updated INTEGER NOT NULL,
  products_skipped INTEGER NOT NULL,
  total_rows INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS _migration_guard (id INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  quote_number TEXT UNIQUE,
  company_name TEXT,
  company_logo TEXT,
  customer_name TEXT,
  customer_mobile TEXT,
  customer_address TEXT,
  salesperson TEXT,
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
CREATE TABLE IF NOT EXISTS salespersons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_default INTEGER DEFAULT 0
);
`;

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

const seedProducts = [
  ['p1', 'LED Panel Light 18W', 'PL18W', 450, 'Pcs', 'Panel', 50, 10, 1],
  ['p2', 'LED Panel Light 36W', 'PL36W', 750, 'Pcs', 'Panel', 30, 5, 1],
  ['p3', 'LED Spot Light 7W', 'SL7W', 180, 'Pcs', 'Spot', 100, 20, 1],
  ['p4', 'LED Spot Light 12W', 'SL12W', 280, 'Pcs', 'Spot', 75, 10, 1],
  ['p5', 'LED Strip Light 5050', 'STR5050', 120, 'Meter', 'Strip', 200, 30, 1],
  ['p6', 'LED Strip Light 3528', 'STR3528', 80, 'Meter', 'Strip', 150, 20, 1],
  ['p7', 'LED Bulb 9W', 'BL9W', 75, 'Pcs', 'Bulb', 200, 50, 1],
  ['p8', 'LED Bulb 12W', 'BL12W', 95, 'Pcs', 'Bulb', 180, 40, 1],
  ['p9', 'LED Tube Light 20W', 'TL20W', 220, 'Pcs', 'Tube', 60, 10, 1],
  ['p10', 'LED Downlight 10W', 'DL10W', 320, 'Pcs', 'Downlight', 80, 15, 1],
  ['p11', 'LED Flood Light 50W', 'FL50W', 1200, 'Pcs', 'Flood', 20, 5, 1],
  ['p12', 'LED Street Light 30W', 'STRL30W', 2500, 'Pcs', 'Street', 10, 3, 1],
  ['p13', 'LED COB Light 20W', 'COB20W', 550, 'Pcs', 'COB', 40, 8, 1],
  ['p14', 'LED Driver 12V 5A', 'DRV12V5A', 350, 'Pcs', 'Driver', 60, 10, 1],
  ['p15', 'LED Driver 24V 10A', 'DRV24V10A', 680, 'Pcs', 'Driver', 35, 5, 1],
  ['p16', 'LED Batten Light 18W', 'BAT18W', 390, 'Pcs', 'Batten', 50, 10, 1],
  ['p17', 'LED Ceiling Light 24W', 'CEL24W', 890, 'Pcs', 'Ceiling', 25, 5, 1],
  ['p18', 'LED Track Light 15W', 'TRK15W', 750, 'Pcs', 'Track', 30, 5, 1],
  ['p19', 'LED Emergency Light', 'EMG1', 650, 'Pcs', 'Emergency', 20, 4, 1],
  ['p20', 'LED Solar Light 10W', 'SOL10W', 1800, 'Pcs', 'Solar', 15, 3, 1],
];

async function initDatabase() {
  await db.execute('PRAGMA foreign_keys = ON');
  await db.executeMultiple(SCHEMA_SQL);

  try {
    await db.execute("ALTER TABLE products ADD COLUMN description TEXT DEFAULT ''");
  } catch (_) {
    /* column already exists */
  }

  try {
    await db.execute("ALTER TABLE quotations ADD COLUMN salesperson TEXT");
  } catch (_) {
    /* column already exists */
  }
  try {
    await db.execute("ALTER TABLE quotations ADD COLUMN customer_city TEXT DEFAULT ''");
  } catch (_) {
    /* column already exists */
  }

  for (const [k, v] of Object.entries(defaultSettings)) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      args: [k, typeof v === 'object' ? JSON.stringify(v) : String(v)],
    });
  }

  const { rows } = await db.execute('SELECT COUNT(*) as c FROM products');
  const c = Number(rows[0]?.c ?? 0);
  if (c === 0) {
    const stmts = seedProducts.map((p) => ({
      sql: 'INSERT INTO products (id,name,code,rate,unit,category,stock,min_stock,track_stock) VALUES (?,?,?,?,?,?,?,?,?)',
      args: p,
    }));
    await db.batch(stmts, 'write');
  }

  await db.execute("UPDATE salespersons SET is_default = CASE WHEN id = (SELECT id FROM salespersons WHERE is_default = 1 ORDER BY id LIMIT 1) THEN 1 ELSE 0 END");

  const ftsCount = await db.execute('SELECT COUNT(*) as c FROM products_fts');
  if (Number(ftsCount.rows[0]?.c ?? 0) === 0) {
    await db.execute(`INSERT INTO products_fts (product_id, product_name, code, category)
      SELECT id, name, COALESCE(code, ''), COALESCE(category, '') FROM products`);
  }
}

module.exports = { initDatabase };
