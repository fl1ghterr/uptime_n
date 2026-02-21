import Gamedig from 'gamedig';

export async function checkFiveM(service) {
  const host = service.host;
  const port = service.port || 30120;
  const timeout = service.timeout || 10000;
  
  const start = Date.now();
  
  try {
    const result = await Gamedig.query({
      type: 'fivem',
      host: host,
      port: port,
      socketTimeout: timeout,
      attemptTimeout: timeout,
      givenPortOnly: true
    });
    
    const responseTime = Date.now() - start;
    
    const players = result.players || [];
    const numPlayers = players.length;
    const maxPlayers = result.maxplayers || 0;
    
    const rawInfo = result.raw || {};
    
    return {
      status: 'up',
      response_time: responseTime,
      status_code: null,
      message: `Online: ${numPlayers}/${maxPlayers} players`,
      details: {
        name: result.name || 'Unknown Server',
        map: result.map || null,
        players: {
          online: numPlayers,
          max: maxPlayers,
          list: players.slice(0, 20).map(p => ({
            name: p.name || 'Unknown',
            score: p.score || 0
          }))
        },
        resources: rawInfo.resources || [],
        gamename: rawInfo.gamename || 'FiveM',
        server: rawInfo.server || null,
        mapname: rawInfo.mapname || null,
        gametype: rawInfo.gametype || null,
        sv_maxclients: rawInfo.sv_maxclients || maxPlayers,
        serverInfo: { host, port }
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    
    return {
      status: 'down',
      response_time: responseTime,
      status_code: null,
      message: error.message || 'Unable to query FiveM server',
      details: {
        error: error.message,
        serverInfo: { host, port }
      }
    };
  }
}

export async function checkFiveMDynamic(service) {
  const host = service.host;
  const timeout = service.timeout || 10000;
  
  const start = Date.now();
  
  try {
    const response = await fetch(`http://${host}/dynamic.json`, {
      signal: AbortSignal.timeout(timeout)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const responseTime = Date.now() - start;
    
    return {
      status: 'up',
      response_time: responseTime,
      status_code: response.status,
      message: `Online: ${data.clients || 0}/${data.sv_maxclients || 0} players`,
      details: {
        hostname: data.hostname || 'Unknown Server',
        mapname: data.mapname || null,
        gametype: data.gametype || null,
        players: {
          online: data.clients || 0,
          max: data.sv_maxclients || 0
        },
        serverInfo: { host }
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    
    return {
      status: 'down',
      response_time: responseTime,
      status_code: null,
      message: error.message || 'Unable to query FiveM server',
      details: {
        error: error.message,
        serverInfo: { host }
      }
    };
  }
}
