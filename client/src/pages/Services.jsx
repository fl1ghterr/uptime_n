import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../App';
import { 
  ArrowLeft, Save, Trash2, RefreshCw, Globe, Server, 
  Gamepad2, Mic, Clock, Settings as SettingsIcon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const serviceTypes = [
  { value: 'http', label: 'HTTP/HTTPS Website', icon: Globe, fields: ['url', 'timeout', 'fullPageLoad'] },
  { value: 'minecraft', label: 'Minecraft Server (Java)', icon: Server, fields: ['host', 'port', 'useQuery'] },
  { value: 'valve', label: 'Valve/Source Server', icon: Gamepad2, fields: ['host', 'port', 'gameType'] },
  { value: 'fivem', label: 'FiveM Server', icon: Gamepad2, fields: ['host', 'port'] },
  { value: 'teamspeak', label: 'TeamSpeak Server', icon: Mic, fields: ['host', 'port', 'queryPort', 'queryPassword'] },
];

const valveGames = [
  { value: 'cs2', label: 'Counter-Strike 2' },
  { value: 'csgo', label: 'Counter-Strike: Global Offensive' },
  { value: 'css', label: 'Counter-Strike: Source' },
  { value: 'tf2', label: 'Team Fortress 2' },
  { value: 'garrysmod', label: "Garry's Mod" },
  { value: 'rust', label: 'Rust' },
  { value: 'arkse', label: 'ARK: Survival Evolved' },
  { value: 'arma3', label: 'Arma 3' },
  { value: 'l4d2', label: 'Left 4 Dead 2' },
  { value: 'insurgency_sandstorm', label: 'Insurgency: Sandstorm' },
];

function ServiceForm({ service, onSubmit, onCancel, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'http',
    host: '',
    port: '',
    check_interval: 60,
    timeout: 10000,
    enabled: true,
    settings: {}
  });
  
  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        type: service.type || 'http',
        host: service.host || '',
        port: service.port || '',
        check_interval: service.check_interval || 60,
        timeout: service.timeout || 10000,
        enabled: service.enabled !== false,
        settings: service.settings || {}
      });
    }
  }, [service]);
  
  const selectedType = serviceTypes.find(t => t.value === formData.type);
  
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    
    if (name === 'port' || name === 'check_interval' || name === 'timeout' || name === 'queryPort') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || '' }));
    } else if (name === 'type') {
      setFormData(prev => ({ ...prev, type: value, settings: {} }));
    } else if (name === 'enabled') {
      setFormData(prev => ({ ...prev, enabled: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }
  
  function handleSettingChange(key, value) {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  }
  
  function handleSubmit(e) {
    e.preventDefault();
    
    const data = {
      ...formData,
      port: formData.port ? parseInt(formData.port) : null
    };
    
    if (formData.type === 'http' || formData.type === 'https') {
      data.host = formData.host.startsWith('http') ? formData.host : `${formData.type}://${formData.host}`;
      data.type = 'http';
    }
    
    onSubmit(data);
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="label">Service Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input"
            placeholder="My Website"
            required
          />
        </div>
        
        <div>
          <label className="label">Service Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="select"
          >
            {serviceTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="label">
            {formData.type === 'http' || formData.type === 'https' ? 'URL' : 'Host'}
          </label>
          <input
            type="text"
            name="host"
            value={formData.host}
            onChange={handleChange}
            className="input"
            placeholder={formData.type === 'http' ? 'https://example.com' : '192.168.1.1'}
            required
          />
        </div>
        
        <div>
          <label className="label">Port</label>
          <input
            type="number"
            name="port"
            value={formData.port}
            onChange={handleChange}
            className="input"
            placeholder="Auto"
          />
        </div>
        
        <div>
          <label className="label">Check Interval (seconds)</label>
          <input
            type="number"
            name="check_interval"
            value={formData.check_interval}
            onChange={handleChange}
            className="input"
            min="10"
            max="3600"
          />
        </div>
        
        <div>
          <label className="label">Timeout (ms)</label>
          <input
            type="number"
            name="timeout"
            value={formData.timeout}
            onChange={handleChange}
            className="input"
            min="1000"
            max="60000"
          />
        </div>
        
        <div>
          <label className="label flex items-center gap-2">
            <input
              type="checkbox"
              name="enabled"
              checked={formData.enabled}
              onChange={handleChange}
              className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
            />
            Enabled
          </label>
        </div>
      </div>
      
      {formData.type === 'http' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Advanced HTTP Settings</h3>
          <div className="space-y-4">
            <label className="label flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.settings.fullPageLoad || false}
                onChange={(e) => handleSettingChange('fullPageLoad', e.target.checked)}
                className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
              />
              Wait for full page load (uses browser)
            </label>
            
            {formData.settings.fullPageLoad && (
              <>
                <div>
                  <label className="label">Wait Until</label>
                  <select
                    value={formData.settings.waitUntil || 'networkidle0'}
                    onChange={(e) => handleSettingChange('waitUntil', e.target.value)}
                    className="select"
                  >
                    <option value="load">Page load</option>
                    <option value="domcontentloaded">DOM content loaded</option>
                    <option value="networkidle0">Network idle (no connections)</option>
                    <option value="networkidle2">Network idle (2 connections)</option>
                  </select>
                </div>
                
                <div>
                  <label className="label">Wait for Selector (optional)</label>
                  <input
                    type="text"
                    value={formData.settings.waitForSelector || ''}
                    onChange={(e) => handleSettingChange('waitForSelector', e.target.value)}
                    className="input"
                    placeholder=".content-loaded"
                  />
                </div>
                
                <div>
                  <label className="label">Additional Wait (ms)</label>
                  <input
                    type="number"
                    value={formData.settings.additionalWait || 0}
                    onChange={(e) => handleSettingChange('additionalWait', parseInt(e.target.value))}
                    className="input"
                    placeholder="0"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {formData.type === 'valve' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Game Type</h3>
          <select
            value={formData.settings.gameType || 'cs2'}
            onChange={(e) => handleSettingChange('gameType', e.target.value)}
            className="select"
          >
            {valveGames.map(game => (
              <option key={game.value} value={game.value}>{game.label}</option>
            ))}
          </select>
        </div>
      )}
      
      {formData.type === 'teamspeak' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">TeamSpeak Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Query Port</label>
              <input
                type="number"
                value={formData.settings.queryPort || 10011}
                onChange={(e) => handleSettingChange('queryPort', parseInt(e.target.value))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Query Password</label>
              <input
                type="password"
                value={formData.settings.queryPassword || ''}
                onChange={(e) => handleSettingChange('queryPassword', e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-4 pt-4">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <Save className="w-5 h-5" />
          {loading ? 'Saving...' : 'Save Service'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

function ServiceDetail({ service }) {
  const { refreshData } = useApp();
  const [stats, setStats] = useState(null);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, [service.id]);
  
  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, checksRes] = await Promise.all([
        fetch(`/api/services/${service.id}/stats?hours=24`),
        fetch(`/api/services/${service.id}/checks?limit=50`)
      ]);
      
      const statsData = await statsRes.json();
      const checksData = await checksRes.json();
      
      setStats(statsData);
      setChecks(checksData);
    } catch (error) {
      console.error('Failed to load service data:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function runCheck() {
    try {
      await fetch(`/api/services/${service.id}/check`, { method: 'POST' });
      await loadData();
      refreshData();
    } catch (error) {
      console.error('Failed to run check:', error);
    }
  }
  
  async function deleteService() {
    if (!confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await fetch(`/api/services/${service.id}`, { method: 'DELETE' });
      window.location.href = '/services';
    } catch (error) {
      console.error('Failed to delete service:', error);
    }
  }
  
  const typeInfo = serviceTypes.find(t => t.value === service.type);
  const Icon = typeInfo?.icon || Server;
  
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              service.enabled ? 'bg-primary-500/20 text-primary-500' : 'bg-dark-700 text-dark-500'
            }`}>
              <Icon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{service.name}</h2>
              <p className="text-dark-400">{service.host}:{service.port || 'default'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={runCheck} className="btn btn-secondary">
              <RefreshCw className="w-5 h-5" />
              Check Now
            </button>
            <Link to={`/services/${service.id}/edit`} className="btn btn-secondary">
              <SettingsIcon className="w-5 h-5" />
            </Link>
            <button onClick={deleteService} className="btn btn-danger">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {!loading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-dark-900 rounded-lg p-4">
              <p className="text-sm text-dark-400 mb-1">Uptime (24h)</p>
              <p className={`text-2xl font-bold ${
                parseFloat(stats.uptime) >= 99 ? 'text-success' : 
                parseFloat(stats.uptime) >= 95 ? 'text-warning' : 'text-danger'
              }`}>
                {stats.uptime}%
              </p>
            </div>
            <div className="bg-dark-900 rounded-lg p-4">
              <p className="text-sm text-dark-400 mb-1">Avg Response</p>
              <p className="text-2xl font-bold text-white">
                {stats.avg_response_time ? `${stats.avg_response_time}ms` : '-'}
              </p>
            </div>
            <div className="bg-dark-900 rounded-lg p-4">
              <p className="text-sm text-dark-400 mb-1">Total Checks</p>
              <p className="text-2xl font-bold text-white">{stats.total_checks}</p>
            </div>
            <div className="bg-dark-900 rounded-lg p-4">
              <p className="text-sm text-dark-400 mb-1">Check Interval</p>
              <p className="text-2xl font-bold text-white">{service.check_interval}s</p>
            </div>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Recent Checks</h3>
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-dark-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Response</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Message</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {checks.map(check => (
                <tr key={check.id} className="hover:bg-dark-800/50">
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      check.status === 'up' ? 'badge-up' : 
                      check.status === 'down' ? 'badge-down' : 'badge-degraded'
                    }`}>
                      {check.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dark-200">
                    {check.response_time ? `${check.response_time}ms` : '-'}
                  </td>
                  <td className="px-4 py-3 text-dark-300 max-w-xs truncate">
                    {check.message || '-'}
                  </td>
                  <td className="px-4 py-3 text-dark-400 text-sm">
                    {formatDistanceToNow(new Date(check.checked_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {checks.length === 0 && (
            <div className="p-8 text-center text-dark-400">
              No checks yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Services() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { services } = useApp();
  
  const [loading, setLoading] = useState(false);
  const isNew = window.location.pathname.endsWith('/new');
  const isEdit = window.location.pathname.includes('/edit');
  
  const service = id ? services.find(s => s.id === parseInt(id)) : null;
  
  async function handleSubmit(data) {
    setLoading(true);
    try {
      if (service) {
        await fetch(`/api/services/${service.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        navigate(`/services/${service.id}`);
      } else {
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const newService = await res.json();
        navigate(`/services/${newService.id}`);
      }
    } catch (error) {
      console.error('Failed to save service:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (isNew || isEdit) {
    return (
      <div className="p-8 max-w-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-dark-400 hover:text-white mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        
        <h1 className="text-2xl font-bold text-white mb-6">
          {isNew ? 'Add New Service' : 'Edit Service'}
        </h1>
        
        <ServiceForm 
          service={service} 
          onSubmit={handleSubmit} 
          onCancel={() => navigate(-1)}
          loading={loading}
        />
      </div>
    );
  }
  
  if (service) {
    return (
      <div className="p-8">
        <button onClick={() => navigate('/services')} className="flex items-center gap-2 text-dark-400 hover:text-white mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back to Services
        </button>
        
        <ServiceDetail service={service} />
      </div>
    );
  }
  
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Services</h1>
        <Link to="/services/new" className="btn btn-primary">
          Add Service
        </Link>
      </div>
      
      {services.length === 0 ? (
        <div className="card text-center py-12">
          <Server className="w-12 h-12 text-dark-500 mx-auto mb-4" />
          <p className="text-dark-400">No services configured</p>
          <Link to="/services/new" className="btn btn-primary mt-4 inline-flex">
            Add Your First Service
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map(s => {
            const typeInfo = serviceTypes.find(t => t.value === s.type);
            const Icon = typeInfo?.icon || Server;
            
            return (
              <Link 
                key={s.id} 
                to={`/services/${s.id}`}
                className="card flex items-center justify-between hover:border-primary-500/50"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    s.enabled ? 'bg-primary-500/20 text-primary-500' : 'bg-dark-700 text-dark-500'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{s.name}</h3>
                    <p className="text-sm text-dark-400">{s.host}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`badge ${s.enabled ? 'badge-up' : 'badge-degraded'}`}>
                    {s.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <ArrowLeft className="w-5 h-5 text-dark-500 rotate-180" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
