import { checkHttp, closeBrowser } from './http-monitor.js';
import { checkMinecraft, checkMinecraftBedrock } from './minecraft.js';
import { checkValve, getSupportedGames } from './valve.js';
import { checkFiveM, checkFiveMDynamic } from './fivem.js';
import { checkTeamSpeak, checkTeamSpeakSimple } from './teamspeak.js';

const monitors = {
  http: checkHttp,
  https: checkHttp,
  minecraft: checkMinecraft,
  minecraft_bedrock: checkMinecraftBedrock,
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
    { type: 'http', name: 'HTTP/HTTPS Website', icon: 'globe' },
    { type: 'minecraft', name: 'Minecraft Server (Java)', icon: 'cube' },
    { type: 'minecraft_bedrock', name: 'Minecraft Server (Bedrock)', icon: 'cube' },
    { type: 'valve', name: 'Valve/Source Server (CS2, TF2, etc.)', icon: 'gamepad' },
    { type: 'fivem', name: 'FiveM Server (GTA V)', icon: 'car' },
    { type: 'teamspeak', name: 'TeamSpeak Server', icon: 'microphone' }
  ];
}

export { closeBrowser, getSupportedGames };
