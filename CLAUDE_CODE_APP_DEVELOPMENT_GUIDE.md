# Claude Code App Development Guide
## Blueprint for Building High-Quality Electron + React Apps

**Based on**: Pinnacle Productivity Dashboard (v2.0.0)
**Success Metrics**: 60% bundle reduction, smooth UI, production-ready in 6 optimization phases

---

## 🎯 Project Overview Template

When starting a new project, provide Claude Code with:

```
I want to build a [PURPOSE] application using Electron + React.

TARGET PLATFORM: Desktop (macOS/Windows/Linux) with Electron
UI REQUIREMENTS: Modern, smooth, responsive with [YOUR_COLOR_SCHEME]
DATA STORAGE: Local-first (localStorage + future cloud sync option)
KEY FEATURES: [List 3-5 core features]

REFERENCE APP: Use the Pinnacle productivity dashboard architecture as a template.
Follow the tech stack and best practices from that project.
```

---

## 📦 Proven Tech Stack

### Core Framework
```json
{
  "runtime": "Electron 28.x",
  "frontend": "React 18.2+ with Vite 5.x",
  "styling": "Tailwind CSS 3.x",
  "icons": "Lucide React (tree-shakeable)",
  "animations": "Framer Motion 11.x"
}
```

### Why This Stack Works

1. **Vite Instead of Create React App**
   - 10x faster dev server startup
   - Hot Module Replacement (HMR) is instant
   - Built-in code splitting and tree shaking
   - Production builds are highly optimized

2. **Tailwind CSS**
   - Utility-first = faster development
   - PurgeCSS built-in = tiny bundle sizes
   - Consistent design system
   - No CSS file bloat

3. **Framer Motion**
   - Smooth 60fps animations
   - Declarative syntax
   - AnimatePresence for mount/unmount transitions
   - **Best Practice**: Use fade-only animations for less distraction
   ```jsx
   // Good: Subtle and smooth
   <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     exit={{ opacity: 0 }}
   />

   // Avoid: Too much motion can be distracting
   <motion.div
     initial={{ opacity: 0, x: 20, scale: 0.8 }}
     animate={{ opacity: 1, x: 0, scale: 1 }}
   />
   ```

4. **Lucide React Icons**
   - Tree-shakeable (only bundle used icons)
   - Consistent design language
   - Smaller than Font Awesome or Material Icons

### State Management
```json
{
  "global": "Zustand 4.x (lightweight Redux alternative)",
  "local": "React useState/useReducer",
  "persistence": "localStorage with custom wrapper"
}
```

**Zustand Benefits**:
- No boilerplate (unlike Redux)
- 1KB bundle size
- React hooks-based
- Built-in persistence middleware

### Optional Libraries (Add as Needed)
```json
{
  "charts": "Chart.js 4.x + react-chartjs-2",
  "dates": "date-fns (smaller than moment.js)",
  "forms": "React Hook Form (for complex forms)",
  "notifications": "react-hot-toast"
}
```

---

## 🏗️ Project Structure (Copy This Exactly)

```
your-app/
├── electron/
│   ├── main.js              # Electron main process
│   ├── preload.js           # Context bridge for IPC
│   └── [feature]-handler.js # Separate IPC handlers by feature
│
├── src/
│   ├── components/
│   │   ├── [Feature]/       # Group by feature, not type
│   │   │   ├── FeatureMain.jsx
│   │   │   ├── FeatureItem.jsx
│   │   │   └── FeatureForm.jsx
│   │   └── Layout/
│   │       ├── TabNavigation.jsx
│   │       └── ErrorBoundary.jsx
│   │
│   ├── constants/
│   │   ├── storageKeys.js   # All localStorage keys
│   │   └── config.js        # All magic numbers/strings
│   │
│   ├── utils/
│   │   ├── storageManager.js  # localStorage wrapper
│   │   ├── dateFormatting.js  # Shared date logic
│   │   └── [feature]Manager.js # Feature-specific utilities
│   │
│   ├── stores/              # Zustand stores
│   │   └── [feature]Store.js
│   │
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # React entry point
│   └── index.css            # Tailwind imports + global styles
│
├── public/                  # Static assets
├── dist/                    # Build output (gitignored)
│
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind customization
├── electron-builder.json    # Electron build config
├── package.json
└── .gitignore
```

### Why This Structure Works

1. **Feature-based folders** (not MVC-style)
   - All related code lives together
   - Easy to find and modify features
   - Can delete entire feature by removing one folder

2. **Centralized constants**
   - No magic strings scattered in code
   - Easy refactoring
   - Prevents typos

3. **Utility layer**
   - DRY principle enforcement
   - Consistent error handling
   - Easy to add features (e.g., switch from localStorage to IndexedDB)

---

## ⚙️ Critical Configuration Files

### 1. vite.config.js (Optimized for Electron)

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  base: './', // CRITICAL: Electron needs relative paths

  build: {
    outDir: 'dist-react',
    emptyOutDir: true,

    rollupOptions: {
      output: {
        // SIMPLIFIED chunk splitting (learned from debugging)
        manualChunks(id) {
          // Only separate large lazy-loaded libraries
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'vendor-charts';
          }
          // Bundle everything else together to avoid loading order issues
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },

    chunkSizeWarningLimit: 1000, // Adjust as needed
  },

  server: {
    port: 5173,
    strictPort: true,
  },
});
```

**Key Lessons**:
- Don't over-optimize chunks (causes loading order bugs)
- Only split truly large lazy-loaded dependencies
- Always use `base: './'` for Electron

### 2. tailwind.config.js (Custom Theme)

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Define your app's color palette
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          // ... (use a tool like uicolors.app)
          900: '#14532d',
        },
        // Add semantic colors
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      animation: {
        // Custom animations
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
```

### 3. electron-builder.json (Build Configuration)

```json
{
  "appId": "com.yourcompany.yourapp",
  "productName": "YourApp",
  "directories": {
    "output": "dist"
  },
  "files": [
    "dist-react/**/*",
    "electron/**/*",
    "package.json"
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "target": ["dmg", "zip"],
    "icon": "public/icon.png"
  },
  "win": {
    "target": ["nsis", "portable"],
    "icon": "public/icon.png"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "category": "Utility"
  }
}
```

### 4. package.json Scripts (Essential)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:preview": "npm run build && electron ."
  },
  "main": "electron/main.js"
}
```

**You'll Need**:
```bash
npm install --save-dev concurrently wait-on electron-builder
```

---

## 🎨 UI/UX Best Practices (Why Pinnacle Feels Smooth)

### 1. Consistent Spacing System

Use Tailwind's spacing scale consistently:
```jsx
// Good: Consistent spacing
<div className="p-6 space-y-4">
  <div className="space-y-2">
    <h2 className="text-xl">Title</h2>
    <p className="text-gray-600">Description</p>
  </div>
</div>

// Avoid: Random pixel values
<div style={{ padding: '23px', marginTop: '17px' }}>
```

### 2. Color Hierarchy

```jsx
// Text hierarchy
<h1 className="text-gray-900 dark:text-white">Primary</h1>
<p className="text-gray-700 dark:text-gray-200">Secondary</p>
<span className="text-gray-500 dark:text-gray-400">Tertiary</span>

// State colors (semantic)
<div className="bg-green-50 text-green-800 border-green-200">Success</div>
<div className="bg-red-50 text-red-800 border-red-200">Error</div>
<div className="bg-yellow-50 text-yellow-800 border-yellow-200">Warning</div>
```

### 3. Smooth Transitions

```css
/* Add to index.css */
* {
  transition-property: color, background-color, border-color;
  transition-duration: 150ms;
  transition-timing-function: ease-in-out;
}

/* Disable for animations */
.no-transition {
  transition: none !important;
}
```

### 4. Loading States (Always Show Feedback)

```jsx
// Good: Show what's happening
{isLoading ? (
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    <span>Saving...</span>
  </div>
) : (
  <button>Save</button>
)}

// Avoid: No feedback leaves users confused
<button onClick={save}>Save</button>
```

### 5. Form Input Best Practices

```jsx
// Allow free typing, validate on blur
<input
  type="number"
  value={value}
  onChange={(e) => setValue(e.target.value)} // Allow empty
  onBlur={(e) => {
    // Validate only when user leaves field
    const num = parseInt(e.target.value);
    setValue(isNaN(num) ? defaultValue : num);
  }}
  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
/>
```

### 6. Responsive Design Pattern

```jsx
// Mobile-first approach
<div className="
  flex flex-col gap-4        /* Mobile: stack vertically */
  md:flex-row md:gap-6       /* Tablet+: horizontal */
  lg:gap-8                   /* Desktop: more space */
">
  <aside className="md:w-64">Sidebar</aside>
  <main className="flex-1">Content</main>
</div>
```

---

## 🚀 Performance Optimization Strategy

### Phase 1: Build Right From Start

1. **Use React.lazy for heavy components**
```jsx
// Only load when needed
const Statistics = React.lazy(() => import('./components/Statistics/Statistics'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Statistics />
    </Suspense>
  );
}
```

2. **Optimize images**
```bash
# Use WebP format
# Keep icons as SVG (scalable + tiny)
# Max 1920px width for photos
```

3. **Debounce expensive operations**
```jsx
import { useState, useEffect } from 'react';

function SearchInput({ onSearch }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

### Phase 2: Measure Before Optimizing

```bash
# Check bundle size
npm run build
# Look at dist-react/assets/*.js sizes

# Preview production build
npm run preview
# Test actual performance

# Lighthouse audit (if building web version)
# Aim for 90+ performance score
```

### Phase 3: Optimize (If Needed)

Only if bundle > 500KB:
1. Check `node_modules` imports (are you importing entire libraries?)
2. Use bundle analyzer: `npm install --save-dev rollup-plugin-visualizer`
3. Lazy load heavy features
4. Use lighter alternatives (date-fns vs moment, lucide vs font-awesome)

---

## 💾 Data Architecture Pattern

### StorageManager Utility (Always Create This)

```javascript
// src/utils/storageManager.js

/**
 * Type-safe localStorage wrapper with error handling
 */

export const getItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.error(`[StorageManager] Error getting ${key}:`, error);
    return defaultValue;
  }
};

export const setItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[StorageManager] Error setting ${key}:`, error);
    return false;
  }
};

export const removeItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[StorageManager] Error removing ${key}:`, error);
    return false;
  }
};

export const getAllKeys = () => {
  try {
    return Object.keys(localStorage);
  } catch (error) {
    console.error('[StorageManager] Error getting keys:', error);
    return [];
  }
};
```

### Constants Pattern (Prevent Typos)

```javascript
// src/constants/storageKeys.js

export const STORAGE_KEYS = {
  USER_SETTINGS: 'userSettings',
  APP_DATA: 'appData',
  THEME: 'theme',
  // Add all your keys here
};

export const APP_EVENTS = {
  DATA_UPDATED: 'dataUpdated',
  SETTINGS_CHANGED: 'settingsChanged',
  // Custom events for cross-component communication
};
```

### Usage Pattern

```javascript
// BAD: Magic strings everywhere
const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
localStorage.setItem('tasks', JSON.stringify(newTasks));

// GOOD: Centralized, type-safe, error-handled
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getItem, setItem } from '../utils/storageManager';

const tasks = getItem(STORAGE_KEYS.TASKS, []);
setItem(STORAGE_KEYS.TASKS, newTasks);
```

---

## 🔌 Electron IPC Best Practices

### Secure Context Bridge Pattern

```javascript
// electron/preload.js

const { contextBridge, ipcRenderer } = require('electron');

// Expose ONLY specific functions (never expose entire ipcRenderer)
contextBridge.exposeInMainWorld('electron', {
  // File operations
  selectFile: () => ipcRenderer.invoke('dialog:show-open-dialog'),
  saveFile: (options) => ipcRenderer.invoke('dialog:show-save-dialog', options),
  readFile: (path) => ipcRenderer.invoke('file:read', path),
  writeFile: (path, data) => ipcRenderer.invoke('file:write', path, data),

  // App operations
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  openExternal: (url) => ipcRenderer.send('app:open-external', url),

  // Event listeners
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
});
```

```javascript
// electron/main.js

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs').promises;

// Register all handlers
ipcMain.handle('dialog:show-open-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  return result;
});

ipcMain.handle('file:read', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

### React Usage

```jsx
// Check if running in Electron
const isElectron = window.electron !== undefined;

function Component() {
  const handleImport = async () => {
    if (!isElectron) {
      // Fallback for web version
      return;
    }

    const result = await window.electron.selectFile();
    if (!result.canceled) {
      const fileData = await window.electron.readFile(result.filePaths[0]);
      // Use fileData
    }
  };

  return <button onClick={handleImport}>Import</button>;
}
```

---

## 🧪 Quality Assurance Checklist

### Before Calling App "Done"

```markdown
## Functionality
- [ ] All core features work in dev mode
- [ ] All core features work in production build (`npm run electron:preview`)
- [ ] No console errors in production build
- [ ] Data persists after app restart
- [ ] Data survives app crashes (test by force-quitting)

## Performance
- [ ] App opens in < 3 seconds on average hardware
- [ ] No UI lag when interacting with components
- [ ] Smooth animations (60fps)
- [ ] Bundle size < 500KB (excluding node_modules)

## UX
- [ ] Loading states for all async operations
- [ ] Error messages are user-friendly
- [ ] Form inputs validate on blur (not while typing)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Visual feedback for all interactions (hover, active, focus states)

## Edge Cases
- [ ] Empty states look good (no data yet)
- [ ] Very long text doesn't break layout
- [ ] Rapid clicking doesn't cause bugs
- [ ] Invalid data types are handled gracefully
- [ ] localStorage quota exceeded handled (5MB limit)

## Build & Deploy
- [ ] `npm run build` succeeds with no errors
- [ ] `npm run electron:build` creates installer
- [ ] App version matches package.json
- [ ] Icon displays correctly on all platforms
- [ ] App name is correct in title bar and taskbar
```

---

## 🐛 Common Pitfalls to Avoid

### 1. **React State Dependency Error**
```javascript
// BAD: Loading Zustand before React
manualChunks(id) {
  if (id.includes('zustand')) return 'vendor-state'; // Can load before React!
  if (id.includes('react')) return 'vendor-react';
}

// GOOD: Keep state libraries with React
manualChunks(id) {
  if (id.includes('node_modules')) return 'vendor'; // All together
}
```

### 2. **Electron Path Issues**
```javascript
// BAD: Absolute paths break in production
const iconPath = '/assets/icon.png';

// GOOD: Use path.join and __dirname
const path = require('path');
const iconPath = path.join(__dirname, '../assets/icon.png');
```

### 3. **Missing IPC Handlers**
```javascript
// In React: window.electron.exportData()
// In main.js: MUST have ipcMain.handle('export-data', handler)
// Symptom: "No handler registered" error
```

### 4. **localStorage Overwrites**
```javascript
// BAD: Doesn't merge, overwrites entire object
const settings = getItem(STORAGE_KEYS.SETTINGS);
settings.theme = 'dark';
setItem(STORAGE_KEYS.SETTINGS, settings);

// GOOD: Explicitly merge
const settings = getItem(STORAGE_KEYS.SETTINGS, {});
setItem(STORAGE_KEYS.SETTINGS, { ...settings, theme: 'dark' });
```

### 5. **Animation Performance**
```javascript
// BAD: Animating layout properties (causes reflow)
<motion.div animate={{ width: '100%', height: '500px' }} />

// GOOD: Animate transform and opacity only (GPU-accelerated)
<motion.div animate={{ opacity: 1, scale: 1 }} />
```

---

## 📝 Development Workflow with Claude Code

### Initial Setup Prompt

```
Create a new Electron + React application with the following:

TECH STACK:
- Electron 28.x with secure context bridge
- React 18.2 with Vite 5.x
- Tailwind CSS with [COLOR_SCHEME] theme
- Framer Motion for animations
- Zustand for state management

PROJECT STRUCTURE:
- Follow the Pinnacle app architecture
- Create constants/ and utils/ folders from the start
- Implement storageManager utility
- Set up ErrorBoundary component

FEATURES TO BUILD:
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

UI REQUIREMENTS:
- Tab-based navigation
- Dark mode support
- Smooth transitions (fade-only animations)
- Mobile-responsive (even though it's desktop, good practice)

START WITH:
1. Project scaffolding with Vite
2. Electron integration
3. Basic tab navigation
4. One simple feature to verify everything works
```

### Feature Development Prompt

```
Add [FEATURE_NAME] to the app.

REQUIREMENTS:
- Create components in src/components/[Feature]/
- Use storageManager for persistence
- Add constants to src/constants/config.js
- Include loading states and error handling
- Follow the UI patterns from existing features
- Use fade animations only

DATA MODEL:
[Describe what data needs to be stored]

UI FLOW:
[Describe user interaction]

REFERENCE:
Look at how [SIMILAR_FEATURE] is implemented for patterns.
```

### Optimization Phase Prompt

```
The app is feature-complete. Run optimization analysis:

1. Check bundle size (npm run build)
2. Identify duplicate code
3. Look for magic strings/numbers that should be constants
4. Check for missing error handling
5. Verify all console.logs are removed
6. Test production build (npm run electron:preview)

Create a plan to optimize, then implement it.
```

---

## 🎓 Lessons Learned from Pinnacle

### What Worked Really Well

1. **Centralized Constants Early**
   - Prevented tech debt
   - Made refactoring easy
   - No typo bugs in localStorage keys

2. **Simple Chunk Strategy**
   - Don't over-optimize splitting
   - Bundle related dependencies together
   - Only separate truly lazy-loaded modules

3. **Feature-Based Folders**
   - Easy to find related code
   - Can delete entire features cleanly
   - Scales better than MVC structure

4. **StorageManager Abstraction**
   - Made switching storage methods possible
   - Consistent error handling
   - Type-safe JSON parsing

5. **Fade-Only Animations**
   - Less distracting than slide/scale
   - Performs better (GPU-accelerated opacity)
   - Feels more professional

### What to Avoid

1. **Too Many Chunks**
   - Causes loading order bugs
   - Minimal performance gain
   - Hard to debug

2. **Animation Overload**
   - Slide + scale + fade = too much
   - Users found it distracting
   - Simple is better

3. **Premature Optimization**
   - Build features first
   - Measure performance
   - Then optimize if needed

4. **Magic Strings Everywhere**
   - localStorage key typos caused bugs
   - Hard to refactor
   - No autocomplete

5. **No Loading States**
   - Users think app is frozen
   - Bad UX
   - Always show feedback

---

## 🚢 Production Release Checklist

### Pre-Release

```bash
# 1. Update version
# Edit package.json: "version": "X.Y.Z"

# 2. Update README with features
# Document all capabilities

# 3. Clean build
rm -rf dist dist-react node_modules package-lock.json
npm install
npm run build

# 4. Test production build
npm run electron:preview
# Test all features thoroughly

# 5. Build installer
npm run electron:build

# 6. Test installer
# Install the built app
# Verify version number
# Test all features again
```

### Release Notes Template

```markdown
## Version X.Y.Z

### ✨ New Features
- Feature 1 description
- Feature 2 description

### 🐛 Bug Fixes
- Fixed issue where...
- Resolved error when...

### ⚡ Performance
- Reduced bundle size by X%
- Improved startup time

### 🎨 UI/UX
- Simplified animations
- Better loading states
```

---

## 🎯 Quick Reference: Tell Claude Code...

### For New Projects
```
"Create an Electron + React app using the Pinnacle architecture.
Use Vite, Tailwind, Framer Motion, and Zustand.
Follow the project structure with constants/ and utils/ folders.
Implement storageManager from the start."
```

### For Adding Features
```
"Add [FEATURE] following the Pinnacle patterns:
- Feature-based component folders
- Use storageManager for data
- Add constants to config.js
- Include loading states
- Fade-only animations"
```

### For Optimization
```
"Optimize the app following the Pinnacle 6-phase approach:
1. Debug critical bugs
2. Performance (bundle size, lazy loading)
3. Code cleanup (DRY, remove console.logs)
4. Code quality (constants, utilities)
5. Create testing checklist
6. Write documentation"
```

### For Troubleshooting
```
"The app has [ISSUE]. Check these common Pinnacle fixes:
- React dependency loading order
- Missing IPC handlers
- localStorage merge vs overwrite
- Path issues in production build
- Animation performance"
```

---

## 📊 Success Metrics (Pinnacle Achieved)

- ✅ **Bundle Size**: 668KB → 270KB (60% reduction)
- ✅ **Startup Time**: < 2 seconds
- ✅ **UI Smoothness**: 60fps animations
- ✅ **Code Quality**: Centralized constants, DRY utilities
- ✅ **User Feedback**: "Really happy with how it turned out"
- ✅ **Production Ready**: Clean build, documented, tested

---

## 🔗 Resources

- **Vite**: https://vitejs.dev/
- **Electron**: https://www.electronjs.org/
- **Tailwind CSS**: https://tailwindcss.com/
- **Framer Motion**: https://www.framer.com/motion/
- **Zustand**: https://github.com/pmndrs/zustand
- **Electron Builder**: https://www.electron.build/

---

## 💡 Final Tips

1. **Start Simple**: Get one feature working perfectly before adding more
2. **Test in Production Mode Early**: `npm run electron:preview` catches issues
3. **Use Constants from Day 1**: Don't wait until refactoring
4. **Show Loading States**: Users need feedback
5. **Keep Animations Subtle**: Fade-only is usually enough
6. **Measure Before Optimizing**: Build size < 500KB is fine
7. **Document as You Go**: Future you will thank you

---

**This guide captures everything that made Pinnacle successful. Use it as a template for your Burnout Prevention app and any future projects!**
