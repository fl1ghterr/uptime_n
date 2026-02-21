import cron from 'node-cron';
import { queries } from '../db/database.js';
import { checkService } from '../monitors/index.js';
import { broadcastCheckResult, broadcastIncident } from '../routes/websocket.js';

const scheduledJobs = new Map();
const activeIncidents = new Map();

export function startScheduler() {
  console.log('[Scheduler] Starting scheduler...');
  
  const defaultInterval = process.env.CRON_SCHEDULE || '*/1 * * * *';
  
  const job = cron.schedule(defaultInterval, async () => {
    await runChecks();
  }, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  scheduledJobs.set('default', job);
  
  console.log(`[Scheduler] Default check interval: ${defaultInterval}`);
  
  loadServicesAndSchedule();
}

export function stopScheduler() {
  console.log('[Scheduler] Stopping scheduler...');
  
  scheduledJobs.forEach((job, id) => {
    job.stop();
  });
  
  scheduledJobs.clear();
}

async function loadServicesAndSchedule() {
  const services = queries.getEnabledServices();
  
  services.forEach(service => {
    const currentIncident = queries.getActiveIncident(service.id);
    if (currentIncident) {
      activeIncidents.set(service.id, currentIncident.id);
    }
  });
  
  console.log(`[Scheduler] Loaded ${services.length} enabled services`);
}

export async function runChecks() {
  const services = queries.getEnabledServices();
  console.log(`[Scheduler] Running checks for ${services.length} services...`);
  
  const checkPromises = services.map(service => runSingleCheck(service));
  
  await Promise.allSettled(checkPromises);
  
  console.log('[Scheduler] All checks completed');
}

export async function runSingleCheck(service) {
  const startTime = Date.now();
  
  try {
    service.settings = JSON.parse(service.settings || '{}');
    
    const result = await checkService(service);
    
    queries.createCheck({
      service_id: service.id,
      status: result.status,
      response_time: result.response_time,
      status_code: result.status_code,
      message: result.message,
      details: result.details
    });
    
    handleIncidentTracking(service.id, result.status);
    
    broadcastCheckResult(service.id, result);
    
    return result;
  } catch (error) {
    console.error(`[Scheduler] Check failed for ${service.name}:`, error.message);
    
    const result = {
      status: 'down',
      response_time: Date.now() - startTime,
      message: error.message
    };
    
    queries.createCheck({
      service_id: service.id,
      status: 'down',
      response_time: result.response_time,
      message: error.message
    });
    
    handleIncidentTracking(service.id, 'down');
    
    broadcastCheckResult(service.id, result);
    
    return result;
  }
}

function handleIncidentTracking(serviceId, status) {
  const hasActiveIncident = activeIncidents.has(serviceId);
  
  if (status === 'down' && !hasActiveIncident) {
    const incidentId = queries.createIncident({
      service_id: serviceId,
      message: 'Service became unresponsive'
    });
    
    activeIncidents.set(serviceId, incidentId);
    
    broadcastIncident(serviceId, {
      id: incidentId,
      started_at: new Date().toISOString(),
      message: 'Service became unresponsive'
    });
    
    console.log(`[Scheduler] Incident started for service ${serviceId}`);
  } else if (status === 'up' && hasActiveIncident) {
    const incidentId = activeIncidents.get(serviceId);
    
    queries.endIncident(incidentId);
    
    activeIncidents.delete(serviceId);
    
    console.log(`[Scheduler] Incident resolved for service ${serviceId}`);
  }
}

export function getServiceNextCheck(serviceId) {
  const service = queries.getServiceById(serviceId);
  if (!service) return null;
  
  return new Date(Date.now() + (service.check_interval * 1000));
}

export function getSchedulerStats() {
  return {
    active_jobs: scheduledJobs.size,
    active_incidents: activeIncidents.size,
    incident_service_ids: Array.from(activeIncidents.keys())
  };
}
