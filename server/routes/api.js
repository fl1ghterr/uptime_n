import { Router } from 'express';
import { queries } from '../db/database.js';
import { checkService, getSupportedServiceTypes, getSupportedGames } from '../monitors/index.js';

const router = Router();

router.get('/services', (req, res) => {
  try {
    const services = queries.getServices();
    services.forEach(s => {
      s.settings = JSON.parse(s.settings || '{}');
      s.enabled = s.enabled === 1;
    });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/services/:id', (req, res) => {
  try {
    const service = queries.getServiceById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    service.settings = JSON.parse(service.settings || '{}');
    service.enabled = service.enabled === 1;
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/services', (req, res) => {
  try {
    const { name, type, host, port, check_interval, timeout, enabled, settings } = req.body;
    
    if (!name || !type || !host) {
      return res.status(400).json({ error: 'Name, type, and host are required' });
    }
    
    const id = queries.createService({
      name,
      type,
      host,
      port,
      check_interval,
      timeout,
      enabled,
      settings
    });
    
    const service = queries.getServiceById(id);
    service.settings = JSON.parse(service.settings || '{}');
    service.enabled = service.enabled === 1;
    
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/services/:id', (req, res) => {
  try {
    const service = queries.getServiceById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    queries.updateService(req.params.id, req.body);
    
    const updated = queries.getServiceById(req.params.id);
    updated.settings = JSON.parse(updated.settings || '{}');
    updated.enabled = updated.enabled === 1;
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/services/:id', (req, res) => {
  try {
    const service = queries.getServiceById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    queries.deleteService(req.params.id);
    res.json({ message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/services/:id/check', async (req, res) => {
  try {
    const service = queries.getServiceById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    service.settings = JSON.parse(service.settings || '{}');
    
    const result = await checkService(service);
    
    queries.createCheck({
      service_id: service.id,
      status: result.status,
      response_time: result.response_time,
      status_code: result.status_code,
      message: result.message,
      details: result.details
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/services/:id/stats', (req, res) => {
  try {
    const service = queries.getServiceById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const hours = parseInt(req.query.hours) || 24;
    const stats = queries.getStats(req.params.id, hours);
    const history = queries.getResponseTimeHistory(req.params.id, hours);
    
    res.json({ ...stats, history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/services/:id/checks', (req, res) => {
  try {
    const service = queries.getServiceById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const limit = parseInt(req.query.limit) || 100;
    const checks = queries.getChecks(req.params.id, limit);
    
    checks.forEach(c => {
      c.details = JSON.parse(c.details || '{}');
    });
    
    res.json(checks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/services/:id/incidents', (req, res) => {
  try {
    const service = queries.getServiceById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const incidents = queries.getIncidents(req.params.id, limit);
    
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const checks = queries.getRecentChecks(hours);
    
    const serviceStatus = new Map();
    
    checks.forEach(check => {
      if (!serviceStatus.has(check.service_id)) {
        serviceStatus.set(check.service_id, {
          service_id: check.service_id,
          service_name: check.service_name,
          service_type: check.service_type,
          latest_check: null,
          up_count: 0,
          down_count: 0,
          total_count: 0
        });
      }
      
      const status = serviceStatus.get(check.service_id);
      status.total_count++;
      
      if (check.status === 'up') {
        status.up_count++;
      } else {
        status.down_count++;
      }
      
      if (!status.latest_check || new Date(check.checked_at) > new Date(status.latest_check.checked_at)) {
        status.latest_check = check;
      }
    });
    
    const result = Array.from(serviceStatus.values()).map(s => ({
      ...s,
      uptime: s.total_count > 0 ? ((s.up_count / s.total_count) * 100).toFixed(2) : 0,
      latest_check: s.latest_check ? {
        status: s.latest_check.status,
        response_time: s.latest_check.response_time,
        message: s.latest_check.message,
        checked_at: s.latest_check.checked_at
      } : null
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/checks/recent', (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const checks = queries.getRecentChecks(hours);
    
    checks.forEach(c => {
      c.details = JSON.parse(c.details || '{}');
    });
    
    res.json(checks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/service-types', (req, res) => {
  res.json(getSupportedServiceTypes());
});

router.get('/valve-games', (req, res) => {
  res.json(getSupportedGames());
});

router.get('/settings', (req, res) => {
  try {
    const keys = ['checkInterval', 'retentionDays', 'theme'];
    const settings = {};
    
    keys.forEach(key => {
      const value = queries.getSetting(key);
      if (value) {
        settings[key] = value;
      }
    });
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/settings', (req, res) => {
  try {
    Object.entries(req.body).forEach(([key, value]) => {
      queries.setSetting(key, String(value));
    });
    
    res.json({ message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/cleanup', (req, res) => {
  try {
    const days = parseInt(req.body.days) || 30;
    const result = queries.cleanupOldChecks(days);
    res.json({ message: `Cleaned up checks older than ${days} days`, changes: result.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
