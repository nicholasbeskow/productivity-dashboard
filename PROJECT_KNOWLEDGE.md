# Productivity Dashboard - Complete Project Knowledge (v1.0.0)

---

## 🤝 HOW TO WORK WITH ME (READ THIS FIRST!)

### Collaboration Style
**This workflow worked perfectly in Week 1 - please follow it:**
- Focus on asking necessary questions BEFORE producing results
- Be realistic with project expectations and actively participate in planning
- Conserve usage as best as possible - keep responses concise but well-written and understandable
- Give step-by-step instructions with all-in-one terminal commands when possible
- Always provide downloadable files when making code changes (using /mnt/user-data/outputs)
- Test solutions before providing them
- Fix issues immediately when they arise
- Keep responses well-organized with clear sections and headers
- Use emojis sparingly but appropriately (✅ ❌ 🎉 🚀 etc.)

### My Background & Needs
- **Education:** Pre-med undergrad at USF MCOM (7-year BS/MD program)
- **Programming Experience:** Zero before starting this project
- **Learning Style:** Hands-on, building real projects, learning by doing
- **Personality:** I really enjoy reassurance, as I tend to get burnt out easily
- **Challenge:** I struggle with imposter syndrome
- **Feedback Style:** When I ask for criticism or grades, please be honest and suggest improvements
- **Explanations:** Please give thorough explanations when I need them

### Communication Preferences
- Be encouraging and supportive
- Celebrate wins (like "You crushed Week 1!")
- Don't over-explain unless I ask
- Use clear, beginner-friendly language
- Provide context for why we're doing things
- Acknowledge when I'm doing well
- Be patient with questions

### Project Goal
Create a productivity tool to help manage medical school coursework and reduce stress. This is a real tool I'll actually use, not just a learning exercise.

---

## Project Overview
A desktop productivity dashboard built with Electron, React, and Tailwind CSS for a pre-med student at USF MCOM (7-year BS/MD program). Zero programming experience before starting this project.

---

## Technical Setup

### Tech Stack
- **Framework:** Electron (desktop app)
- **Frontend:** React 18 with Vite
- **Styling:** Tailwind CSS with custom theme
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Storage:** localStorage (browser-based)
- **Language:** JavaScript (JSX)

### Project Location
```
~/Downloads/productivity-dashboard
```

### Run Commands
```bash
# Development mode
npm run electron:dev

# Install dependencies (if needed)
npm install
```

### File Structure
```
productivity-dashboard/
├── electron/
│   └── main.js                    # Electron main process
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.jsx      # Main dashboard view
│   │   │   ├── CircularProgress.jsx  # Semester progress circle
│   │   │   └── QuoteWidget.jsx    # Daily motivational quote
│   │   ├── Canvas/
│   │   │   └── CanvasTab.jsx      # Placeholder for Week 3
│   │   ├── Stats/
│   │   │   └── StatsTab.jsx       # Placeholder for future
│   │   ├── Settings/
│   │   │   └── SettingsTab.jsx    # Settings with semester dates
│   │   └── Layout/
│   │       ├── Sidebar.jsx        # Left navigation sidebar
│   │       └── MainLayout.jsx     # Overall layout wrapper
│   ├── styles/
│   │   └── globals.css            # Tailwind + custom styles
│   ├── App.jsx                    # Root app component
│   └── main.jsx                   # React entry point
├── package.json
├── tailwind.config.js             # Tailwind configuration
└── vite.config.js                 # Vite configuration
```

---

## Design System

### Color Palette
```javascript
// Primary colors (from tailwind.config.js)
colors: {
  'bg-primary': '#0a0e14',      // Darkest background
  'bg-secondary': '#13171d',     // Card backgrounds
  'bg-tertiary': '#1e2530',      // Elevated elements
  'text-primary': '#e6e6e6',     // Primary text
  'text-secondary': '#a0a0a0',   // Secondary text
  'text-tertiary': '#666666',    // Tertiary text
  'green-glow': '#3dd68c',       // Primary accent (forest green)
  'green-dark': '#2da771',       // Darker green for hover
}
```

### Typography
- **Primary Font:** System font stack (clean, readable)
- **Quote Text:** Orange (#ff9b50) with glow effect
- **Headers:** Bold, large, white/off-white
- **Body:** Medium gray for readability

### Spacing & Layout
- **Sidebar Width:** 256px (w-64)
- **Main Content Padding:** 2rem (p-8)
- **Card Border Radius:** 0.75rem (rounded-xl)
- **Card Borders:** border-bg-tertiary
- **Max Content Width:** 1280px (max-w-7xl)

---

## v1.0.0 Features (Week 1 Complete)

### 1. Dashboard View
**Location:** `src/components/Dashboard/Dashboard.jsx`

**Features:**
- Welcome header with current date
- Circular semester progress indicator (right side)
- Daily motivational quote (orange glow, left column)
- Placeholder cards for future features (Tasks, Timer, Calendar)

**State Management:**
```javascript
const [daysRemaining, setDaysRemaining] = useState(null);
const [progressPercentage, setProgressPercentage] = useState(0);
```

**Key Logic:**
- Calculates days remaining from current date to semester end
- Calculates progress percentage from start to end
- Shows "🌴 on break" when before start date OR after end date
- Updates in real-time when Settings change

### 2. Circular Progress Component
**Location:** `src/components/Dashboard/CircularProgress.jsx`

**Features:**
- SVG-based circular progress ring
- Green glow effect on progress arc
- Default: Shows days remaining (e.g., "48 days left")
- Hover: Smoothly fades to percentage complete (e.g., "38% complete")
- Uses Framer Motion for smooth animations

**Props:**
```javascript
<CircularProgress 
  daysRemaining={48} 
  progressPercentage={38} 
/>
```

**Technical Details:**
- Size: 140x140px
- Stroke width: 8px
- Uses `strokeDasharray` and `strokeDashoffset` for progress animation
- Hover effect: opacity fade only (no scale) for smooth transition

### 3. Quote Widget
**Location:** `src/components/Dashboard/QuoteWidget.jsx`

**Features:**
- Shows daily motivational quote
- Orange text (#ff9b50) with orange glow
- Author name in gray below
- No dash before author name

**Current Implementation:**
- Uses fallback Winston Churchill quote
- Console shows CORS errors (harmless, doesn't affect functionality)
- Quote displays perfectly despite errors

### 4. Settings Tab
**Location:** `src/components/Settings/SettingsTab.jsx`

**Features:**
- Semester start date picker
- Semester end date picker (last day of classes)
- Uses controlled React state for proper display
- Saves to localStorage
- Dispatches custom events for real-time updates

**State Management:**
```javascript
const [semesterStartDate, setSemesterStartDate] = useState('');
const [semesterEndDate, setSemesterEndDate] = useState('');
```

**localStorage Keys:**
- `semesterStartDate`: ISO date string (e.g., "2025-08-25")
- `semesterEndDate`: ISO date string (e.g., "2025-12-11")

**Event Handling:**
```javascript
// Dispatches two events on change
window.dispatchEvent(new Event('storage'));
window.dispatchEvent(new Event('semesterDatesChanged'));
```

### 5. Sidebar Navigation
**Location:** `src/components/Layout/Sidebar.jsx`

**Features:**
- Fixed left sidebar (w-64)
- App title: "Productivity" with "Dashboard" subtitle
- Navigation tabs: Dashboard, Canvas, Stats, Settings
- Active tab highlighted with green background
- Lucide React icons for each tab
- Version number at bottom (v1.0.0 • Week 1)

**Active State:**
```javascript
// Green background + lighter icon when active
className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 
  ${activeTab === 'dashboard' 
    ? 'bg-green-glow bg-opacity-20 text-green-glow' 
    : 'text-text-secondary hover:bg-bg-tertiary'
  }`}
```

---

## Key Technical Patterns

### 1. localStorage Integration
**Pattern:**
```javascript
// Save
localStorage.setItem('key', value);

// Load on mount
useEffect(() => {
  const value = localStorage.getItem('key') || 'default';
  setState(value);
}, []);

// Listen for changes
useEffect(() => {
  const handler = () => { /* update logic */ };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}, []);
```

### 2. Date Calculations
**Pattern:**
```javascript
// Set to noon to avoid timezone issues
const today = new Date();
today.setHours(12, 0, 0, 0);

const endDate = new Date(dateString + 'T12:00:00');

// Calculate days
const diffTime = endDate - today;
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

// Calculate percentage
const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
const daysPassed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
const percentage = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100);
```

### 3. Controlled Inputs
**Pattern:**
```javascript
const [value, setValue] = useState('');

// Load initial value
useEffect(() => {
  setValue(localStorage.getItem('key') || 'default');
}, []);

// Handle changes
const handleChange = (e) => {
  const newValue = e.target.value;
  setValue(newValue);
  localStorage.setItem('key', newValue);
};

// Render
<input type="date" value={value} onChange={handleChange} />
```

### 4. SVG Progress Circle
**Pattern:**
```javascript
const size = 140;
const strokeWidth = 8;
const radius = (size - strokeWidth) / 2;
const circumference = radius * 2 * Math.PI;
const offset = circumference - (percentage / 100) * circumference;

<circle
  cx={size / 2}
  cy={size / 2}
  r={radius}
  stroke="#3dd68c"
  strokeWidth={strokeWidth}
  strokeDasharray={circumference}
  strokeDashoffset={offset}
  strokeLinecap="round"
/>
```

---

## Common Issues & Solutions

### Issue: Settings dates revert when switching tabs
**Solution:** Use controlled components with React state
```javascript
const [date, setDate] = useState('');
useEffect(() => {
  setDate(localStorage.getItem('key') || 'default');
}, []);
```

### Issue: Circle doesn't update when dates change
**Solution:** Listen for custom events
```javascript
window.addEventListener('semesterDatesChanged', calculateProgress);
```

### Issue: Console CORS errors from quote API
**Status:** Harmless, doesn't affect functionality
**Explanation:** ZenQuotes API has CORS restrictions in dev mode, but fallback quote always displays

### Issue: Timezone issues with date calculations
**Solution:** Always set times to noon
```javascript
const date = new Date(dateString + 'T12:00:00');
today.setHours(12, 0, 0, 0);
```

---

## Development Workflow

### Making Changes
1. Edit files in `src/` directory
2. Vite hot-reloads automatically
3. Check browser console for errors (Cmd+Option+I)
4. Test in app immediately

### Adding New Components
1. Create in appropriate folder (e.g., `src/components/Dashboard/`)
2. Import in parent component
3. Use existing color/spacing patterns
4. Add to this documentation

### Debugging
- **Console:** Cmd+Option+I in running app
- **React DevTools:** Available in Electron
- **localStorage:** Check in DevTools > Application > Local Storage

---

## Week 2 Roadmap (Not Yet Built)

### Task System
- Create tasks with titles and descriptions
- Task statuses: Not Started → In Progress → Complete
- Check off tasks with smooth animations
- Task organization and filtering
- localStorage persistence for tasks
- Task list on Dashboard

### Future Weeks
- **Week 3:** Canvas LMS integration
- **Week 4:** Pomodoro timer
- **Week 5+:** Calendar view, statistics, more features

---

## Important Notes

### What Works in v1.0.0
✅ Circular progress indicator with semester tracking
✅ Real-time Settings updates
✅ Orange glowing motivational quote
✅ Clean dark UI with green accents
✅ Smooth hover animations
✅ localStorage data persistence
✅ "On break" detection (before start or after end)

### What Doesn't Work Yet
❌ No task creation/management (Week 2)
❌ No calendar integration (Week 2)
❌ No Pomodoro timer (Week 4)
❌ No Canvas integration (Week 3)
❌ Console shows quote API errors (harmless, cosmetic only)

### User Context
- Pre-med student at USF MCOM
- 7-year BS/MD program
- Needs help staying organized with coursework
- Prone to burnout, needs reassurance
- Struggles with imposter syndrome
- Zero programming experience before this project

---

## Code Style & Conventions

### Component Structure
```javascript
import { useState, useEffect } from 'react';
import OtherComponent from './OtherComponent';

const MyComponent = () => {
  // 1. State declarations
  const [state, setState] = useState(initialValue);
  
  // 2. Effects
  useEffect(() => {
    // Side effects here
  }, [dependencies]);
  
  // 3. Event handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // 4. Render
  return (
    <div className="tailwind-classes">
      {/* JSX here */}
    </div>
  );
};

export default MyComponent;
```

### Naming Conventions
- **Components:** PascalCase (e.g., `CircularProgress.jsx`)
- **Functions:** camelCase (e.g., `calculateProgress`)
- **Constants:** camelCase (e.g., `daysRemaining`)
- **CSS Classes:** Tailwind utilities (e.g., `bg-bg-secondary rounded-xl`)

### File Organization
- One component per file
- Component name matches filename
- Place related components in same folder
- Use index files sparingly

---

## Version History

### v1.0.0 (October 25, 2025) - Week 1 Complete
**Initial Release**
- Dark UI with forest green theme
- Circular semester progress indicator
- Daily motivational quotes
- Settings with semester dates
- Basic navigation structure
- Placeholder tabs for future features

**Status:** Stable, ready for production use

**Next:** v1.1.0 will add task management system (Week 2)

---

## Quick Reference Commands

```bash
# Start development
cd ~/Downloads/productivity-dashboard
npm run electron:dev

# Install new package
npm install package-name

# Check for errors
# Open DevTools in app: Cmd+Option+I

# Backup project
cd ~/Downloads
cp -r productivity-dashboard productivity-dashboard-backup

# View localStorage
# In DevTools: Application > Local Storage > file://
```

---

## 🚀 Starting New Chat Sessions

### For Week 2 and Beyond
When starting a new chat for a new week, just say:

```
Starting Week [X]: [Feature Name]
Ready to continue where we left off!
```

That's it! The Project Knowledge will handle the rest. Claude will automatically:
- Understand the codebase and what's been built
- Know your working style and preferences
- Follow the same collaboration patterns
- Pick up exactly where the last week ended

### Optional: Include a Screenshot
Consider attaching a screenshot of your current Dashboard to show the visual style.

### Before Each Week
Consider backing up your project:
```bash
cd ~/Downloads
cp -r productivity-dashboard productivity-dashboard-v[X]-backup
```

---

## Contact & Context
- **User:** Pre-med undergrad, USF MCOM program
- **Experience Level:** Beginner (started with zero programming knowledge)
- **Learning Style:** Hands-on, building real projects
- **Goal:** Create productivity tool for managing medical school coursework
- **Working Style:** See "How to Work With Me" section at the top of this document

---

**Last Updated:** October 25, 2025 (v1.0.0 - Week 1 Complete)
**Next Session:** Week 2 - Task Management System
**Note to Claude:** Read the "How to Work With Me" section first - it's critical for collaboration!
