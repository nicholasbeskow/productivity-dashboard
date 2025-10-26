import { useState, useEffect } from 'react';
import CircularProgress from './CircularProgress';
import QuoteWidget from './QuoteWidget';

const Dashboard = () => {
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    const calculateProgress = () => {
      const semesterStartDate = localStorage.getItem('semesterStartDate') || '2025-08-25';
      const semesterEndDate = localStorage.getItem('semesterEndDate') || '2025-12-11';
      
      // Set all dates to noon to avoid timezone issues
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      
      const startDate = new Date(semesterStartDate + 'T12:00:00');
      const endDate = new Date(semesterEndDate + 'T12:00:00');
      
      // Calculate days remaining
      const diffTime = endDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Check if semester hasn't started yet
      const notStartedYet = today < startDate;
      
      if (notStartedYet) {
        // Before semester starts - show as "on break"
        setDaysRemaining(-1);
        setProgressPercentage(0);
      } else {
        setDaysRemaining(diffDays);
        
        // Calculate progress percentage
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
        const percentage = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100);
        setProgressPercentage(percentage);
      }
    };

    calculateProgress();
    
    // Listen for storage changes from Settings - with custom event
    const handleStorageChange = () => {
      calculateProgress();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('semesterDatesChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('semesterDatesChanged', handleStorageChange);
    };
  }, []);

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header with Circular Progress */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-text-primary mb-2">
              Welcome Back! 👋
            </h2>
            <p className="text-text-secondary mb-4">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            {/* Daily Quote in left column */}
            <QuoteWidget />
          </div>
          
          {daysRemaining !== null && (
            <CircularProgress 
              daysRemaining={daysRemaining} 
              progressPercentage={progressPercentage} 
            />
          )}
        </div>

        {/* Placeholder grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task List Placeholder */}
          <div className="lg:col-span-2 bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-xl font-semibold text-text-primary mb-4">
              Today's Tasks
            </h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i}
                  className="bg-bg-tertiary rounded-lg p-4 animate-pulse"
                >
                  <div className="h-4 bg-bg-primary rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <p className="text-text-tertiary text-sm mt-4 text-center">
              Task system coming in Week 2
            </p>
          </div>

          {/* Timer Placeholder */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-xl font-semibold text-text-primary mb-4">
              Pomodoro Timer
            </h3>
            <div className="flex items-center justify-center h-32">
              <div className="text-6xl font-bold text-green-glow">
                50:00
              </div>
            </div>
            <p className="text-text-tertiary text-sm mt-4 text-center">
              Timer coming in Week 4
            </p>
          </div>

          {/* Calendar Placeholder */}
          <div className="lg:col-span-3 bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-xl font-semibold text-text-primary mb-4">
              Calendar
            </h3>
            <div className="h-64 bg-bg-tertiary rounded-lg flex items-center justify-center">
              <p className="text-text-tertiary">
                Calendar view coming in Week 2
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
