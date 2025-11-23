import { Moon } from 'lucide-react';
import SleepAnalytics from '../Dashboard/SleepAnalytics';

const SleepTab = () => {
  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Moon className="text-purple-400" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Sleep Insights</h1>
              <p className="text-text-secondary mt-1">Track patterns, correlations, and unlock insights as you log more data</p>
            </div>
          </div>
        </div>

        {/* Sleep Analytics Dashboard */}
        <SleepAnalytics />
      </div>
    </div>
  );
};

export default SleepTab;
