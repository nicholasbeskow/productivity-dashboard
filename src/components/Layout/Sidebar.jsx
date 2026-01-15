import { Home, CheckSquare, BarChart3, Settings, BookOpen, Sparkles } from 'lucide-react';
import logo from '../../logo.png';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'canvas', label: 'Canvas', icon: BookOpen },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 m-4 glass-panel flex flex-col" style={{ height: 'calc(100vh - 2rem)' }}>
      {/* App Title / Logo Area */}
      <div className="py-5 px-4 border-b border-white/10 flex justify-center items-center drag-region">
        <img
          src={logo}
          alt="Productivity Dashboard Logo"
          className="w-[72px] h-auto no-drag"
          style={{ filter: 'drop-shadow(0 0 12px rgba(61, 214, 140, 0.5))' }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 pt-6">
        <ul className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${isActive
                      ? 'bg-zinc-800/30 text-white border-l-2 border-green-glow'
                      : 'bg-transparent text-white/60 hover:bg-glass-surface hover:text-white'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-white/40 text-center">
          Made with ♥ by Nick
        </p>
      </div>
    </aside >
  );
};

export default Sidebar;
