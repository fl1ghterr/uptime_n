import { status, queryFull } from 'minecraft-server-util';

export async function checkMinecraft(service) {
  const host = service.host;
  const port = service.port || 25565;
  const timeout = service.timeout || 10000;
  const settings = service.settings || {};
  
  const start = Date.now();
  
  try {
    let result;
    
    if (settings.useQuery) {
      result = await queryFull(host, port, { timeout });
    } else {
      result = await status(host, port, { timeout });
    }
    
    const responseTime = Date.now() - start;
    
    return {
      status: 'up',
      response_time: responseTime,
      status_code: null,
      message: `Online: ${result.players.online}/${result.players.max} players`,
      details: {
        version: result.version?.name || 'Unknown',
        protocol: result.version?.protocol,
        players: {
          online: result.players.online,
          max: result.players.max,
          sample: result.players.sample || []
        },
        motd: typeof result.motd === 'string' ? result.motd : result.motd?.clean || result.motd?.toString(),
        favicon: result.favicon || null,
        serverInfo: {
          host,
          port
        }
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    
    const isTimeout = error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.message?.includes('timeout');
    
    return {
      status: 'down',
      response_time: responseTime,
      status_code: null,
      message: error.message || 'Unable to connect to server',
      details: {
        error: error.message,
        code: error.code,
        serverInfo: { host, port }
      }
    };
  }
}

export async function checkMinecraftBedrock(service) {
  const host = service.host;
  const port = service.port || 19132;
  const timeout = service.timeout || 10000;
  
  const start = Date.now();
  
  try {
    const result = await status(host, port, {
      timeout,
      enableSRV: false
    });
    
    const responseTime = Date.now() - start;
    
    return {
      status: 'up',
      response_time: responseTime,
      status_code: null,
      message: `Online: ${result.players?.online || 0} players`,
      details: {
        version: result.version?.name || 'Unknown',
        players: {
          online: result.players?.online || 0,
          max: result.players?.max || 0
        },
        motd: typeof result.motd === 'string' ? result.motd : result.motd?.clean || null,
        serverInfo: { host, port, edition: 'Bedrock' }
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    
    return {
      status: 'down',
      response_time: responseTime,
      status_code: null,
      message: error.message || 'Unable to connect to server',
      details: { error: error.message, serverInfo: { host, port } }
    };
  }
}
