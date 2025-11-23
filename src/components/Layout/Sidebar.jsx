import { Home, CheckSquare, BarChart3, Settings, BookOpen } from 'lucide-react';
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
    <aside className="w-64 bg-bg-secondary border-r border-bg-tertiary flex flex-col">
      {/* App Title / Logo Area */}
      <div className="py-5 px-4 border-b border-bg-tertiary flex justify-center items-center">
        <img
          src={logo}
          alt="Productivity Dashboard Logo"
          className="w-44 h-auto"
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
                      ? 'bg-green-muted text-green-glow shadow-glow' 
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
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

      {/* Footer */}
      <div className="p-4 border-t border-bg-tertiary">
        <p className="text-xs text-text-tertiary text-center">
          v1.5.0 • Phase 2
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
