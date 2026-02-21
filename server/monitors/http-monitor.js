import puppeteer from 'puppeteer';

let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions'
      ]
    });
  }
  return browser;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function checkHttp(service) {
  const settings = service.settings || {};
  const url = service.host.startsWith('http') ? service.host : `https://${service.host}`;
  const timeout = service.timeout || 10000;
  
  if (settings.fullPageLoad) {
    return checkWithPuppeteer(url, service, settings, timeout);
  }
  
  return checkWithFetch(url, service, timeout);
}

async function checkWithFetch(url, service, timeout) {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'UptimeMonitor/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - start;
    
    const isUp = response.ok;
    const status = isUp ? 'up' : 'down';
    
    return {
      status,
      response_time: responseTime,
      status_code: response.status,
      message: isUp ? 'OK' : `HTTP ${response.status}`,
      details: {
        url: response.url,
        headers: Object.fromEntries(response.headers.entries())
      }
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const responseTime = Date.now() - start;
    
    return {
      status: 'down',
      response_time: responseTime,
      status_code: null,
      message: error.name === 'AbortError' ? 'Timeout' : error.message,
      details: { error: error.message }
    };
  }
}

async function checkWithPuppeteer(url, service, settings, timeout) {
  const start = Date.now();
  let page = null;
  
  try {
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();
    
    await page.setDefaultTimeout(timeout);
    
    if (settings.userAgent) {
      await page.setUserAgent(settings.userAgent);
    }
    
    if (settings.viewport) {
      await page.setViewport(settings.viewport);
    }
    
    if (settings.cookies && settings.cookies.length > 0) {
      await page.setCookie(...settings.cookies);
    }
    
    if (settings.basicAuth) {
      await page.authenticate({
        username: settings.basicAuth.username,
        password: settings.basicAuth.password
      });
    }
    
    const response = await page.goto(url, {
      waitUntil: settings.waitUntil || 'networkidle0',
      timeout: timeout
    });
    
    let additionalWait = settings.additionalWait || 0;
    if (additionalWait > 0) {
      await page.waitForTimeout(additionalWait);
    }
    
    if (settings.waitForSelector) {
      await page.waitForSelector(settings.waitForSelector, { timeout: settings.selectorTimeout || 5000 });
    }
    
    const responseTime = Date.now() - start;
    const statusCode = response.status();
    const isUp = statusCode >= 200 && statusCode < 400;
    
    let title = '';
    let content = '';
    try {
      title = await page.title();
      if (settings.checkContent) {
        content = await page.content();
      }
    } catch (e) {
    }
    
    const metrics = await page.metrics();
    
    await page.close();
    
    return {
      status: isUp ? 'up' : 'down',
      response_time: responseTime,
      status_code: statusCode,
      message: isUp ? `Loaded: ${title}` : `HTTP ${statusCode}`,
      details: {
        url: response.url(),
        title,
        metrics: {
          layoutDuration: Math.round(metrics.LayoutDuration * 1000),
          scriptDuration: Math.round(metrics.ScriptDuration * 1000),
          taskDuration: Math.round(metrics.TaskDuration * 1000),
          jsHeapUsedSize: metrics.JSHeapUsedSize,
          nodes: metrics.Nodes
        }
      }
    };
  } catch (error) {
    if (page) {
      try {
        await page.close();
      } catch (e) {
      }
    }
    
    const responseTime = Date.now() - start;
    
    return {
      status: 'down',
      response_time: responseTime,
      status_code: null,
      message: error.message,
      details: { error: error.message, type: error.name }
    };
  }
}

export async function checkSSL(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'https:') {
      return { valid: false, message: 'Not an HTTPS URL' };
    }
    
    const response = await fetch(url, { method: 'HEAD' });
    const cert = response.headers.get('x-ssl-cert') || null;
    
    return {
      valid: true,
      message: 'SSL certificate is valid'
    };
  } catch (error) {
    return {
      valid: false,
      message: error.message
    };
  }
}
