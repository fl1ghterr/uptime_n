-- Services table: stores all monitored services
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('http', 'https', 'minecraft', 'valve', 'fivem', 'teamspeak')),
  host TEXT NOT NULL,
  port INTEGER,
  check_interval INTEGER DEFAULT 60,
  timeout INTEGER DEFAULT 10000,
  enabled INTEGER DEFAULT 1,
  settings TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Checks table: stores individual check results
CREATE TABLE IF NOT EXISTS checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('up', 'down', 'degraded')),
  response_time INTEGER,
  status_code INTEGER,
  message TEXT,
  details TEXT DEFAULT '{}',
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Incidents table: stores downtime incidents
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME,
  duration INTEGER,
  message TEXT,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Settings table: application settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_checks_service_id ON checks(service_id);
CREATE INDEX IF NOT EXISTS idx_checks_checked_at ON checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_incidents_service_id ON incidents(service_id);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
