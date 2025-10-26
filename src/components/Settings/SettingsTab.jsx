import { Settings } from 'lucide-react';
import { useState, useEffect } from 'react';

const SettingsTab = () => {
  const [userName, setUserName] = useState('');
  const [semesterStartDate, setSemesterStartDate] = useState('');
  const [semesterEndDate, setSemesterEndDate] = useState('');

  useEffect(() => {
    // Load data from localStorage on mount
    setUserName(localStorage.getItem('userName') || '');
    setSemesterStartDate(localStorage.getItem('semesterStartDate') || '2025-08-25');
    setSemesterEndDate(localStorage.getItem('semesterEndDate') || '2025-12-11');
  }, []);

  const handleUserNameChange = (e) => {
    const newName = e.target.value;
    setUserName(newName);
    localStorage.setItem('userName', newName);
    window.dispatchEvent(new Event('userNameChanged'));
  };

  const handleStartDateChange = (e) => {
    const newDate = e.target.value;
    setSemesterStartDate(newDate);
    localStorage.setItem('semesterStartDate', newDate);
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('semesterDatesChanged'));
  };

  const handleEndDateChange = (e) => {
    const newDate = e.target.value;
    setSemesterEndDate(newDate);
    localStorage.setItem('semesterEndDate', newDate);
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('semesterDatesChanged'));
  };

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <Settings className="text-green-glow" size={32} />
            Settings
          </h2>
          <p className="text-text-secondary">
            Configure your dashboard preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Personal Information
            </h3>
            <div>
              <label className="block text-sm text-text-secondary mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={handleUserNameChange}
                placeholder="Enter your name"
                className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow transition-colors"
              />
              <p className="text-xs text-text-tertiary mt-2">
                This will personalize your dashboard welcome message
              </p>
            </div>
          </div>

          {/* Canvas Settings Placeholder */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Canvas Integration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Canvas API Token
                </label>
                <input
                  type="password"
                  placeholder="Paste your Canvas API token here"
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
                  disabled
                />
                <p className="text-xs text-text-tertiary mt-2">
                  Canvas setup will be enabled in Week 3
                </p>
              </div>
            </div>
          </div>

          {/* Timer Settings Placeholder */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Pomodoro Timer
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Work Duration (minutes)
                </label>
                <input
                  type="number"
                  value={50}
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Break Duration (minutes)
                </label>
                <input
                  type="number"
                  value={10}
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
                  disabled
                />
              </div>
            </div>
            <p className="text-xs text-text-tertiary mt-4">
              Timer customization will be enabled in Week 4
            </p>
          </div>

          {/* Notifications Placeholder */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Notifications
            </h3>
            <div className="space-y-3">
              {[
                'Timer completed',
                'Break ended',
                'Task due in 6 hours'
              ].map((label) => (
                <label key={label} className="flex items-center gap-3 cursor-not-allowed opacity-50">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="w-5 h-5 rounded border-bg-primary bg-bg-tertiary"
                  />
                  <span className="text-text-secondary">{label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-text-tertiary mt-4">
              Notification preferences will be enabled in Week 4
            </p>
          </div>

          {/* Semester Settings */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Semester Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Semester Start Date
                </label>
                <input
                  type="date"
                  value={semesterStartDate}
                  onChange={handleStartDateChange}
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Last Day of Classes
                </label>
                <input
                  type="date"
                  value={semesterEndDate}
                  onChange={handleEndDateChange}
                  className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
                />
              </div>
            </div>
            <p className="text-xs text-text-tertiary mt-3">
              This will show a circular progress indicator on your dashboard
            </p>
          </div>

          {/* App Info */}
          <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              About
            </h3>
            <div className="space-y-2 text-sm text-text-secondary">
              <p><strong className="text-text-primary">Version:</strong> 1.0.0 (Week 1)</p>
              <p><strong className="text-text-primary">Status:</strong> Foundation Phase</p>
              <p className="text-text-tertiary pt-2">
                Built with React, Electron, and Tailwind CSS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
