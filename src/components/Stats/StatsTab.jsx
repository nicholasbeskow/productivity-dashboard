import { BarChart3 } from 'lucide-react';

const StatsTab = () => {
  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <BarChart3 className="text-green-glow" size={32} />
            Your Statistics
          </h2>
          <p className="text-text-secondary">
            Track your productivity and progress
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Yearly Counter Placeholder */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Tasks Completed This Year
            </h3>
            <div className="flex items-center justify-center h-32">
              <div className="text-6xl font-bold text-green-glow">
                0
              </div>
            </div>
            <p className="text-text-tertiary text-sm mt-4 text-center">
              Counter starts in Week 4
            </p>
          </div>

          {/* Heatmap Placeholder */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Activity Heatmap
            </h3>
            <div className="flex items-center justify-center h-32">
              <div className="grid grid-cols-7 gap-1">
                {Array(35).fill(0).map((_, i) => (
                  <div 
                    key={i}
                    className="w-3 h-3 bg-bg-tertiary rounded-sm"
                  />
                ))}
              </div>
            </div>
            <p className="text-text-tertiary text-sm mt-4 text-center">
              Heatmap coming in Week 4
            </p>
          </div>
        </div>

        {/* Future stats preview */}
        <div className="mt-6 bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
          <h3 className="text-lg font-semibold text-text-primary mb-3">
            Coming Soon
          </h3>
          <p className="text-text-secondary">
            Track your daily completion streak, visualize your most productive days, 
            and see your progress over time with an Anki-style heatmap.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatsTab;
