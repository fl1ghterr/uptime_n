import { TeamSpeak } from 'ts3-nodejs-library';

export async function checkTeamSpeak(service) {
  const host = service.host;
  const port = service.port || 9987;
  const queryPort = service.settings?.queryPort || 10011;
  const timeout = service.timeout || 10000;
  const settings = service.settings || {};
  
  const start = Date.now();
  
  let ts = null;
  
  try {
    ts = await TeamSpeak.connect({
      host: host,
      serverport: port,
      queryport: queryPort,
      nickname: 'UptimeMonitor',
      username: settings.queryUser || 'serveradmin',
      password: settings.queryPassword || '',
      keepAlive: true
    });
    
    const serverInfo = await ts.serverInfo();
    const clientList = await ts.clientList({ client_type: 0 });
    const channelList = await ts.channelList();
    
    await ts.quit();
    
    const responseTime = Date.now() - start;
    
    const onlineClients = clientList.filter(c => c.client_type === 0);
    
    return {
      status: 'up',
      response_time: responseTime,
      status_code: null,
      message: `Online: ${onlineClients.length}/${serverInfo.virtualserver_maxclients} clients`,
      details: {
        name: serverInfo.virtualserver_name || 'Unknown Server',
        version: serverInfo.virtualserver_version || null,
        platform: serverInfo.virtualserver_platform || null,
        uptime: serverInfo.virtualserver_uptime || 0,
        clients: {
          online: onlineClients.length,
          max: serverInfo.virtualserver_maxclients || 0,
          list: onlineClients.slice(0, 20).map(c => ({
            name: c.client_nickname,
            country: c.client_country
          }))
        },
        channels: channelList.length,
        serverInfo: {
          host,
          port,
          queryPort
        }
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    
    if (ts) {
      try {
        await ts.quit();
      } catch (e) {
      }
    }
    
    return {
      status: 'down',
      response_time: responseTime,
      status_code: null,
      message: error.message || 'Unable to connect to TeamSpeak server',
      details: {
        error: error.message,
        code: error.code,
        serverInfo: { host, port, queryPort }
      }
    };
  }
}

export async function checkTeamSpeakSimple(service) {
  const host = service.host;
  const port = service.port || 9987;
  const timeout = service.timeout || 10000;
  
  const start = Date.now();
  
  return new Promise((resolve) => {
    const socket = new (await import('net')).default.Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      const responseTime = Date.now() - start;
      socket.destroy();
      
      resolve({
        status: 'up',
        response_time: responseTime,
        status_code: null,
        message: 'TeamSpeak server is reachable',
        details: {
          serverInfo: { host, port }
        }
      });
    });
    
    socket.on('timeout', () => {
      const responseTime = Date.now() - start;
      socket.destroy();
      
      resolve({
        status: 'down',
        response_time: responseTime,
        status_code: null,
        message: 'Connection timed out',
        details: {
          error: 'Timeout',
          serverInfo: { host, port }
        }
      });
    });
    
    socket.on('error', (error) => {
      const responseTime = Date.now() - start;
      socket.destroy();
      
      resolve({
        status: 'down',
        response_time: responseTime,
        status_code: null,
        message: error.message || 'Unable to connect',
        details: {
          error: error.message,
          code: error.code,
          serverInfo: { host, port }
        }
      });
    });
    
    socket.connect(port, host);
  });
}
