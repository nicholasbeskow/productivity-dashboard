# Pinnacle - Personal Productivity Dashboard

**Version 2.3.0** | Built with React, Electron, and Tailwind CSS

A comprehensive productivity application designed for pre-med students to manage tasks, track wellness, and stay organized throughout the semester.

---

## ✨ Features

### 📋 Task Management
- **Flexible Task System**
  - Create one-time or recurring tasks
  - Set due dates and times with smart reminders
  - Categorize as Academic or Personal
  - Priority-based sorting and custom ordering
  - Overdue task highlighting

- **Recurring Tasks**
  - Daily, weekly, monthly, or custom intervals
  - Automatic instance generation
  - Independent instance editing or series-wide changes
  - Smart completion handling with next occurrence creation

- **Rich Task Details**
  - File attachments with system integration
  - Web links and external resources
  - Detailed descriptions and notes
  - Task status tracking (Not Started, In Progress, Complete)
  - Visual progress indicators

- **Advanced Organization**
  - Drag-and-drop reordering
  - Filter by task type (All, Academic, Personal)
  - Search across titles and descriptions
  - Task duplication for similar tasks

### 🎯 Dashboard
- **At-a-Glance Overview**
  - Upcoming tasks with deadlines
  - Semester progress circular indicator
  - Quick task completion with confetti celebration
  - Overdue task alerts

- **Semester Tracking**
  - Progress from start to end of semester
  - Break countdown support
  - Automatic milestone notifications
  - Semester end celebration modal

### 🧘 Wellness Tracking

#### Mood Tracker
- **Daily Mood Logging**
  - 5-level mood scale (Terrible → Amazing)
  - Calendar view with color-coded entries
  - Optional journal notes for each entry
  - Edit or delete past entries
  - Monthly mood visualization

#### Sleep Tracker
- **Sleep Quality Monitoring**
  - Rate sleep quality (1-5 stars)
  - Log sleep duration (hours)
  - Calendar view with visual indicators
  - Track sleep patterns over time
  - Edit historical entries

### 📊 Statistics & Analytics
- **Comprehensive Insights**
  - Task completion rates and trends
  - Productivity analytics over time
  - Mood-productivity correlations
  - Sleep-productivity relationships
  - Academic vs Personal task balance

- **Visual Charts**
  - Interactive Chart.js visualizations
  - Weekly and monthly breakdowns
  - Trend analysis with insights
  - Completion streak tracking

### 🎨 Canvas Integration (Electron)
- **Automated Assignment Import**
  - Connect to your school's Canvas LMS
  - Fetch upcoming assignments automatically
  - One-click import to task list
  - Track processed assignments
  - Sync on demand

### ⏱️ Pomodoro Timer
- **Focus Mode**
  - Customizable work/break durations
  - Automatic session transitions
  - System notifications
  - Background operation
  - Optional SelfControl integration (macOS)

- **SelfControl Blocking (macOS)**
  - Automatic website blocking during work sessions
  - Custom blocklist support
  - Seamless activation with timer
  - Configurable from Settings

### ⚙️ Settings & Customization
- **Personal Information**
  - Custom name for personalized greetings
  - Semester date configuration
  - Break period tracking

- **Pomodoro Configuration**
  - Adjustable work duration (default: 50 minutes)
  - Adjustable break duration (default: 10 minutes)
  - Settings sync across app

- **Data Management**
  - Complete backup export/import
  - Category-specific export (Tasks, Mood, Sleep)
  - Automatic backups (on launch + daily)
  - Manual backup restoration
  - Data reset options

- **Canvas Integration Setup**
  - Secure credential storage
  - Connection testing
  - URL and API token configuration

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 16+ and npm
- **macOS, Windows, or Linux**

### Installation

1. **Clone or download the repository**
   ```bash
   cd ~/Desktop/productivity-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the app**

   **Development mode (Electron):**
   ```bash
   npm run electron:dev
   ```

   **Web preview:**
   ```bash
   npm run dev
   # Open http://localhost:5173
   ```

4. **Build for production**

   **Web build:**
   ```bash
   npm run build
   npm run preview  # Test production build
   ```

   **Desktop app (Electron):**
   ```bash
   npm run electron:build
   # Creates Pinnacle-2.0.0 installer in dist/ folder
   ```

---

## 📦 Tech Stack

### Frontend
- **React 18.2** - UI framework
- **Vite 5.0** - Build tool with optimized code splitting
- **Tailwind CSS 3.4** - Utility-first styling
- **Framer Motion 10.16** - Smooth animations
- **Lucide React** - Modern icon library

### Desktop
- **Electron 28.1** - Cross-platform desktop app framework
- **Electron Store** - Persistent configuration storage

### Data & State
- **Zustand 4.4** - Lightweight state management
- **localStorage** - Local data persistence with automatic backups

### Visualization
- **Chart.js 4.5** - Interactive charts and graphs
- **React Chart.js 2** - React wrapper for Chart.js
- **React Big Calendar 1.8** - Calendar UI component

### Utilities
- **date-fns 3.0** - Modern date utility library
- **axios** - HTTP client for Canvas API
- **canvas-confetti** - Celebration animations

---

## 🏗️ Project Structure

```
productivity-dashboard/
├── src/
│   ├── components/
│   │   ├── Canvas/         # Canvas LMS integration
│   │   ├── Dashboard/      # Main dashboard & widgets
│   │   ├── Layout/         # Sidebar navigation
│   │   ├── Settings/       # App settings
│   │   ├── Stats/          # Analytics & charts
│   │   └── Tasks/          # Task management
│   ├── constants/
│   │   ├── config.js       # App configuration constants
│   │   └── storageKeys.js  # LocalStorage key constants
│   ├── utils/
│   │   ├── backupManager.js      # 4-layer backup system
│   │   ├── dateFormatting.js     # Date utility functions
│   │   ├── dateHelpers.js        # Date manipulation
│   │   ├── recurrenceHelpers.js  # Recurring task logic
│   │   ├── recurringTaskService.js # Task generation service
│   │   ├── storageManager.js     # Type-safe localStorage wrapper
│   │   └── taskHelpers.js        # Task utility functions
│   ├── styles/
│   │   └── globals.css     # Global styles & animations
│   └── App.jsx             # Root component with lazy loading
├── electron/
│   └── main.js             # Electron main process
├── resources/
│   └── icon.png            # App icon
├── OPTIMIZATION_SUMMARY.md # Complete optimization documentation
├── TESTING_CHECKLIST.md    # Comprehensive test cases
└── package.json
```

---

## 🔒 Data & Privacy

### Local-First Architecture
- All data stored locally on your device
- No external servers or cloud storage
- Complete control over your information
- Canvas credentials stored securely in Electron Store

### Backup System (4 Layers)
1. **Auto-save** - Instant save on every change
2. **Snapshots** - Daily automatic backups + on launch
3. **Manual Export** - Export complete backup to any location
4. **Category Export** - Export individual data types (Tasks, Mood, Sleep)

### Data Storage Locations
- **Web mode:** Browser localStorage
- **Electron mode:**
  - App data: `{userData}/localStorage`
  - Backups: `{userData}/backups/`
  - Settings: Electron Store

---

## 🎨 Design Philosophy

### Dark Theme with Green Accents
- Easy on the eyes for long study sessions
- High contrast for readability
- Energizing green highlights
- Smooth glassmorphism effects

### Satisfying Interactions
- Confetti celebrations on task completion
- Smooth animations and transitions
- Instant feedback on all actions
- Drag-and-drop task organization

### Responsive & Adaptive
- Desktop-optimized layout
- Scales gracefully
- Keyboard shortcuts (where applicable)
- Accessible UI components

---

## 🚀 Performance Optimizations (v2.0)

### Build Optimizations
- **60% smaller initial bundle** (668KB → 270KB)
- Intelligent code splitting by feature
- Lazy-loaded heavy components (Stats, Canvas)
- Separate vendor chunks for better caching

### Runtime Optimizations
- React.memo for expensive components
- Debounced localStorage writes
- Optimized re-renders
- Efficient date calculations

### Quality Improvements
- Centralized constants for magic numbers/strings
- Type-safe localStorage wrapper
- Consolidated utility functions (DRY principles)
- Comprehensive error handling

---

## 📝 Version History

### v2.3.0 (January 2026) - Settings Overhaul
- ✅ Completely redesigned Settings Tab with card-based navigation
- ✅ Added smooth fade-in transitions for better UX
- ✅ Refactored legacy code for improved maintainability
- ✅ Cleaned up UI interactions

### v2.0.0 (January 2026) - Optimization Release
- ✅ Fixed 7 critical bugs (data loss, crashes)
- ✅ 60% performance improvement (bundle size reduction)
- ✅ Code quality overhaul (constants, utilities)
- ✅ Comprehensive error handling
- ✅ Production-ready build optimization
- ✅ Complete documentation

### v1.5.0 - Feature Complete
- All core features implemented
- Canvas integration
- Full backup system
- Analytics dashboard

---

## 🧪 Testing

Run the comprehensive test suite using the provided checklist:

```bash
# See TESTING_CHECKLIST.md for 50+ test cases
```

Test categories:
- ✅ Bug fixes validation
- ✅ Performance verification
- ✅ Feature functionality
- ✅ Error handling
- ✅ Data integrity

---

## 🤝 Contributing

This is a personal project, but suggestions are welcome!

### Development Setup
```bash
npm install
npm run electron:dev
```

### Code Style
- ES6+ JavaScript
- Functional React components
- Tailwind CSS for styling
- Descriptive variable names
- Comments for complex logic

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

Built with:
- React ecosystem
- Electron community
- Tailwind CSS
- Chart.js
- Framer Motion
- All open-source contributors

---

## 📞 Support

For issues or questions:
1. Check `OPTIMIZATION_SUMMARY.md` for detailed documentation
2. Review `TESTING_CHECKLIST.md` for known issues
3. Check browser/Electron console for error messages

---

**Pinnacle v2.3.0** - Built to help you reach your peak productivity 🏔️
