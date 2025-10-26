import { BookOpen } from 'lucide-react';

const CanvasTab = () => {
  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <BookOpen className="text-green-canvas" size={32} />
            Canvas Assignments
          </h2>
          <p className="text-text-secondary">
            Manage and triage your Canvas assignments
          </p>
        </div>

        {/* Placeholder content */}
        <div className="bg-bg-secondary rounded-xl p-8 border border-bg-tertiary text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-green-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="text-green-canvas" size={40} />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-3">
              Canvas Integration Coming Soon
            </h3>
            <p className="text-text-secondary mb-6">
              In Week 3, you'll be able to:
            </p>
            <ul className="text-left space-y-2 text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-green-glow">✓</span>
                <span>Auto-sync assignments from Canvas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-glow">✓</span>
                <span>Mark assignments as "need to do"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-glow">✓</span>
                <span>Delete irrelevant assignments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-glow">✓</span>
                <span>Daily 8AM automatic refresh</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasTab;
