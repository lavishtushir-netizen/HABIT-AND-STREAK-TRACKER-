# Habit & Streak Tracker 🏃

> **Developer:** Lavish Tushir  
> **GitHub Repository:** [https://github.com/lavishtushir-netizen/HABIT-AND-STREAK-TRACKER](https://github.com/lavishtushir-netizen/HABIT-AND-STREAK-TRACKER)

A clean, fast, offline-first web application designed to help users build enduring daily habits, level up their discipline, and visualize long-term consistency without paywalls or accounts.

---

## 🚀 How to Run in VS Code (Choose any 1 method)

### Method 1: VS Code Live Server Extension (Recommended & Easiest)
1. Open this folder in **VS Code**.
2. Right-click on [`index.html`](file:///Users/lavishtushir/Desktop/Habit%20&%20Streak%20Tracker/index.html).
3. Click **"Open with Live Server"**.
4. The app opens immediately at `http://127.0.0.1:5500/index.html`.

---

### Method 2: Single Terminal Command with `server.py`
1. Open the integrated terminal in VS Code (`Ctrl + ` ` or `Cmd + ` `).
2. Run:
   ```bash
   python3 server.py
   ```
3. Your browser will automatically launch at `http://localhost:3000`.

---

### Method 3: Direct Browser Launch (No server required!)
- Double-click [`index.html`](file:///Users/lavishtushir/Desktop/Habit%20&%20Streak%20Tracker/index.html) in your file explorer.
- Works 100% offline with `localStorage`.

---

## 🌟 Key Features Implemented

### 🎯 Core Features
1. **Create, Edit, and Delete Habits**:
   - Title, motivation description, category tags (*Health, Fitness, Learning, Mindfulness, Productivity, Lifestyle*), emoji picker, and color theme accents.
2. **Daily Check-In & Sound Synthesis**:
   - One-tap check-in with haptic visual toggle and Web Audio API synthesized chimes.
   - Milestone celebration confetti particle bursts.
3. **Automatic Streak Calculation Engine**:
   - **Current Streak**: Tracks consecutive days unbroken (handles today vs. yesterday check-ins, flexible frequencies, and midnight rollover).
   - **Best Streak**: Records all-time maximum consecutive days.
   - **Status Indicators**: 🔥 Active Streak, ⚠️ At-Risk (due today), and ❄️ Inactive/Shielded.
4. **Weekly Progress View**:
   - 7-day visual matrix showing check-in status for each habit.
   - Weekly completion rate percentages and animated progress bars.
5. **Local Notifications & Offline Data**:
   - HTML5 Web Notifications API + in-app toast alerts with gentle chimes.
   - Background scheduler comparing habit reminder times with local clock.
   - 100% offline persistence using `localStorage`.

### 🚀 Stretch & Advanced Features
1. **🏆 Gamification, XP & Trophy Room**:
   - **Level Ladder**: Level 1 (Novice) to Level 10 (Grandmaster of Discipline) with an animated header XP bar.
   - **8 Achievement Badges**: *First Step, Week on Fire, Flawless Day, Deep Focus, Shield Bearer, Early Bird, Night Owl, and Centurion*.
2. **🛡️ Streak Freeze Shields**:
   - Emergency freeze balance to protect streaks unbroken when unexpected life events or exams occur.
3. **⏱️ Integrated Focus & Pomodoro Timer**:
   - Circular SVG countdown timer with presets (25m Focus, 45m Deep Work, 5m/15m Breaks).
   - Link session to any habit for automatic check-off and `+30 XP` upon completion.
4. **📖 Habit Reflection Journal**:
   - Micro-reflections timeline for jotting down insights, energy levels, and mood emojis for each habit.
5. **📸 "Share My Streak" Graphic Card Generator**:
   - Canvas-based social card with Lavish Tushir's top streak, level, rank title, and stats.
   - 1-click **Download as PNG Image** ready for LinkedIn, Instagram stories, or presentation decks.
6. **📅 Flexible Target Frequencies**:
   - Set habits as **Daily** (7 days/wk), **Weekdays Only** (Mon–Fri), or **Weekends Only** (Sat–Sun).
7. **🎵 4 Synthesizer Sound Packs**:
   - *Modern Crisp Marimba*, *Retro 8-Bit Arcade*, *Zen Temple Bell*, and *Sci-Fi Cyber Chime*.
8. **💾 Cloud / JSON Backup & Restore**:
   - Export and restore all habits, streak history, XP, trophies, and journal entries in a single `.json` file.
9. **GitHub-Style Heatmap & Monthly Calendar**:
   - 18-week contribution activity heatmap + interactive monthly calendar with retroactive check-in.

---

## 📁 Project Architecture

```
Habit & Streak Tracker/
├── index.html            # Application layout, navigation tabs, and modals
├── css/
│   └── style.css         # Modern design system, themes, glassmorphism, responsive grid
├── js/
│   ├── streak.js         # Streak engine (flexible frequencies & freeze protection)
│   ├── storage.js        # Offline repository, JSON backup export/import
│   ├── notifications.js  # Notifications + 4 Web Audio API synthesizer packs
│   ├── gamification.js   # XP calculation, level progression & 8 trophies
│   ├── timer.js          # Circular Pomodoro timer & auto habit check
│   ├── journal.js        # Daily reflections timeline & mood logging
│   ├── share.js          # High-resolution Canvas social card & PNG download
│   ├── calendar.js       # GitHub-style activity heatmap & monthly calendar
│   └── app.js            # Master controller & event orchestrator
├── server.py             # Built-in lightweight Python dev server (port 3000)
├── package.json          # Node scripts definition
└── README.md             # Project documentation and instructions
```

---

## 🛠️ Tech Stack
- **Frontend**: HTML5, Modern CSS3 (CSS Variables, Glassmorphism, Flexbox, CSS Grid)
- **Logic & Storage**: Vanilla JavaScript (ES6+), `localStorage`, Web Audio API, Web Notifications API, HTML5 Canvas
- **Zero Heavy Dependencies**: Runs instantly without `npm install` or bundlers.
