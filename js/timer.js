/**
 * Habit & Streak Tracker - Focus & Pomodoro Timer Module
 * Developed by Lavish Tushir
 * 
 * Features:
 * - Circular SVG countdown progress timer
 * - Presets: Focus (25m), Deep Work (45m), Short Break (5m), Long Break (15m)
 * - Habit linking: auto-checks habit upon timer completion
 * - Awards +30 XP and unlocks 'Deep Focus' badge
 */

const FocusTimer = (() => {
  let mode = 'focus'; // 'focus' | 'deep' | 'short_break' | 'long_break'
  let totalSeconds = 25 * 60;
  let remainingSeconds = 25 * 60;
  let isRunning = false;
  let timerInterval = null;
  let linkedHabitId = null;

  const MODES = {
    focus: { name: 'Focus', minutes: 25 },
    deep: { name: 'Deep Work', minutes: 45 },
    short_break: { name: 'Short Break', minutes: 5 },
    long_break: { name: 'Long Break', minutes: 15 }
  };

  function setMode(newMode, customMinutes = null) {
    pause();
    mode = newMode;
    const minutes = customMinutes || MODES[newMode]?.minutes || 25;
    totalSeconds = minutes * 60;
    remainingSeconds = totalSeconds;
    updateDisplay();
  }

  function start() {
    if (isRunning) return;
    NotificationManager.getAudioContext();
    isRunning = true;

    timerInterval = setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        remainingSeconds = 0;
        pause();
        onTimerComplete();
      }
      updateDisplay();
    }, 1000);

    updateControlsUI();
  }

  function pause() {
    isRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    updateControlsUI();
  }

  function reset() {
    pause();
    const minutes = MODES[mode]?.minutes || 25;
    totalSeconds = minutes * 60;
    remainingSeconds = totalSeconds;
    updateDisplay();
  }

  function onTimerComplete() {
    NotificationManager.playCelebrationSound();
    if (window.App && typeof window.App.triggerConfetti === 'function') {
      window.App.triggerConfetti();
    }

    // Award XP
    GamificationEngine.addXP(30, 'Completed Pomodoro session');
    GamificationEngine.checkBadges({ pomodoroCompleted: true });

    // Auto-check linked habit if set
    if (linkedHabitId) {
      const todayStr = StreakEngine.getToday();
      const habit = StorageManager.getHabitById(linkedHabitId);
      if (habit) {
        const isAlreadyDone = Array.isArray(habit.completedDates) && habit.completedDates.includes(todayStr);
        if (!isAlreadyDone) {
          StorageManager.toggleHabitDate(linkedHabitId, todayStr);
          NotificationManager.showToast('Habit Checked Off! ✅', `"${habit.title}" was marked complete from your focus session!`, 'success', 5000);
        }
      }
    }

    NotificationManager.showToast(
      '🎉 Focus Session Complete!',
      'Great work! You stayed consistent and completed your timer session.',
      'success',
      6000
    );

    if (window.App && typeof window.App.render === 'function') {
      window.App.render();
    }
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateDisplay() {
    const timeDisplay = document.getElementById('timer-time-display');
    const ringFill = document.getElementById('timer-ring-fill');

    if (timeDisplay) {
      timeDisplay.textContent = formatTime(remainingSeconds);
    }

    if (ringFill && totalSeconds > 0) {
      const circum = 2 * Math.PI * 88; // radius 88 = ~552.92
      const progress = remainingSeconds / totalSeconds;
      const offset = circum * (1 - progress);
      ringFill.style.strokeDashoffset = offset;
    }
  }

  function updateControlsUI() {
    const playBtn = document.getElementById('timer-toggle-btn');
    if (playBtn) {
      playBtn.innerHTML = isRunning 
        ? '<span class="btn-icon">⏸️</span> Pause' 
        : '<span class="btn-icon">▶️</span> Start Focus';
    }
  }

  function renderTimerView(container) {
    if (!container) return;

    const habits = StorageManager.getHabits();
    const circum = 2 * Math.PI * 88;
    const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
    const offset = circum * (1 - progress);

    let html = `
      <div class="timer-card card-glass">
        <div class="timer-header">
          <div>
            <span class="focus-date-badge">Pomodoro Productivity</span>
            <h2 class="timer-title">Focus & Work Timer</h2>
            <p class="section-subtitle">Lock in your attention and automatically complete habits with bonus XP</p>
          </div>
          <div class="timer-reward-pill">
            <span>⚡ +30 XP per Session</span>
          </div>
        </div>

        <!-- MODE PRESET SELECTOR -->
        <div class="timer-mode-pills">
          <button class="timer-mode-btn ${mode === 'focus' ? 'active' : ''}" data-mode="focus">🎯 Focus (25m)</button>
          <button class="timer-mode-btn ${mode === 'deep' ? 'active' : ''}" data-mode="deep">⚡ Deep Work (45m)</button>
          <button class="timer-mode-btn ${mode === 'short_break' ? 'active' : ''}" data-mode="short_break">☕ Short Break (5m)</button>
          <button class="timer-mode-btn ${mode === 'long_break' ? 'active' : ''}" data-mode="long_break">🌴 Long Break (15m)</button>
        </div>

        <!-- LINK HABIT SELECTOR -->
        <div class="timer-link-group">
          <label class="timer-link-label">Link Session to Habit (Optional):</label>
          <select id="timer-habit-select" class="filter-select" style="min-width: 260px;">
            <option value="">-- No linked habit --</option>
            ${habits.map(h => `
              <option value="${h.id}" ${linkedHabitId === h.id ? 'selected' : ''}>
                ${h.emoji || '⚡'} ${h.title}
              </option>
            `).join('')}
          </select>
        </div>

        <!-- CIRCULAR COUNTDOWN RING -->
        <div class="timer-dial-wrapper">
          <div class="timer-circle-box">
            <svg class="timer-svg" viewBox="0 0 200 200" width="220" height="220">
              <circle class="timer-ring-bg" cx="100" cy="100" r="88" stroke-width="10" fill="none" />
              <circle id="timer-ring-fill" class="timer-ring-fill" cx="100" cy="100" r="88" 
                      stroke-width="10" fill="none"
                      transform="rotate(-90 100 100)"
                      stroke-dasharray="${circum}" 
                      style="stroke-dashoffset: ${offset};" />
            </svg>
            <div class="timer-center-text">
              <span id="timer-time-display" class="timer-digits">${formatTime(remainingSeconds)}</span>
              <span class="timer-mode-tag">${MODES[mode]?.name || 'Focus'}</span>
            </div>
          </div>
        </div>

        <!-- CONTROLS -->
        <div class="timer-action-buttons">
          <button id="timer-toggle-btn" class="btn btn-primary" style="padding: 12px 28px; font-size: 1rem;">
            ${isRunning ? '<span class="btn-icon">⏸️</span> Pause' : '<span class="btn-icon">▶️</span> Start Focus'}
          </button>
          <button id="timer-reset-btn" class="btn btn-secondary">
            <span class="btn-icon">🔄</span> Reset
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach listeners
    container.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newMode = btn.getAttribute('data-mode');
        setMode(newMode);
        renderTimerView(container);
      });
    });

    const habitSelect = document.getElementById('timer-habit-select');
    if (habitSelect) {
      habitSelect.addEventListener('change', (e) => {
        linkedHabitId = e.target.value || null;
      });
    }

    document.getElementById('timer-toggle-btn')?.addEventListener('click', () => {
      if (isRunning) pause();
      else start();
    });

    document.getElementById('timer-reset-btn')?.addEventListener('click', () => {
      reset();
    });
  }

  return {
    start,
    pause,
    reset,
    setMode,
    renderTimerView
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FocusTimer;
}
