import { useState } from 'react';
import { useApp } from '../App';
import { formatDistanceToNow } from 'date-fns';
import { 
  Activity, Clock, TrendingUp, TrendingDown, 
  CheckCircle, XCircle, AlertTriangle, Server,
  Globe, Gamepad2, Mic
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const typeIcons = {
  http: Globe,
  https: Globe,
  minecraft: Server,
  valve: Gamepad2,
  fivem: Gamepad2,
  teamspeak: Mic
};

function ServiceCard({ service, serviceStatus }) {
  const latestCheck = serviceStatus?.latest_check;
  const status = latestCheck?.status || 'unknown';
  const uptime = serviceStatus?.uptime || 0;
  
  const statusColors = {
    up: 'border-success',
    down: 'border-danger',
    degraded: 'border-warning',
    unknown: 'border-dark-600'
  };
  
  const statusIcons = {
    up: CheckCircle,
    down: XCircle,
    degraded: AlertTriangle,
    unknown: Activity
  };
  
  const Icon = typeIcons[service.type] || Server;
  const StatusIcon = statusIcons[status] || Activity;
  
  return (
    <div className={`card border-l-4 ${statusColors[status]} cursor-pointer hover:scale-[1.02]`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            status === 'up' ? 'bg-success/20 text-success' : 
            status === 'down' ? 'bg-danger/20 text-danger' : 
            'bg-warning/20 text-warning'
          }`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{service.name}</h3>
            <p className="text-sm text-dark-400">{service.host}</p>
          </div>
        </div>
        <div className={`badge ${status === 'up' ? 'badge-up' : status === 'down' ? 'badge-down' : 'badge-degraded'}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {status}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-dark-500 mb-1">Uptime</p>
          <p className={`font-medium ${parseFloat(uptime) >= 99 ? 'text-success' : parseFloat(uptime) >= 95 ? 'text-warning' : 'text-danger'}`}>
            {uptime}%
          </p>
        </div>
        <div>
          <p className="text-dark-500 mb-1">Response</p>
          <p className="font-medium text-dark-200">
            {latestCheck?.response_time ? `${latestCheck.response_time}ms` : '-'}
          </p>
        </div>
        <div>
          <p className="text-dark-500 mb-1">Last Check</p>
          <p className="font-medium text-dark-200">
            {latestCheck?.checked_at ? formatDistanceToNow(new Date(latestCheck.checked_at), { addSuffix: true }) : '-'}
          </p>
        </div>
      </div>
      
      {latestCheck?.message && (
        <div className="mt-3 pt-3 border-t border-dark-700">
          <p className="text-sm text-dark-400 truncate">{latestCheck.message}</p>
        </div>
      )}
    </div>
  );
}

function StatsCard({ title, value, subtitle, icon: Icon, trend, color }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-dark-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-sm text-dark-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-sm">
          {trend > 0 ? (
            <TrendingUp className="w-4 h-4 text-success" />
          ) : (
            <TrendingDown className="w-4 h-4 text-danger" />
          )}
          <span className={trend > 0 ? 'text-success' : 'text-danger'}>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
  );
}

function ResponseTimeChart({ history }) {
  const data = history?.map(h => ({
    time: new Date(h.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    response: h.avg_response
  })) || [];
  
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">Response Time (24h)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              stroke="#64748b" 
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => `${v}ms`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #334155',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Area 
              type="monotone" 
              dataKey="response" 
              stroke="#0ea5e9" 
              fillOpacity={1} 
              fill="url(#colorResponse)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { services, status, loading } = useApp();
  const [selectedService, setSelectedService] = useState(null);
  const [history, setHistory] = useState(null);
  
  const totalServices = services.length;
  const upCount = status.filter(s => s.latest_check?.status === 'up').length;
  const downCount = status.filter(s => s.latest_check?.status === 'down').length;
  const avgUptime = status.length > 0 
    ? (status.reduce((sum, s) => sum + parseFloat(s.uptime || 0), 0) / status.length).toFixed(1)
    : 0;
  
  async function loadHistory(serviceId) {
    try {
      const res = await fetch(`/api/services/${serviceId}/stats?hours=24`);
      const data = await res.json();
      setHistory(data.history);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-dark-400">Monitor your services in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status.length > 0 ? 'bg-success pulse-dot' : 'bg-dark-500'}`}></div>
          <span className="text-sm text-dark-400">Live</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard 
          title="Total Services" 
          value={totalServices} 
          icon={Server}
          color="bg-primary-500/20 text-primary-500"
        />
        <StatsCard 
          title="Online" 
          value={upCount} 
          subtitle={`${totalServices - upCount} offline`}
          icon={CheckCircle}
          color="bg-success/20 text-success"
        />
        <StatsCard 
          title="Offline" 
          value={downCount} 
          icon={XCircle}
          color="bg-danger/20 text-danger"
        />
        <StatsCard 
          title="Avg. Uptime" 
          value={`${avgUptime}%`} 
          icon={Activity}
          color="bg-warning/20 text-warning"
        />
      </div>
      
      {selectedService && history && (
        <div className="mb-8">
          <ResponseTimeChart history={history} />
        </div>
      )}
      
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">All Services</h2>
        {services.length === 0 ? (
          <div className="card text-center py-12">
            <Server className="w-12 h-12 text-dark-500 mx-auto mb-4" />
            <p className="text-dark-400">No services configured yet</p>
            <p className="text-sm text-dark-500 mt-2">Add your first service to start monitoring</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(service => (
              <ServiceCard 
                key={service.id} 
                service={service} 
                serviceStatus={status.find(s => s.service_id === service.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
