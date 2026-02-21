import Gamedig from 'gamedig';

const VALVE_GAMES = {
  'csgo': 'Counter-Strike: Global Offensive',
  'cs2': 'Counter-Strike 2',
  'css': 'Counter-Strike: Source',
  'cstrike': 'Counter-Strike 1.6',
  'tf2': 'Team Fortress 2',
  'tf': 'Team Fortress Classic',
  'dod': 'Day of Defeat',
  'dods': 'Day of Defeat: Source',
  'garrysmod': "Garry's Mod",
  'l4d': 'Left 4 Dead',
  'l4d2': 'Left 4 Dead 2',
  'hl2dm': 'Half-Life 2: Deathmatch',
  'insurgency': 'Insurgency',
  'ins': 'Insurgency: Modern Infantry Combat',
  'arma3': 'Arma 3',
  'arkse': 'ARK: Survival Evolved',
  'rust': 'Rust',
  'hll': 'Hell Let Loose',
  ' insurgency_sandstorm': 'Insurgency: Sandstorm'
};

export async function checkValve(service) {
  const host = service.host;
  const port = service.port || 27015;
  const timeout = service.timeout || 10000;
  const settings = service.settings || {};
  const gameType = settings.gameType || 'cs2';
  
  const start = Date.now();
  
  try {
    const result = await Gamedig.query({
      type: gameType,
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
    
    return {
      status: 'up',
      response_time: responseTime,
      status_code: null,
      message: `Online: ${numPlayers}/${maxPlayers} players`,
      details: {
        name: result.name || 'Unknown Server',
        game: VALVE_GAMES[gameType] || gameType,
        map: result.map || 'Unknown',
        players: {
          online: numPlayers,
          max: maxPlayers,
          list: players.map(p => ({
            name: p.name || 'Unknown',
            score: p.score || 0,
            time: p.time || 0
          }))
        },
        version: result.raw?.version || null,
        password: result.password || false,
        vac: result.raw?.secure || false,
        serverInfo: { host, port }
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    
    return {
      status: 'down',
      response_time: responseTime,
      status_code: null,
      message: error.message || 'Unable to query server',
      details: {
        error: error.message,
        game: VALVE_GAMES[gameType] || gameType,
        serverInfo: { host, port }
      }
    };
  }
}

export function getSupportedGames() {
  return VALVE_GAMES;
}
