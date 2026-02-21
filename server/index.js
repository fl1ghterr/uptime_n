import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

import { closeDatabase } from './db/database.js';
import apiRoutes from './routes/api.js';
import { setupWebSocket } from './routes/websocket.js';
import { startScheduler, stopScheduler, runSingleCheck, getSchedulerStats } from './scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);

const clientDistPath = join(__dirname, '../client/dist');
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  
  app.get('*', (req, res) => {
    res.sendFile(join(clientDistPath, 'index.html'));
  });
} else {
  console.log('[Server] Client dist not found, serving API only');
  
  app.get('/', (req, res) => {
    res.json({
      name: 'Uptime Monitor API',
      version: '1.0.0',
      endpoints: {
        services: '/api/services',
        status: '/api/status',
        checks: '/api/checks/recent',
        websocket: '/ws'
      }
    });
  });
}

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    scheduler: getSchedulerStats()
  });
});

setupWebSocket(server);

let isShuttingDown = false;

const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n[Server] ${signal} received, shutting down gracefully...`);
  
  stopScheduler();
  
  server.close(() => {
    console.log('[Server] HTTP server closed');
    
    closeDatabase();
    
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

server.listen(PORT, HOST, () => {
  console.log(`[Server] Running on http://${HOST}:${PORT}`);
  
  startScheduler();
  
  console.log('[Server] Uptime Monitor started successfully');
});

export { app, server, runSingleCheck };
