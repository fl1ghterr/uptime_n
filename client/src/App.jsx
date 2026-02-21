import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, Globe, Settings, Plus, Server, Gamepad2, Wifi } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import SettingsPage from './pages/Settings';

export const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

function Sidebar({ services, status }) {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: Activity, label: 'Dashboard' },
    { path: '/services', icon: Server, label: 'Services' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];
  
  const totalServices = services.length;
  const upServices = services.filter(s => {
    const st = status.find(st => st.service_id === s.id);
    return st?.latest_check?.status === 'up';
  }).length;
  
  return (
    <aside className="w-64 bg-dark-950 border-r border-dark-800 min-h-screen flex flex-col">
      <div className="p-6 border-b border-dark-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Wifi className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Uptime</h1>
            <p className="text-xs text-dark-400">Monitor</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-b border-dark-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark-400">Status</span>
          <div className="flex items-center gap-2">
            <span className="text-success font-medium">{upServices}</span>
            <span className="text-dark-500">/</span>
            <span className="text-dark-300">{totalServices}</span>
          </div>
        </div>
        <div className="mt-2 h-2 bg-dark-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-success transition-all duration-500"
            style={{ width: totalServices > 0 ? `${(upServices / totalServices) * 100}%` : '0%' }}
          />
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-primary-600/20 text-primary-400' 
                      : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-dark-800">
        <Link
          to="/services/new"
          className="btn btn-primary w-full justify-center"
        >
          <Plus className="w-5 h-5" />
          Add Service
        </Link>
      </div>
    </aside>
  );
}

function App() {
  const [services, setServices] = useState([]);
  const [status, setStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    fetchData();
    connectWebSocket();
    
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  async function fetchData() {
    try {
      const [servicesRes, statusRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/status')
      ]);
      
      const servicesData = await servicesRes.json();
      const statusData = await statusRes.json();
      
      setServices(servicesData);
      setStatus(statusData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'services':
            setServices(message.data);
            break;
          case 'status':
            setStatus(message.data);
            break;
          case 'check':
            setStatus(prev => {
              const idx = prev.findIndex(s => s.service_id === message.data.service_id);
              if (idx >=                const updated = 0) {
 [...prev];
                updated[idx] = {
                  ...updated[idx],
                  latest_check: {
                    status: message.data.status,
                    response_time: message.data.response_time,
                    message: message.data.message,
                    checked_at: message.data.checked_at
                  }
                };
                return updated;
              }
              return prev;
            });
            fetchData();
            break;
          case 'service_update':
            setServices(prev => {
              const idx = prev.findIndex(s => s.id === message.data.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = message.data;
                return updated;
              }
              return [...prev, message.data];
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
      setTimeout(connectWebSocket, 5000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  const value = {
    services,
    status,
    loading,
    wsConnected,
    theme,
    setTheme,
    refreshData: fetchData
  };

  return (
    <AppContext.Provider value={value}>
      <BrowserRouter>
        <div className="flex min-h-screen bg-dark-900">
          <Sidebar services={services} status={status} />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/services" element={<Services />} />
              <Route path="/services/new" element={<Services newService />} />
              <Route path="/services/:id" element={<Services />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
