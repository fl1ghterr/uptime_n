import { checkHttp } from './http-monitor.js';
import { checkMinecraft } from './minecraft.js';
import { checkValve } from './valve.js';
import { checkFiveM } from './fivem.js';
import { checkTeamSpeak } from './teamspeak.js';

const monitors = {
  http: checkHttp,
  https: checkHttp,
  minecraft: checkMinecraft,
  valve: checkValve,
  fivem: checkFiveM,
  teamspeak: checkTeamSpeak
};

export async function checkService(service) {
  const type = service.type.toLowerCase();
  const monitor = monitors[type];
  
  if (!monitor) {
    return {
      status: 'down',
      response_time: 0,
      status_code: null,
      message: `Unknown service type: ${type}`,
      details: {}
    };
  }
  
  try {
    return await monitor(service);
  } catch (error) {
    return {
      status: 'down',
      response_time: 0,
      status_code: null,
      message: error.message || 'Check failed',
      details: { error: error.message }
    };
  }
}

export function getSupportedServiceTypes() {
  return [
    { type: 'http', name: 'HTTP/HTTPS Website' },
    { type: 'minecraft', name: 'Minecraft Server (Java)' },
    { type: 'valve', name: 'Valve/Source Server (CS2, TF2, etc.)' },
    { type: 'fivem', name: 'FiveM Server (GTA V)' },
    { type: 'teamspeak', name: 'TeamSpeak Server' }
  ];
}

export function getSupportedGames() {
  return {
    'cs2': 'Counter-Strike 2',
    'csgo': 'Counter-Strike: Global Offensive',
    'tf2': 'Team Fortress 2',
    'garrysmod': "Garry's Mod",
    'rust': 'Rust',
    'arkse': 'ARK: Survival Evolved',
    'arma3': 'Arma 3'
  };
}
