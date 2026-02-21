import { WebSocketServer } from 'ws';
import { queries } from '../db/database.js';

let wss = null;
const clients = new Set();

export function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[WS] Client connected. Total clients: ${clients.size}`);
    
    sendInitialData(ws);
    
    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected. Total clients: ${clients.size}`);
    });
    
    ws.on('error', (error) => {
      console.error('[WS] Error:', error.message);
      clients.delete(ws);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error('[WS] Message parse error:', error.message);
      }
    });
  });
  
  return wss;
}

function sendInitialData(ws) {
  try {
    const services = queries.getServices();
    services.forEach(s => {
      s.settings = JSON.parse(s.settings || '{}');
      s.enabled = s.enabled === 1;
    });
    
    ws.send(JSON.stringify({
      type: 'services',
      data: services
    }));
    
    const status = getServicesStatus();
    ws.send(JSON.stringify({
      type: 'status',
      data: status
    }));
  } catch (error) {
    console.error('[WS] Initial data error:', error.message);
  }
}

function handleMessage(ws, message) {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    case 'subscribe':
      ws.subscriptions = ws.subscriptions || [];
      ws.subscriptions.push(message.channel);
      break;
    default:
      console.log('[WS] Unknown message type:', message.type);
  }
}

export function broadcastCheckResult(serviceId, result) {
  const message = JSON.stringify({
    type: 'check',
    data: {
      service_id: serviceId,
      ...result,
      checked_at: new Date().toISOString()
    }
  });
  
  broadcast(message);
}

export function broadcastStatusUpdate(serviceId, status) {
  const message = JSON.stringify({
    type: 'status_update',
    data: {
      service_id: serviceId,
      ...status
    }
  });
  
  broadcast(message);
}

export function broadcastServiceUpdate(service) {
  const message = JSON.stringify({
    type: 'service_update',
    data: service
  });
  
  broadcast(message);
}

export function broadcastIncident(serviceId, incident) {
  const message = JSON.stringify({
    type: 'incident',
    data: {
      service_id: serviceId,
      ...incident
    }
  });
  
  broadcast(message);
}

function broadcast(message) {
  clients.forEach(client => {
    if (client.readyState === 1) {
      try {
        client.send(message);
      } catch (error) {
        console.error('[WS] Broadcast error:', error.message);
      }
    }
  });
}

function getServicesStatus() {
  const checks = queries.getRecentChecks(24);
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
      status.latest_check = {
        status: check.status,
        response_time: check.response_time,
        message: check.message,
        checked_at: check.checked_at
      };
    }
  });
  
  return Array.from(serviceStatus.values()).map(s => ({
    ...s,
    uptime: s.total_count > 0 ? ((s.up_count / s.total_count) * 100).toFixed(2) : 0
  }));
}

export function getConnectedClients() {
  return clients.size;
}
