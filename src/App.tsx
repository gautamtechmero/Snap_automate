import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Share2, 
  RefreshCw, 
  UploadCloud, 
  Calendar, 
  Image as ImageIcon, 
  FileText, 
  Settings as SettingsIcon,
  Search,
  Bell,
  User,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  Trash2,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Page = 'dashboard' | 'channels' | 'drive-sync' | 'upload-manager' | 'scheduler' | 'media-library' | 'logs' | 'settings';

interface Stat {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

interface MediaFile {
  id: number;
  file_name: string;
  file_id: string;
  type: string;
  size: number;
  aspect_ratio: string;
  status: 'Pending' | 'Uploading' | 'Published' | 'Failed';
  caption: string;
  scheduled_time: string | null;
  snapchat_link: string | null;
  created_at: string;
}

interface Channel {
  id: number;
  name: string;
  profile_id: string;
  avatar: string | null;
  status: string;
  drive_folder_id: string;
  daily_limit: number;
}

interface LogEntry {
  id: number;
  timestamp: string;
  file_name: string;
  action: string;
  status: string;
  error_message: string | null;
}

// --- Components ---

const SidebarItem = ({ 
  icon, 
  label, 
  active, 
  collapsed, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  collapsed: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`
      flex items-center w-full px-3 py-2 rounded-lg transition-all duration-200
      ${active ? 'bg-purple-600/20 text-purple-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}
      ${collapsed ? 'justify-center' : 'gap-3'}
    `}
    title={collapsed ? label : undefined}
  >
    <span className={`${active ? 'text-purple-400' : 'text-zinc-400'}`}>{icon}</span>
    {!collapsed && <span className="text-sm font-medium">{label}</span>}
  </button>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string; key?: React.Key }) => (
  <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }: { status: string }) => {
  const styles = {
    Pending: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    Uploading: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Published: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    Connected: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Expired: 'bg-red-500/10 text-red-500 border-red-500/20',
  };
  const style = styles[status as keyof typeof styles] || 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${style}`}>
      {status}
    </span>
  );
};

const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'warning'; onClose: () => void }) => {
  const colors = {
    success: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
    error: 'border-red-500/50 bg-red-500/10 text-red-400',
    warning: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed top-4 right-4 z-50 p-3 rounded-lg border flex items-center gap-3 shadow-lg backdrop-blur-md ${colors[type]}`}
    >
      {type === 'success' && <CheckCircle2 size={18} />}
      {type === 'error' && <AlertCircle size={18} />}
      {type === 'warning' && <AlertCircle size={18} />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X size={14} /></button>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' | 'warning' }[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [stats, setStats] = useState({ totalMedia: 0, pending: 0, publishedToday: 0, failed: 0 });
  const [recentActivity, setRecentActivity] = useState<MediaFile[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchData = async () => {
    try {
      const statsRes = await fetch('/api/stats');
      const statsData = await statsRes.json();
      setStats(statsData.stats);
      setRecentActivity(statsData.recentActivity);

      const channelsRes = await fetch('/api/channels');
      setChannels(await channelsRes.json());

      const mediaRes = await fetch('/api/media');
      setMedia(await mediaRes.json());

      const logsRes = await fetch('/api/logs');
      setLogs(await logsRes.json());
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleScan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/media/scan', { method: 'POST' });
      const data = await res.json();
      addToast(`Scan complete! Found ${data.newCount} new files.`, 'success');
      fetchData();
    } catch (error) {
      addToast("Failed to scan Drive", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePublishNow = async (id: number) => {
    setLoading(true);
    try {
      await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Published' })
      });
      addToast("Post published successfully", "success");
      fetchData();
    } catch (error) {
      addToast("Failed to publish", "error");
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Media', value: stats.totalMedia, icon: <ImageIcon size={20} />, color: 'text-purple-400' },
          { label: 'Pending Posts', value: stats.pending, icon: <Clock size={20} />, color: 'text-orange-400' },
          { label: 'Published Today', value: stats.publishedToday, icon: <CheckCircle2 size={20} />, color: 'text-emerald-400' },
          { label: 'Failed Uploads', value: stats.failed, icon: <AlertCircle size={20} />, color: 'text-red-400' },
        ].map((stat, i) => (
          <Card key={i} className="flex items-center gap-4">
            <div className={`p-3 rounded-lg bg-zinc-800 ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-zinc-100">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-200">Recent Activity</h3>
          <button className="text-xs text-purple-400 hover:text-purple-300 font-medium">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="pb-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">File Name</th>
                <th className="pb-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="pb-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Time</th>
                <th className="pb-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {recentActivity.length > 0 ? recentActivity.map((item) => (
                <tr key={item.id} className="group hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 text-sm text-zinc-300 font-medium">{item.file_name}</td>
                  <td className="py-3"><Badge status={item.status} /></td>
                  <td className="py-3 text-xs text-zinc-500">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="py-3 text-right">
                    <button className="p-1 text-zinc-500 hover:text-zinc-300"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500 text-sm italic">No activity yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderChannels = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-zinc-100">Snapchat Channels</h2>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} />
          Connect Channel
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map(channel => (
          <Card key={channel.id} className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 overflow-hidden">
              {channel.avatar ? <img src={channel.avatar} alt={channel.name} /> : <User size={24} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-zinc-200">{channel.name || 'Unnamed Channel'}</h4>
                <Badge status={channel.status} />
              </div>
              <p className="text-xs text-zinc-500">ID: {channel.profile_id}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Limit: {channel.daily_limit}/day</span>
              <button className="text-xs text-purple-400 hover:text-purple-300 font-medium">Settings</button>
            </div>
          </Card>
        ))}
        {channels.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
            <Share2 size={48} className="mb-4 opacity-20" />
            <p className="text-sm">No channels connected</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderDriveSync = () => (
    <div className="space-y-6">
      <Card className="flex items-center justify-between bg-purple-600/10 border-purple-600/20">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-600/20 text-purple-400">
            <UploadCloud size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100">Google Drive Integration</h3>
            <p className="text-xs text-zinc-400">Sync your media assets directly from Drive folders.</p>
          </div>
        </div>
        <button 
          onClick={handleScan}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Scanning...' : 'Scan Now'}
        </button>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-zinc-200 mb-4">Recent Sync Results</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="pb-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">File Name</th>
                <th className="pb-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
                <th className="pb-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Size</th>
                <th className="pb-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Ratio</th>
                <th className="pb-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {media.slice(0, 10).map((file) => (
                <tr key={file.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 text-sm text-zinc-300">{file.file_name}</td>
                  <td className="py-3 text-xs text-zinc-500 uppercase">{file.type}</td>
                  <td className="py-3 text-xs text-zinc-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</td>
                  <td className="py-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${file.aspect_ratio === '9:16' ? 'border-emerald-500/30 text-emerald-500' : 'border-orange-500/30 text-orange-500'}`}>
                      {file.aspect_ratio}
                    </span>
                  </td>
                  <td className="py-3"><Badge status={file.status} /></td>
                </tr>
              ))}
              {media.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500 text-sm italic">No media found in this folder</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderUploadManager = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-zinc-100">Upload Manager</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors">Bulk Schedule</button>
          <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors">Bulk Publish</button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Preview</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">File Name</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Caption</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Scheduled</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {media.map((file) => (
                <tr key={file.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="w-10 h-14 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center overflow-hidden">
                      {file.type === 'video' ? <Play size={16} className="text-zinc-600" /> : <ImageIcon size={16} className="text-zinc-600" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-zinc-300 font-medium truncate max-w-[150px]">{file.file_name}</p>
                    <p className="text-[10px] text-zinc-500">{(file.size / (1024 * 1024)).toFixed(1)}MB • {file.aspect_ratio}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 max-w-[200px]">
                      <span className="text-xs text-zinc-400 truncate italic">{file.caption || 'No caption...'}</span>
                      <button className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-purple-400 transition-opacity">
                        <FileText size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge status={file.status} /></td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{file.scheduled_time ? new Date(file.scheduled_time).toLocaleString() : 'Not set'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {file.status === 'Pending' && (
                        <>
                          <button 
                            onClick={() => handlePublishNow(file.id)}
                            className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors" title="Publish Now">
                            <Share2 size={16} />
                          </button>
                          <button className="p-1.5 text-purple-400 hover:bg-purple-400/10 rounded-md transition-colors" title="Schedule">
                            <Calendar size={16} />
                          </button>
                        </>
                      )}
                      {file.status === 'Published' && (
                        <a href={file.snapchat_link || '#'} target="_blank" className="p-1.5 text-zinc-400 hover:bg-zinc-700 rounded-md transition-colors">
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-zinc-100">System Logs</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors">Errors Only</button>
          <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors">Clear Logs</button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Context</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-zinc-500">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300 font-medium">{log.file_name}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{log.action}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase ${log.status === 'Success' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 italic">{log.error_message || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500 text-sm italic">No system activity yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard': return renderDashboard();
      case 'channels': return renderChannels();
      case 'drive-sync': return renderDriveSync();
      case 'upload-manager': return renderUploadManager();
      case 'logs': return renderLogs();
      default: return (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <AlertCircle size={48} className="mb-4 opacity-20" />
          <p className="text-sm">Page "{activePage}" is coming soon.</p>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen bg-black text-zinc-300 font-sans selection:bg-purple-500/30">
      {/* Sidebar */}
      <aside 
        className={`
          hidden md:flex flex-col bg-zinc-950 border-r border-zinc-900 transition-all duration-300 ease-in-out z-30
          ${collapsed ? 'w-16' : 'w-56'}
        `}
      >
        <div className="h-14 flex items-center px-4 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-black">
              <Share2 size={20} strokeWidth={2.5} />
            </div>
            {!collapsed && <span className="font-bold text-zinc-100 tracking-tight">SnapAuto</span>}
          </div>
        </div>
        
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activePage === 'dashboard'} collapsed={collapsed} onClick={() => setActivePage('dashboard')} />
          <SidebarItem icon={<Share2 size={18} />} label="Channels" active={activePage === 'channels'} collapsed={collapsed} onClick={() => setActivePage('channels')} />
          <SidebarItem icon={<RefreshCw size={18} />} label="Drive Sync" active={activePage === 'drive-sync'} collapsed={collapsed} onClick={() => setActivePage('drive-sync')} />
          <SidebarItem icon={<UploadCloud size={18} />} label="Upload Manager" active={activePage === 'upload-manager'} collapsed={collapsed} onClick={() => setActivePage('upload-manager')} />
          <SidebarItem icon={<Calendar size={18} />} label="Scheduler" active={activePage === 'scheduler'} collapsed={collapsed} onClick={() => setActivePage('scheduler')} />
          <SidebarItem icon={<ImageIcon size={18} />} label="Media Library" active={activePage === 'media-library'} collapsed={collapsed} onClick={() => setActivePage('media-library')} />
          <SidebarItem icon={<FileText size={18} />} label="Logs" active={activePage === 'logs'} collapsed={collapsed} onClick={() => setActivePage('logs')} />
        </nav>

        <div className="p-2 border-t border-zinc-900">
          <SidebarItem icon={<SettingsIcon size={18} />} label="Settings" active={activePage === 'settings'} collapsed={collapsed} onClick={() => setActivePage('settings')} />
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center w-full px-3 py-2 mt-1 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-all"
          >
            {collapsed ? <ChevronRight size={18} /> : <div className="flex items-center gap-3"><ChevronLeft size={18} /><span className="text-xs font-medium">Collapse</span></div>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-64 bg-zinc-950 z-50 md:hidden flex flex-col"
            >
              <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-black">
                    <Share2 size={20} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-zinc-100">SnapAuto</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-zinc-500"><X size={20} /></button>
              </div>
              <nav className="flex-1 p-4 space-y-2">
                <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activePage === 'dashboard'} collapsed={false} onClick={() => { setActivePage('dashboard'); setMobileMenuOpen(false); }} />
                <SidebarItem icon={<Share2 size={18} />} label="Channels" active={activePage === 'channels'} collapsed={false} onClick={() => { setActivePage('channels'); setMobileMenuOpen(false); }} />
                <SidebarItem icon={<RefreshCw size={18} />} label="Drive Sync" active={activePage === 'drive-sync'} collapsed={false} onClick={() => { setActivePage('drive-sync'); setMobileMenuOpen(false); }} />
                <SidebarItem icon={<UploadCloud size={18} />} label="Upload Manager" active={activePage === 'upload-manager'} collapsed={false} onClick={() => { setActivePage('upload-manager'); setMobileMenuOpen(false); }} />
                <SidebarItem icon={<Calendar size={18} />} label="Scheduler" active={activePage === 'scheduler'} collapsed={false} onClick={() => { setActivePage('scheduler'); setMobileMenuOpen(false); }} />
                <SidebarItem icon={<ImageIcon size={18} />} label="Media Library" active={activePage === 'media-library'} collapsed={false} onClick={() => { setActivePage('media-library'); setMobileMenuOpen(false); }} />
                <SidebarItem icon={<FileText size={18} />} label="Logs" active={activePage === 'logs'} collapsed={false} onClick={() => { setActivePage('logs'); setMobileMenuOpen(false); }} />
                <SidebarItem icon={<SettingsIcon size={18} />} label="Settings" active={activePage === 'settings'} collapsed={false} onClick={() => { setActivePage('settings'); setMobileMenuOpen(false); }} />
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-4 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 text-zinc-400 hover:bg-zinc-800 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-bold text-zinc-100 capitalize">{activePage.replace('-', ' ')}</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 focus-within:border-purple-500/50 focus-within:text-zinc-300 transition-all">
              <Search size={16} />
              <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-xs w-32 lg:w-48" />
            </div>
            
            <button className="p-1.5 text-zinc-400 hover:bg-zinc-800 rounded-lg relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full border border-zinc-950"></span>
            </button>
            
            <div className="h-8 w-px bg-zinc-900 mx-1"></div>
            
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 hover:bg-zinc-800 rounded-lg transition-colors">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                JD
              </div>
              <span className="hidden lg:block text-xs font-medium text-zinc-300">John Doe</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            {/* Global Automation Status */}
            <div className="mb-6 flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-2 text-emerald-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Automation Running
              </div>
              <div className="text-zinc-500 flex items-center gap-1.5">
                <RefreshCw size={12} />
                Last Scan: 2 mins ago
              </div>
              <div className="text-zinc-500 flex items-center gap-1.5">
                <Share2 size={12} />
                Last Publish: 1 hour ago
              </div>
              <div className="text-zinc-500 flex items-center gap-1.5">
                <Clock size={12} />
                Pending: {stats.pending}
              </div>
            </div>

            {renderContent()}
          </div>
        </div>
      </main>

      {/* Toasts */}
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
