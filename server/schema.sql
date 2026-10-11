CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Minor Repairs',
  priority TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'New',
  permission_to_enter INTEGER NOT NULL DEFAULT 0,
  photo TEXT,
  assigned_to TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'tenant',
  ip TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_ip_created ON tickets (ip, created_at);
