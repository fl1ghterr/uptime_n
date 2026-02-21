import { useState } from 'react';
import { useApp } from '../App';
import { Save, Trash2, Moon, Sun, Database } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useApp();
  const [settings, setSettings] = useState({
    checkInterval: 60,
    retentionDays: 30
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  useState(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.checkInterval) setSettings(prev => ({ ...prev, checkInterval: parseInt(data.checkInterval) }));
        if (data.retentionDays) setSettings(prev => ({ ...prev, retentionDays: parseInt(data.retentionDays) }));
      });
  }, []);
  
  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }
  
  async function handleCleanup() {
    if (!confirm(`Delete all check data older than ${settings.retentionDays} days?`)) return;
    
    try {
      await fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: settings.retentionDays })
      });
      setMessage({ type: 'success', text: 'Old data cleaned up successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to clean up data' });
    }
  }
  
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
        }`}>
          {message.text}
        </div>
      )}
      
      <div className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sun className="w-5 h-5" />
            Appearance
          </h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-dark-200">Theme</p>
              <p className="text-sm text-dark-400">Choose your preferred color scheme</p>
            </div>
            <div className="flex items-center gap-2 bg-dark-900 rounded-lg p-1">
              <button
                onClick={() => setTheme('light')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  theme === 'light' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4" />
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  theme === 'dark' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4" />
                Dark
              </button>
            </div>
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Monitoring
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="label">Default Check Interval (seconds)</label>
              <input
                type="number"
                value={settings.checkInterval}
                onChange={(e) => setSettings(prev => ({ ...prev, checkInterval: parseInt(e.target.value) }))}
                className="input"
                min="10"
                max="3600"
              />
              <p className="text-sm text-dark-500 mt-1">How often to check services by default</p>
            </div>
            
            <div>
              <label className="label">Data Retention (days)</label>
              <input
                type="number"
                value={settings.retentionDays}
                onChange={(e) => setSettings(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }))}
                className="input"
                min="1"
                max="365"
              />
              <p className="text-sm text-dark-500 mt-1">Keep check history for this many days</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Data Management</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-dark-200">Clean Up Old Data</p>
              <p className="text-sm text-dark-400">Remove check data older than {settings.retentionDays} days</p>
            </div>
            <button onClick={handleCleanup} className="btn btn-secondary">
              <Trash2 className="w-5 h-5" />
              Clean Up
            </button>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
