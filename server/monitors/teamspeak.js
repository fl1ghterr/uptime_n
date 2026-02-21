import net from 'net';

export async function checkTeamSpeak(service) {
  const host = service.host;
  const port = service.port || 9987;
  const timeout = service.timeout || 10000;
  const start = Date.now();
  
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      const responseTime = Date.now() - start;
      socket.destroy();
      
      resolve({
        status: 'up',
        response_time: responseTime,
        status_code: null,
        message: 'Server reachable',
        details: { host, port }
      });
    });
    
    socket.on('timeout', () => {
      const responseTime = Date.now() - start;
      socket.destroy();
      
      resolve({
        status: 'down',
        response_time: responseTime,
        status_code: null,
        message: 'Timeout',
        details: { error: 'timeout', host, port }
      });
    });
    
    socket.on('error', (error) => {
      const responseTime = Date.now() - start;
      socket.destroy();
      
      resolve({
        status: 'down',
        response_time: responseTime,
        status_code: null,
        message: error.message,
        details: { error: error.message, host, port }
      });
    });
    
    socket.connect(port, host);
  });
}
