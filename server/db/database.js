import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '../../data/uptime.db');
const SCHEMA_PATH = join(__dirname, 'schema.sql');

let db = null;

export function getDatabase() {
  if (!db) {
    const dataDir = dirname(DB_PATH);
    import('fs').then(fs => {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    });
    
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
    
    console.log(`[DB] Database initialized at ${DB_PATH}`);
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Database connection closed');
  }
}

export const queries = {
  getServices: () => getDatabase().prepare('SELECT * FROM services ORDER BY name').all(),
  
  getServiceById: (id) => getDatabase().prepare('SELECT * FROM services WHERE id = ?').get(id),
  
  getEnabledServices: () => getDatabase().prepare('SELECT * FROM services WHERE enabled = 1').all(),
  
  createService: (data) => {
    const stmt = getDatabase().prepare(`
      INSERT INTO services (name, type, host, port, check_interval, timeout, enabled, settings)
      VALUES (@name, @type, @host, @port, @check_interval, @timeout, @enabled, @settings)
    `);
    const result = stmt.run({
      name: data.name,
      type: data.type,
      host: data.host,
      port: data.port || null,
      check_interval: data.check_interval || 60,
      timeout: data.timeout || 10000,
      enabled: data.enabled !== false ? 1 : 0,
      settings: JSON.stringify(data.settings || {})
    });
    return result.lastInsertRowid;
  },
  
  updateService: (id, data) => {
    const fields = [];
    const values = { id };
    
    if (data.name !== undefined) { fields.push('name = @name'); values.name = data.name; }
    if (data.type !== undefined) { fields.push('type = @type'); values.type = data.type; }
    if (data.host !== undefined) { fields.push('host = @host'); values.host = data.host; }
    if (data.port !== undefined) { fields.push('port = @port'); values.port = data.port; }
    if (data.check_interval !== undefined) { fields.push('check_interval = @check_interval'); values.check_interval = data.check_interval; }
    if (data.timeout !== undefined) { fields.push('timeout = @timeout'); values.timeout = data.timeout; }
    if (data.enabled !== undefined) { fields.push('enabled = @enabled'); values.enabled = data.enabled ? 1 : 0; }
    if (data.settings !== undefined) { fields.push('settings = @settings'); values.settings = JSON.stringify(data.settings); }
    
    fields.push("updated_at = CURRENT_TIMESTAMP");
    
    const stmt = getDatabase().prepare(`UPDATE services SET ${fields.join(', ')} WHERE id = @id`);
    return stmt.run(values).changes;
  },
  
  deleteService: (id) => getDatabase().prepare('DELETE FROM services WHERE id = ?').run(id),
  
  createCheck: (data) => {
    const stmt = getDatabase().prepare(`
      INSERT INTO checks (service_id, status, response_time, status_code, message, details)
      VALUES (@service_id, @status, @response_time, @status_code, @message, @details)
    `);
    stmt.run({
      service_id: data.service_id,
      status: data.status,
      response_time: data.response_time || null,
      status_code: data.status_code || null,
      message: data.message || null,
      details: JSON.stringify(data.details || {})
    });
  },
  
  getChecks: (serviceId, limit = 100) => getDatabase().prepare(`
    SELECT * FROM checks WHERE service_id = ? ORDER BY checked_at DESC LIMIT ?
  `).all(serviceId, limit),
  
  getRecentChecks: (hours = 24) => getDatabase().prepare(`
    SELECT c.*, s.name as service_name, s.type as service_type
    FROM checks c
    JOIN services s ON c.service_id = s.id
    WHERE c.checked_at >= datetime('now', '-' || ? || ' hours')
    ORDER BY c.checked_at DESC
  `).all(hours),
  
  getStats: (serviceId, hours = 24) => {
    const checks = getDatabase().prepare(`
      SELECT status, COUNT(*) as count
      FROM checks
      WHERE service_id = ? AND checked_at >= datetime('now', '-' || ? || ' hours')
      GROUP BY status
    `).all(serviceId, hours);
    
    const avgResponse = getDatabase().prepare(`
      SELECT AVG(response_time) as avg_response
      FROM checks
      WHERE service_id = ? AND checked_at >= datetime('now', '-' || ? || ' hours') AND response_time IS NOT NULL
    `).get(serviceId, hours);
    
    const total = checks.reduce((sum, c) => sum + c.count, 0);
    const up = checks.find(c => c.status === 'up')?.count || 0;
    
    return {
      uptime: total > 0 ? ((up / total) * 100).toFixed(2) : 0,
      avg_response_time: avgResponse?.avg_response ? Math.round(avgResponse.avg_response) : null,
      total_checks: total
    };
  },
  
  getResponseTimeHistory: (serviceId, hours = 24) => getDatabase().prepare(`
    SELECT 
      strftime('%Y-%m-%d %H:00', checked_at) as hour,
      AVG(response_time) as avg_response,
      MIN(response_time) as min_response,
      MAX(response_time) as max_response,
      COUNT(*) as checks
    FROM checks
    WHERE service_id = ? AND checked_at >= datetime('now', '-' || ? || ' hours') AND response_time IS NOT NULL
    GROUP BY hour
    ORDER BY hour ASC
  `).all(serviceId, hours),
  
  createIncident: (data) => {
    const stmt = getDatabase().prepare(`
      INSERT INTO incidents (service_id, started_at, message)
      VALUES (@service_id, @started_at, @message)
    `);
    const result = stmt.run({
      service_id: data.service_id,
      started_at: data.started_at || new Date().toISOString(),
      message: data.message || null
    });
    return result.lastInsertRowid;
  },
  
  endIncident: (id, endedAt = new Date().toISOString()) => {
    const incident = getDatabase().prepare('SELECT started_at FROM incidents WHERE id = ?').get(id);
    if (incident) {
      const started = new Date(incident.started_at);
      const ended = new Date(endedAt);
      const duration = Math.floor((ended - started) / 1000);
      
      return getDatabase().prepare(`
        UPDATE incidents SET ended_at = ?, duration = ? WHERE id = ?
      `).run(endedAt, duration, id).changes;
    }
    return 0;
  },
  
  getActiveIncident: (serviceId) => getDatabase().prepare(`
    SELECT * FROM incidents WHERE service_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1
  `).get(serviceId),
  
  getIncidents: (serviceId, limit = 50) => getDatabase().prepare(`
    SELECT * FROM incidents WHERE service_id = ? ORDER BY started_at DESC LIMIT ?
  `).all(serviceId, limit),
  
  getSetting: (key) => getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value,
  
  setSetting: (key, value) => {
    const stmt = getDatabase().prepare(`
      INSERT INTO settings (key, value) VALUES (@key, @value)
      ON CONFLICT(key) DO UPDATE SET value = @value
    `);
    stmt.run({ key, value });
  },
  
  cleanupOldChecks: (days = 30) => getDatabase().prepare(`
    DELETE FROM checks WHERE checked_at < datetime('now', '-' || ? || ' days')
  `).run(days)
};
