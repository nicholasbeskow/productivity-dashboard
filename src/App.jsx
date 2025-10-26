import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import TasksTab from './components/Tasks/TasksTab';
import StatsTab from './components/Stats/StatsTab';
import SettingsTab from './components/Settings/SettingsTab';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard key="dashboard" setActiveTab={setActiveTab} />;
      case 'tasks':
        return <TasksTab key="tasks" />;
      case 'stats':
        return <StatsTab key="stats" />;
      case 'settings':
        return <SettingsTab key="settings" />;
      default:
        return <Dashboard key="dashboard" setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1], // cubic-bezier for smooth easing
            }}
            className="h-full"
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
