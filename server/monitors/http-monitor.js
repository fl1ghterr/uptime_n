export async function checkHttp(service) {
  const url = service.host.startsWith('http') ? service.host : `https://${service.host}`;
  const timeout = service.timeout || 10000;
  const start = Date.now();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'UptimeMonitor/1.0' }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - start;
    const isUp = response.ok;
    
    return {
      status: isUp ? 'up' : 'down',
      response_time: responseTime,
      status_code: response.status,
      message: isUp ? 'OK' : `HTTP ${response.status}`,
      details: { url: response.url }
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      status: 'down',
      response_time: Date.now() - start,
      status_code: null,
      message: error.name === 'AbortError' ? 'Timeout' : error.message,
      details: { error: error.message }
    };
  }
}
