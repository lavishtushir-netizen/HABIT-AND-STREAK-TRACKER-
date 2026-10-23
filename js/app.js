/**
 * Habit & Streak Tracker - Main Application Controller
 * Developed by Lavish Tushir
 * 
 * Features:
 * - View / Tab switching (Dashboard, Weekly, Heatmap/Calendar, Focus Timer, Trophy Room, Journal, Habits, Settings)
 * - Gamification & XP rewards on habit check-ins and streaks
 * - Streak Freeze Shield activation
 * - Focus & Pomodoro Timer integration
 * - Daily reflection notes & journal timeline
 * - Shareable Canvas streak card generator
 * - Lightweight canvas confetti particle celebration
 * - Filters by category, status, and search query
 */

const App = (() => {
  // State
  let currentTab = 'dashboard';
  let activeCategoryFilter = 'ALL';
  let activeStatusFilter = 'ALL';
  let searchQuery = '';
  let editingHabitId = null;

  const MOTIVATIONAL_QUOTES = [
    { quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
    { quote: "Small disciplines repeated with consistency every day lead to great achievements.", author: "John C. Maxwell" },
    { quote: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear (Atomic Habits)" },
    { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { quote: "Don't break the chain. Every consecutive day makes you stronger.", author: "Jerry Seinfeld" },
    { quote: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" }
  ];

  /**
   * Initialize App on DOM Ready
   */
  function init() {
    setupTheme();
    setupNavigation();
    setupModals();
    setupLoginSystem();
    setupBackupHandlers();
    setupCanvasConfetti();

    // Start background notification scheduler
    NotificationManager.startReminderScheduler();

    // Check badges on startup
    GamificationEngine.checkBadges();

    // Check if user is logged in
    const currentUser = (typeof StorageManager !== 'undefined' && StorageManager.getCurrentUser) ? StorageManager.getCurrentUser() : null;
    if (!currentUser || !currentUser.name) {
      showLoginScreen();
    } else {
      hideLoginScreen();
      render();
    }

    // Setup periodic midnight date rollover checker (every 10 minutes)
    let lastCheckedDate = StreakEngine.getToday();
    setInterval(() => {
      const currentDate = StreakEngine.getToday();
      if (currentDate !== lastCheckedDate) {
        lastCheckedDate = currentDate;
        const loggedUser = StorageManager.getCurrentUser();
        if (loggedUser && loggedUser.name) {
          render();
        }
      }
    }, 600000);
  }

  /**
   * Theme Initialization & Toggle
   */
  function setupTheme() {
    const savedTheme = StorageManager.getTheme();
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleUI(savedTheme);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        StorageManager.setTheme(next);
        updateThemeToggleUI(next);
      });
    }
  }

  function updateThemeToggleUI(theme) {
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    if (label) label.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }

  /**
   * Tab Navigation
   */
  function setupNavigation() {
    const navItems = document.querySelectorAll('[data-nav-tab]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-nav-tab');
        switchTab(tab);
      });
    });
  }

  function switchTab(tabName) {
    if (tabName === 'trophies' || !tabName) tabName = 'dashboard';
    currentTab = tabName;
    document.querySelectorAll('[data-nav-tab]').forEach(item => {
      if (item.getAttribute('data-nav-tab') === tabName) {
        item.classList.add('nav-active');
      } else {
        item.classList.remove('nav-active');
      }
    });

    document.querySelectorAll('.tab-view').forEach(view => {
      if (view.id === `view-${tabName}`) {
        view.classList.add('view-active');
      } else {
        view.classList.remove('view-active');
      }
    });

    render();
  }

  /**
   * Master render method: updates view based on active tab
   */
  function render() {
    const habits = StorageManager.getHabits();

    // Update global badge counters & XP widget
    updateHeaderStats(habits);

    if (currentTab === 'dashboard') {
      renderDashboard(habits);
    } else if (currentTab === 'weekly') {
      renderWeeklyView(habits);
    } else if (currentTab === 'analytics') {
      renderAnalyticsView(habits);
    } else if (currentTab === 'timer') {
      FocusTimer.renderTimerView(document.getElementById('timer-content'));
    } else if (currentTab === 'journal') {
      JournalModule.renderJournalTimeline(document.getElementById('journal-content'));
    } else if (currentTab === 'habits') {
      renderHabitsManagement(habits);
    } else if (currentTab === 'settings') {
      renderSettingsView(habits);
    }
  }

  /**
   * Header Quick Stats & Gamification
   */
  function updateHeaderStats(habits) {
    const todayStr = StreakEngine.getToday();
    let totalCompletedToday = 0;
    let totalStreaks = 0;
    let maxBestStreak = 0;

    habits.forEach(h => {
      const streakInfo = StreakEngine.calculate(h.completedDates, todayStr, h.frequency, h.frozenDates);
      if (streakInfo.isCompletedToday) totalCompletedToday++;
      totalStreaks += streakInfo.currentStreak;
      if (streakInfo.bestStreak > maxBestStreak) maxBestStreak = streakInfo.bestStreak;
    });

    const todayProgressEl = document.getElementById('stat-today-done');
    const totalHabitsEl = document.getElementById('stat-total-habits');
    const totalStreaksEl = document.getElementById('stat-total-streaks');

    if (todayProgressEl) todayProgressEl.textContent = `${totalCompletedToday}/${habits.length}`;
    if (totalHabitsEl) totalHabitsEl.textContent = habits.length;
    if (totalStreaksEl) totalStreaksEl.textContent = `${totalStreaks} 🔥`;

    const currentUser = (typeof StorageManager !== 'undefined' && StorageManager.getCurrentUser) ? StorageManager.getCurrentUser() : null;
    const nameEl = document.getElementById('header-user-name');
    if (nameEl) {
      nameEl.textContent = (currentUser && currentUser.name) ? currentUser.name : 'Guest';
    }

    GamificationEngine.updateHeaderGamification();
  }

  /**
   * 1. DASHBOARD VIEW (Today's Focus & Daily Check-ins)
   */
  function renderDashboard(habits) {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    const todayStr = StreakEngine.getToday();
    const todayDate = new Date();
    const dateFormatted = todayDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Greeting
    const hour = todayDate.getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17) greeting = 'Good evening';

    // Quote
    const quoteObj = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

    // Active User
    const currentUser = (typeof StorageManager !== 'undefined' && StorageManager.getCurrentUser) ? StorageManager.getCurrentUser() : null;
    const displayName = currentUser && currentUser.name ? currentUser.name : 'Guest';
    const firstName = displayName.split(' ')[0] || 'Friend';

    // Stats for today
    let completedToday = 0;
    const enrichedHabits = habits.map(h => {
      const streakInfo = StreakEngine.calculate(h.completedDates, todayStr, h.frequency, h.frozenDates);
      if (streakInfo.isCompletedToday) completedToday++;
      return { ...h, streakInfo };
    });

    const completionRate = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;
    const allDone = habits.length > 0 && completedToday === habits.length;

    // Filter habits according to active filters & search
    let filteredHabits = enrichedHabits;
    if (activeCategoryFilter !== 'ALL') {
      filteredHabits = filteredHabits.filter(h => h.category.toUpperCase() === activeCategoryFilter);
    }
    if (activeStatusFilter === 'PENDING') {
      filteredHabits = filteredHabits.filter(h => !h.streakInfo.isCompletedToday);
    } else if (activeStatusFilter === 'COMPLETED') {
      filteredHabits = filteredHabits.filter(h => h.streakInfo.isCompletedToday);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredHabits = filteredHabits.filter(h => 
        h.title.toLowerCase().includes(q) || (h.description && h.description.toLowerCase().includes(q))
      );
    }

    let html = `
      <!-- MINIMALIST HERO GREETING & PROGRESS -->
      <div class="minimal-dashboard-hero card-glass">
        <div class="minimal-hero-top">
          <div class="minimal-hero-text">
            <div class="minimal-date-badge">${dateFormatted}</div>
            <h2 class="minimal-greeting">${greeting}, ${escapeHtml(firstName)}! 👋</h2>
            <p class="minimal-quote">“${quoteObj.quote}” <span class="quote-author">— ${quoteObj.author}</span></p>
          </div>

          <div class="minimal-hero-actions">
            <!-- Circular Progress Indicator -->
            <div class="focus-circle-wrapper" title="${completedToday} of ${habits.length} habits completed">
              <svg class="progress-ring" viewBox="0 0 100 100" width="84" height="84">
                <circle class="progress-ring-bg" cx="50" cy="50" r="38"/>
                <circle class="progress-ring-fill" cx="50" cy="50" r="38"
                        transform="rotate(-90 50 50)"
                        stroke-dasharray="238.76" 
                        stroke-dashoffset="${238.76 - (238.76 * completionRate) / 100}"/>
              </svg>
              <div class="focus-circle-label">
                <span class="percent-num" style="font-size: 1.15rem;">${completionRate}%</span>
                <span class="percent-sub">Done</span>
              </div>
            </div>

            <div class="minimal-btn-stack">
              <button class="btn btn-primary btn-sm" id="btn-dashboard-new-habit" title="Create a new habit">
                <span class="btn-icon">+</span> New Habit
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-dashboard-share" title="Share your progress">
                <span>📸 Share</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Sleek Completion Bar & Summary -->
        <div class="minimal-progress-summary">
          <div class="minimal-progress-bar-track">
            <div class="minimal-progress-bar-fill" style="width: ${completionRate}%;"></div>
          </div>
          <div class="minimal-progress-meta">
            <span class="meta-count"><strong>${completedToday} of ${habits.length}</strong> completed</span>
            <span class="meta-status ${allDone ? 'status-all-done' : ''}">
              ${allDone ? '🎉 All done for today!' : `${habits.length - completedToday} remaining today`}
            </span>
          </div>
        </div>
      </div>

      <!-- VOICE AI CHECK-IN HERO BANNER -->
      <div class="voice-checkin-banner card-glass" id="btn-hero-voice-trigger" role="button" tabindex="0" title="Click to check in with voice">
        <div class="voice-banner-left">
          <div class="voice-banner-mic-circle">
            <span class="voice-banner-mic-icon">🎙️</span>
          </div>
          <div class="voice-banner-text">
            <div class="voice-banner-badge">Voice AI Assistant</div>
            <h3 class="voice-banner-title">Speak to Check In</h3>
            <p class="voice-banner-sub">Say what you did (e.g. <em>“I drank 2L water and coded 45m”</em>) — AI marks habits & confirms with spoken voice!</p>
          </div>
        </div>
        <div class="voice-banner-right">
          <button type="button" class="btn btn-voice-action" id="btn-hero-voice-listen">
            <span>Tap to Speak 🎙️</span>
          </button>
        </div>
      </div>

      <!-- FILTER & STATUS BAR -->
      <div class="minimal-filter-bar">
        <div class="status-pills">
          <button class="status-pill ${activeStatusFilter === 'ALL' ? 'active' : ''}" data-status="ALL">All (${enrichedHabits.length})</button>
          <button class="status-pill ${activeStatusFilter === 'PENDING' ? 'active' : ''}" data-status="PENDING">Pending (${enrichedHabits.filter(h => !h.streakInfo.isCompletedToday).length})</button>
          <button class="status-pill ${activeStatusFilter === 'COMPLETED' ? 'active' : ''}" data-status="COMPLETED">Completed (${completedToday})</button>
        </div>

        ${habits.length > 3 ? `
          <div class="search-box-minimal">
            <span class="search-icon">🔍</span>
            <input type="text" id="habit-search-input" placeholder="Quick search..." value="${searchQuery}">
            ${searchQuery ? `<button id="search-clear-btn" class="search-clear">&times;</button>` : ''}
          </div>
        ` : ''}
      </div>

      <!-- CARDS LIST -->
      <div class="habits-checkin-list">
    `;

    if (filteredHabits.length === 0) {
      html += `
        <div class="empty-state card-glass" style="padding: 36px 20px;">
          <div class="empty-emoji" style="font-size: 2.4rem;">🌱</div>
          <h4>No habits to show</h4>
          <p style="color: var(--text-secondary); max-width: 400px; margin: 8px auto 16px;">
            ${searchQuery || activeStatusFilter !== 'ALL' ? 'No habits match your active filter.' : 'Zero setup required! Click + New Habit or use Voice Check-in to start in seconds.'}
          </p>
          <button class="btn btn-primary" id="btn-empty-add">+ Add Your First Habit</button>
        </div>
      `;
    } else {
      filteredHabits.forEach(habit => {
        const isDone = habit.streakInfo.isCompletedToday;
        const streak = habit.streakInfo.currentStreak;
        const best = habit.streakInfo.bestStreak;
        const status = habit.streakInfo.status;

        let streakBadgeClass = 'streak-zero';
        let streakBadgeIcon = '❄️';
        let streakBadgeText = `${streak}d streak`;

        if (status === 'active') {
          streakBadgeClass = 'streak-fire';
          streakBadgeIcon = '🔥';
          streakBadgeText = `${streak}d streak`;
        } else if (status === 'at_risk') {
          streakBadgeClass = 'streak-warning';
          streakBadgeIcon = '⚠️';
          streakBadgeText = `${streak}d (Due Today!)`;
        } else if (status === 'frozen') {
          streakBadgeClass = 'streak-zero';
          streakBadgeIcon = '❄️';
          streakBadgeText = `${streak}d (Shielded)`;
        }

        html += `
          <div class="habit-checkin-card card-glass ${isDone ? 'habit-card-done' : ''}" 
               style="--accent-color: ${habit.color || '#6366f1'}"
               data-habit-id="${habit.id}">
            
            <div class="checkin-btn-wrapper">
              <button class="habit-check-toggle ${isDone ? 'checked' : ''}" 
                      data-check-id="${habit.id}" 
                      title="${isDone ? 'Mark as incomplete' : 'Mark as done for today'}"
                      aria-label="Toggle ${habit.title}">
                <span class="check-icon">✓</span>
              </button>
            </div>

            <div class="habit-card-info">
              <div class="habit-header-row">
                <span class="habit-emoji-badge" style="background: ${habit.color}22; color: ${habit.color}">
                  ${habit.emoji || '⚡'}
                </span>
                <span class="habit-category-tag">${habit.category}</span>
                ${habit.frequency && habit.frequency !== 'daily' ? `
                  <span class="habit-reminder-pill" title="Target Frequency">
                    📅 ${habit.frequency === 'weekdays' ? 'Weekdays' : (habit.frequency === 'weekends' ? 'Weekends' : '3x/wk')}
                  </span>
                ` : ''}
                ${habit.reminderEnabled && habit.reminderTime ? `
                  <span class="habit-reminder-pill" title="Daily reminder at ${habit.reminderTime}">
                    ⏰ ${habit.reminderTime}
                  </span>
                ` : ''}
              </div>

              <h4 class="habit-card-title ${isDone ? 'title-crossed' : ''}">${escapeHtml(habit.title)}</h4>
              ${habit.description ? `<p class="habit-card-desc">${escapeHtml(habit.description)}</p>` : ''}

              <div class="habit-card-footer">
                <div class="streak-badge ${streakBadgeClass}">
                  <span class="streak-icon">${streakBadgeIcon}</span>
                  <span class="streak-text">${streakBadgeText}</span>
                </div>
                <div class="best-streak-tag" title="Best streak all-time">
                  🏆 Best: <strong>${best}d</strong>
                </div>
                <div class="total-checkins-tag" title="Total check-ins">
                  ✓ Total: ${habit.streakInfo.totalCompleted}
                </div>

                <!-- Emergency Freeze Button if at-risk -->
                ${status === 'at_risk' ? `
                  <button class="btn btn-sm btn-secondary btn-freeze-streak" data-freeze-habit="${habit.id}" title="Use an emergency freeze shield to protect this streak">
                    ❄️ Freeze Streak
                  </button>
                ` : ''}
              </div>
            </div>

            <div class="habit-card-actions">
              <button class="icon-action-btn btn-add-note" data-note-habit-id="${habit.id}" title="Write Daily Reflection Note">📝</button>
              <button class="icon-action-btn btn-focus-timer" data-timer-habit-id="${habit.id}" title="Focus on this habit with Timer">⏱️</button>
              <button class="icon-action-btn btn-edit-habit" data-edit-id="${habit.id}" title="Edit Habit">✏️</button>
              <button class="icon-action-btn btn-delete-habit" data-delete-id="${habit.id}" title="Delete Habit">🗑️</button>
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    container.innerHTML = html;

    attachDashboardListeners();
  }

  function attachDashboardListeners() {
    document.getElementById('btn-dashboard-new-habit')?.addEventListener('click', () => openHabitModal());
    document.getElementById('btn-add-habit-quick')?.addEventListener('click', () => openHabitModal());
    document.getElementById('btn-empty-add')?.addEventListener('click', () => openHabitModal());

    // Voice hero button & banner triggers
    const triggerVoice = (e) => {
      e.stopPropagation();
      if (typeof VoiceAssistant !== 'undefined') {
        VoiceAssistant.openVoiceModal();
      }
    };
    document.getElementById('btn-hero-voice-trigger')?.addEventListener('click', triggerVoice);
    document.getElementById('btn-hero-voice-listen')?.addEventListener('click', triggerVoice);

    // Share button
    document.getElementById('btn-dashboard-share')?.addEventListener('click', () => {
      ShareCardModule.openShareModal();
    });

    // Check-in toggle
    document.querySelectorAll('[data-check-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-check-id');
        toggleHabitToday(id);
      });
    });

    // Freeze streak button
    document.querySelectorAll('[data-freeze-habit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-freeze-habit');
        GamificationEngine.useStreakFreeze(id);
      });
    });

    // Add note button
    document.querySelectorAll('[data-note-habit-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-note-habit-id');
        JournalModule.openJournalModal(id);
      });
    });

    // Focus timer button
    document.querySelectorAll('[data-timer-habit-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchTab('timer');
      });
    });

    // Edit habit
    document.querySelectorAll('[data-edit-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-edit-id');
        openHabitModal(id);
      });
    });

    // Delete habit
    document.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-delete-id');
        confirmDeleteHabit(id);
      });
    });

    // Search input
    const searchInput = document.getElementById('habit-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
        const newSearch = document.getElementById('habit-search-input');
        if (newSearch) {
          newSearch.focus();
          newSearch.selectionStart = newSearch.selectionEnd = newSearch.value.length;
        }
      });
    }

    document.getElementById('search-clear-btn')?.addEventListener('click', () => {
      searchQuery = '';
      render();
    });

    const catSelect = document.getElementById('category-filter-select');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        activeCategoryFilter = e.target.value;
        render();
      });
    }

    document.querySelectorAll('.status-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        activeStatusFilter = pill.getAttribute('data-status');
        render();
      });
    });
  }

  /**
   * Toggle habit completion for today with XP & Badge checks
   */
  function toggleHabitToday(habitId) {
    NotificationManager.getAudioContext();
    const todayStr = StreakEngine.getToday();
    const result = StorageManager.toggleHabitDate(habitId, todayStr);
    if (!result) return;

    if (result.isCompleted) {
      NotificationManager.playCheckinSound();

      // Award XP
      GamificationEngine.addXP(20, `Completed "${result.habit.title}"`);
      GamificationEngine.checkBadges();

      NotificationManager.showToast(
        `Checked off: ${result.habit.title}!`,
        result.streakInfo.currentStreak > 1 
          ? `🔥 Current streak: ${result.streakInfo.currentStreak} days in a row!` 
          : 'Great job starting your streak today!',
        'streak'
      );

      // Flawless day check
      const habits = StorageManager.getHabits();
      const allCompleted = habits.length > 0 && habits.every(h => 
        Array.isArray(h.completedDates) && h.completedDates.includes(todayStr)
      );

      if (allCompleted) {
        setTimeout(() => {
          NotificationManager.playCelebrationSound();
          triggerConfetti();
          GamificationEngine.addXP(50, 'Flawless Day completed! 🏆');
          GamificationEngine.checkBadges({ flawlessDay: true });
          NotificationManager.showToast('Flawless Day Achieved! 🏆', 'All habits for today are 100% completed! (+50 XP)', 'success', 6000);
        }, 400);
      } else if (result.streakInfo.currentStreak % 7 === 0 && result.streakInfo.currentStreak > 0) {
        triggerConfetti();
        NotificationManager.playCelebrationSound();
      }
    } else {
      NotificationManager.showToast('Unchecked', `${result.habit.title} marked incomplete for today.`, 'info', 2500);
    }

    render();
  }

  /**
   * 2. WEEKLY PROGRESS VIEW
   */
  function renderWeeklyView(habits) {
    const container = document.getElementById('weekly-content');
    if (!container) return;

    const weekDays = StreakEngine.getCurrentWeekDates();
    const todayStr = StreakEngine.getToday();

    let totalPossibleCompletions = habits.length * 7;
    let actualWeeklyCompletions = 0;

    const habitWeeklyRows = habits.map(habit => {
      const completedDatesSet = new Set(habit.completedDates || []);
      const frozenDatesSet = new Set(habit.frozenDates || []);
      let habitWeeklyCount = 0;

      const dayStatuses = weekDays.map(day => {
        const isCompleted = completedDatesSet.has(day.dateStr);
        const isFrozen = frozenDatesSet.has(day.dateStr);
        const isPastOrToday = day.dateStr <= todayStr;
        if (isCompleted || isFrozen) {
          habitWeeklyCount++;
          actualWeeklyCompletions++;
        }
        return {
          ...day,
          isCompleted,
          isFrozen,
          isPastOrToday
        };
      });

      const weeklyPercent = Math.round((habitWeeklyCount / 7) * 100);
      const streakInfo = StreakEngine.calculate(habit.completedDates, todayStr, habit.frequency, habit.frozenDates);

      return {
        habit,
        dayStatuses,
        habitWeeklyCount,
        weeklyPercent,
        streakInfo
      };
    });

    const overallWeeklyRate = totalPossibleCompletions > 0 
      ? Math.round((actualWeeklyCompletions / totalPossibleCompletions) * 100) 
      : 0;

    let html = `
      <div class="weekly-summary-card card-glass">
        <div class="weekly-hero-header">
          <div>
            <span class="focus-date-badge">7-Day Analysis</span>
            <h2 class="weekly-title">This Week's Performance</h2>
            <p class="section-subtitle">Consistent daily check-ins from Monday through Sunday</p>
          </div>
          <div class="weekly-score-box">
            <span class="weekly-big-percent">${overallWeeklyRate}%</span>
            <span class="weekly-score-sub">${actualWeeklyCompletions} / ${totalPossibleCompletions} Checks</span>
          </div>
        </div>

        <div class="weekly-progress-bar-container">
          <div class="weekly-progress-bar-fill" style="width: ${overallWeeklyRate}%"></div>
        </div>
      </div>

      <div class="weekly-matrix-card card-glass">
        <div class="matrix-header-row">
          <div class="matrix-habit-col">Habit</div>
          <div class="matrix-days-col">
            ${weekDays.map(d => `
              <div class="matrix-day-header ${d.isToday ? 'is-today-col' : ''}">
                <span class="matrix-day-name">${d.dayName}</span>
                <span class="matrix-day-num">${d.dayNumber}</span>
              </div>
            `).join('')}
          </div>
          <div class="matrix-rate-col">Progress</div>
        </div>

        <div class="matrix-body">
    `;

    if (habitWeeklyRows.length === 0) {
      html += `
        <div class="empty-state">
          <p>No habits to display. Add habits to view your weekly progress!</p>
        </div>
      `;
    } else {
      habitWeeklyRows.forEach(row => {
        html += `
          <div class="matrix-row" style="--accent-color: ${row.habit.color || '#6366f1'}">
            <div class="matrix-habit-col">
              <span class="matrix-emoji">${row.habit.emoji || '✨'}</span>
              <div class="matrix-habit-name-group">
                <span class="matrix-habit-name">${escapeHtml(row.habit.title)}</span>
                <span class="matrix-habit-streak">🔥 ${row.streakInfo.currentStreak}d streak</span>
              </div>
            </div>

            <div class="matrix-days-col">
              ${row.dayStatuses.map(d => `
                <button class="matrix-check-pill ${d.isCompleted ? 'pill-completed' : (d.isFrozen ? 'pill-completed' : '')} ${d.isToday ? 'pill-is-today' : ''} ${!d.isPastOrToday ? 'pill-future' : ''}"
                        data-toggle-id="${row.habit.id}" 
                        data-toggle-date="${d.dateStr}"
                        title="${d.isCompleted ? 'Done on ' + d.dateStr : (d.isFrozen ? 'Frozen on ' + d.dateStr : 'Incomplete')}">
                  ${d.isCompleted ? '✓' : (d.isFrozen ? '❄️' : (d.isPastOrToday ? '—' : '·'))}
                </button>
              `).join('')}
            </div>

            <div class="matrix-rate-col">
              <div class="matrix-pct-label">${row.habitWeeklyCount}/7 (${row.weeklyPercent}%)</div>
              <div class="matrix-bar">
                <div class="matrix-bar-fill" style="width: ${row.weeklyPercent}%"></div>
              </div>
            </div>
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

    container.querySelectorAll('[data-toggle-id]').forEach(pill => {
      pill.addEventListener('click', () => {
        const hId = pill.getAttribute('data-toggle-id');
        const dateStr = pill.getAttribute('data-toggle-date');
        NotificationManager.getAudioContext();
        const res = StorageManager.toggleHabitDate(hId, dateStr);
        if (res && res.isCompleted) {
          NotificationManager.playCheckinSound();
          GamificationEngine.addXP(20, 'Logged check-in');
          GamificationEngine.checkBadges();
        }
        render();
      });
    });
  }

  /**
   * 3. ANALYTICS, HEATMAP & CALENDAR VIEW
   */
  function renderAnalyticsView(habits) {
    const heatmapContainer = document.getElementById('heatmap-container');
    const calendarContainer = document.getElementById('calendar-container');

    if (heatmapContainer) {
      CalendarModule.renderHeatmap(heatmapContainer, habits);
    }
    if (calendarContainer) {
      CalendarModule.renderCalendar(calendarContainer, habits);
    }

    const leaderboardContainer = document.getElementById('streak-leaderboard-container');
    if (leaderboardContainer) {
      const todayStr = StreakEngine.getToday();
      const sortedHabits = habits
        .map(h => ({ ...h, streakInfo: StreakEngine.calculate(h.completedDates, todayStr, h.frequency, h.frozenDates) }))
        .sort((a, b) => b.streakInfo.currentStreak - a.streakInfo.currentStreak);

      let lbHtml = `
        <div class="card-glass leaderboard-card">
          <h3 class="section-title">🔥 Streak Leaderboard</h3>
          <div class="leaderboard-list">
      `;

      if (sortedHabits.length === 0) {
        lbHtml += `<p class="empty-state">No habits created yet.</p>`;
      } else {
        sortedHabits.forEach((h, index) => {
          let rankMedal = `#${index + 1}`;
          if (index === 0) rankMedal = '🥇';
          else if (index === 1) rankMedal = '🥈';
          else if (index === 2) rankMedal = '🥉';

          lbHtml += `
            <div class="leaderboard-item">
              <span class="lb-rank">${rankMedal}</span>
              <span class="lb-emoji">${h.emoji || '✨'}</span>
              <div class="lb-info">
                <span class="lb-title">${escapeHtml(h.title)}</span>
                <span class="lb-meta">${h.category} · Frequency: ${h.frequency || 'Daily'}</span>
              </div>
              <div class="lb-streak">
                <span class="lb-fire">🔥 ${h.streakInfo.currentStreak} Days</span>
                <span class="lb-best">(Best: ${h.streakInfo.bestStreak}d)</span>
              </div>
            </div>
          `;
        });
      }

      lbHtml += `
          </div>
        </div>
      `;
      leaderboardContainer.innerHTML = lbHtml;
    }
  }

  /**
   * 4. HABITS MANAGEMENT VIEW (CRUD)
   */
  function renderHabitsManagement(habits) {
    const container = document.getElementById('habits-management-list');
    if (!container) return;

    const todayStr = StreakEngine.getToday();
    let html = '';
    if (habits.length === 0) {
      html = `
        <div class="empty-state card-glass">
          <div class="empty-emoji">📝</div>
          <h4>No habits yet</h4>
          <p>Create habits to track your daily routines and streaks.</p>
          <button class="btn btn-primary" id="btn-add-habit-manage">+ Add Habit</button>
        </div>
      `;
    } else {
      habits.forEach(habit => {
        const streakInfo = StreakEngine.calculate(habit.completedDates, todayStr, habit.frequency, habit.frozenDates);
        html += `
          <div class="habit-manage-card card-glass" style="--accent-color: ${habit.color}">
            <div class="manage-card-left">
              <span class="manage-emoji" style="background: ${habit.color}22; color: ${habit.color}">
                ${habit.emoji || '⚡'}
              </span>
              <div class="manage-details">
                <div class="manage-title-row">
                  <h4 class="manage-title">${escapeHtml(habit.title)}</h4>
                  <span class="habit-category-tag">${habit.category}</span>
                  <span class="habit-reminder-pill">📅 ${habit.frequency === 'weekdays' ? 'Weekdays' : (habit.frequency === 'weekends' ? 'Weekends' : 'Daily')}</span>
                </div>
                ${habit.description ? `<p class="manage-desc">${escapeHtml(habit.description)}</p>` : ''}
                <div class="manage-meta-row">
                  <span>🔥 Current: <strong>${streakInfo.currentStreak}d</strong></span>
                  <span>🏆 Best: <strong>${streakInfo.bestStreak}d</strong></span>
                  <span>✓ Total: <strong>${streakInfo.totalCompleted}</strong></span>
                  ${habit.reminderEnabled && habit.reminderTime ? `<span>⏰ Reminder: <strong>${habit.reminderTime}</strong></span>` : '<span>⏰ Reminders off</span>'}
                </div>
              </div>
            </div>

            <div class="manage-card-actions">
              ${habit.reminderEnabled && habit.reminderTime ? `
                <button class="btn btn-secondary btn-sm btn-test-habit-notif" data-habit-id="${habit.id}" title="Test alert">
                  🔔 Test Alert
                </button>
              ` : ''}
              <button class="btn btn-secondary btn-sm btn-edit-habit" data-edit-id="${habit.id}">
                ✏️ Edit
              </button>
              <button class="btn btn-danger btn-sm btn-delete-habit" data-delete-id="${habit.id}">
                🗑️ Delete
              </button>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = html;

    document.getElementById('btn-add-habit-manage')?.addEventListener('click', () => openHabitModal());
    document.getElementById('btn-add-habit-top')?.addEventListener('click', () => openHabitModal());

    container.querySelectorAll('.btn-edit-habit').forEach(btn => {
      btn.addEventListener('click', () => openHabitModal(btn.getAttribute('data-edit-id')));
    });

    container.querySelectorAll('.btn-delete-habit').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteHabit(btn.getAttribute('data-delete-id')));
    });

    container.querySelectorAll('.btn-test-habit-notif').forEach(btn => {
      btn.addEventListener('click', () => {
        const habit = StorageManager.getHabitById(btn.getAttribute('data-habit-id'));
        if (habit) NotificationManager.testReminder(habit);
      });
    });
  }

  /**
   * 5. SETTINGS VIEW & SOUND PACKS
   */
  function renderSettingsView(habits) {
    const settings = StorageManager.getSettings();

    const soundCheckbox = document.getElementById('setting-sound-toggle');
    const notifStatusEl = document.getElementById('notif-permission-status');

    if (soundCheckbox) {
      soundCheckbox.checked = settings.soundEnabled;
    }

    // Set active sound pack radio
    document.querySelectorAll('input[name="sound-pack-radio"]').forEach(radio => {
      radio.checked = radio.value === (settings.soundPack || 'marimba');
    });

    if (notifStatusEl && ('Notification' in window)) {
      notifStatusEl.textContent = `Status: ${Notification.permission}`;
    }

    // Active User Profile Display in Settings
    const currentUser = (typeof StorageManager !== 'undefined' && StorageManager.getCurrentUser) ? StorageManager.getCurrentUser() : null;
    const nameDisplay = document.getElementById('settings-user-display-name');
    const emailDisplay = document.getElementById('settings-user-display-email');
    if (nameDisplay) {
      nameDisplay.textContent = (currentUser && currentUser.name) ? currentUser.name : 'Guest User';
    }
    if (emailDisplay) {
      const details = [];
      if (currentUser && currentUser.age) details.push(`Age: ${currentUser.age}`);
      if (currentUser && currentUser.email) details.push(currentUser.email);
      emailDisplay.textContent = details.length > 0 ? details.join(' • ') : 'Personalized local tracker session';
    }
  }

  /**
   * Login & User Identity System
   */
  function setupLoginSystem() {
    const loginForm = document.getElementById('login-form');
    const nameInput = document.getElementById('login-name-input');
    const ageInput = document.getElementById('login-age-input');
    const emailInput = document.getElementById('login-email-input');
    const quickBtn = document.getElementById('btn-quick-login-guest') || document.getElementById('btn-quick-login-lavish');
    const logoutBtn = document.getElementById('btn-header-logout');
    const settingsSwitchBtn = document.getElementById('btn-settings-switch-user');

    loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput?.value.trim();
      const ageVal = ageInput?.value.trim();
      const age = parseInt(ageVal, 10);
      const email = emailInput?.value.trim() || '';

      if (!name) {
        NotificationManager.showToast('Name Required', 'Please enter your name.', 'warning');
        nameInput?.focus();
        return;
      }

      if (!ageVal || isNaN(age) || age < 1 || age > 120) {
        NotificationManager.showToast('Age Required', 'Please enter a valid age between 1 and 120.', 'warning');
        ageInput?.focus();
        return;
      }

      StorageManager.setCurrentUser({ name, age, email });
      NotificationManager.showToast('Welcome!', `Logged in as ${name}`, 'success');
      NotificationManager.playCheckinSound();
      hideLoginScreen();
      render();
    });

    quickBtn?.addEventListener('click', () => {
      StorageManager.setCurrentUser({ name: 'Guest User', age: 25, email: '' });
      NotificationManager.showToast('Welcome!', 'Logged in as Guest', 'success');
      NotificationManager.playCheckinSound();
      hideLoginScreen();
      render();
    });

    const handleLogout = () => {
      StorageManager.clearCurrentUser();
      NotificationManager.showToast('Signed Out', 'You can now enter with another name.', 'info');
      showLoginScreen();
    };

    logoutBtn?.addEventListener('click', handleLogout);
    settingsSwitchBtn?.addEventListener('click', handleLogout);
  }

  function showLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    const appLayout = document.querySelector('.app-layout');
    if (loginScreen) {
      loginScreen.style.display = 'flex';
      loginScreen.classList.remove('login-fade-out');
      const nameInput = document.getElementById('login-name-input');
      const ageInput = document.getElementById('login-age-input');
      const emailInput = document.getElementById('login-email-input');
      if (nameInput) nameInput.value = '';
      if (ageInput) ageInput.value = '';
      if (emailInput) emailInput.value = '';
      setTimeout(() => nameInput?.focus(), 150);
    }
    if (appLayout) {
      appLayout.style.display = 'none';
    }
  }

  function hideLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    const appLayout = document.querySelector('.app-layout');
    if (loginScreen) {
      loginScreen.classList.add('login-fade-out');
      setTimeout(() => {
        loginScreen.style.display = 'none';
      }, 300);
    }
    if (appLayout) {
      appLayout.style.display = 'flex';
    }
  }

  function setupBackupHandlers() {
    // Header Share Button
    document.getElementById('btn-header-share')?.addEventListener('click', () => {
      ShareCardModule.openShareModal();
    });

    // Share Card Download PNG
    document.getElementById('btn-download-share-card')?.addEventListener('click', () => {
      ShareCardModule.downloadPNG();
    });

    // Journal Modal Save
    document.getElementById('btn-save-journal')?.addEventListener('click', () => {
      JournalModule.saveEntryFromModal();
    });

    // Sound toggle
    document.getElementById('setting-sound-toggle')?.addEventListener('change', (e) => {
      const s = StorageManager.getSettings();
      s.soundEnabled = e.target.checked;
      StorageManager.saveSettings(s);
      NotificationManager.showToast('Settings Saved', `Sound effects ${s.soundEnabled ? 'enabled' : 'disabled'}.`, 'info');
      if (s.soundEnabled) {
        NotificationManager.getAudioContext();
        NotificationManager.playCheckinSound();
      }
    });

    // Sound pack radio changes
    document.querySelectorAll('input[name="sound-pack-radio"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const s = StorageManager.getSettings();
        s.soundPack = e.target.value;
        StorageManager.saveSettings(s);
        NotificationManager.previewSoundPack(s.soundPack);
        NotificationManager.showToast('Sound Theme Changed 🎵', `Switched chime style to ${s.soundPack}.`, 'info');
      });
    });

    // Preview sound buttons
    document.querySelectorAll('.btn-preview-sound').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pack = btn.getAttribute('data-pack');
        NotificationManager.previewSoundPack(pack);
      });
    });

    // Request notification permission
    document.getElementById('btn-request-notif-perm')?.addEventListener('click', async () => {
      await NotificationManager.requestPermission();
      const statusEl = document.getElementById('notif-permission-status');
      if (statusEl && ('Notification' in window)) {
        statusEl.textContent = `Status: ${Notification.permission}`;
      }
    });

    document.getElementById('btn-test-notification')?.addEventListener('click', () => {
      NotificationManager.testReminder();
    });

    // Export backup
    document.getElementById('btn-export-backup')?.addEventListener('click', () => {
      StorageManager.exportBackupJSON();
      NotificationManager.showToast('Backup Exported! 💾', 'Your habit data, XP, trophies, and journal notes have been downloaded.', 'success');
    });

    // Import backup
    const importInput = document.getElementById('import-file-input');
    document.getElementById('btn-import-backup')?.addEventListener('click', () => {
      importInput?.click();
    });

    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target.result;
          const result = StorageManager.importBackupJSON(content);
          if (result.success) {
            NotificationManager.playCelebrationSound();
            NotificationManager.showToast('Data Restored! ✅', `Successfully imported ${result.count} habits.`, 'success');
            render();
          } else {
            NotificationManager.showToast('Import Failed ❌', result.error, 'warning');
          }
        };
        reader.readAsText(file);
        e.target.value = '';
      });
    }

    // Reset to demo defaults
    document.getElementById('btn-reset-defaults')?.addEventListener('click', () => {
      if (confirm('Reset all habits back to starter samples? Your current custom habits will be replaced.')) {
        StorageManager.resetToDefaults();
        NotificationManager.showToast('Defaults Restored', 'Starter habits loaded.', 'info');
        render();
      }
    });

    // Clear all data
    document.getElementById('btn-clear-all')?.addEventListener('click', () => {
      if (confirm('CAUTION: Are you sure you want to clear ALL habits and streaks? This cannot be undone.')) {
        StorageManager.clearAllData();
        NotificationManager.showToast('Data Cleared', 'All habits and records have been deleted.', 'warning');
        render();
      }
    });
  }

  /**
   * Modals Setup
   */
  function setupModals() {
    const habitModal = document.getElementById('habit-modal');
    const deleteModal = document.getElementById('delete-modal');
    const dateModal = document.getElementById('date-inspection-modal');
    const journalModal = document.getElementById('journal-modal');
    const shareModal = document.getElementById('share-modal');
    const voiceModal = document.getElementById('voice-modal');

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeAllModals());
    });

    [habitModal, deleteModal, dateModal, journalModal, shareModal, voiceModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeAllModals();
        });
      }
    });

    // Voice Modal Listeners
    document.getElementById('voice-mic-main-btn')?.addEventListener('click', () => {
      if (typeof VoiceAssistant !== 'undefined') {
        VoiceAssistant.startListening();
      }
    });

    const submitVoiceText = () => {
      const input = document.getElementById('voice-text-input');
      if (input && input.value.trim() && typeof VoiceAssistant !== 'undefined') {
        VoiceAssistant.processSpokenText(input.value.trim());
        input.value = '';
      }
    };
    document.getElementById('btn-voice-submit-text')?.addEventListener('click', submitVoiceText);
    document.getElementById('voice-text-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitVoiceText();
      }
    });

    document.querySelectorAll('.voice-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const phrase = btn.getAttribute('data-voice-phrase');
        if (phrase && typeof VoiceAssistant !== 'undefined') {
          const input = document.getElementById('voice-text-input');
          if (input) input.value = phrase;
          VoiceAssistant.processSpokenText(phrase);
        }
      });
    });

    document.querySelectorAll('.color-picker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-picker-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const colorInput = document.getElementById('habit-form-color');
        if (colorInput) colorInput.value = btn.getAttribute('data-color');
      });
    });

    document.querySelectorAll('.emoji-picker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.emoji-picker-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const emojiInput = document.getElementById('habit-form-emoji');
        if (emojiInput) emojiInput.value = btn.getAttribute('data-emoji');
      });
    });

    const habitForm = document.getElementById('habit-form');
    if (habitForm) {
      habitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveHabitFromForm();
      });
    }

    document.getElementById('btn-confirm-delete')?.addEventListener('click', () => {
      const id = document.getElementById('delete-modal')?.dataset.targetId;
      if (id) {
        StorageManager.deleteHabit(id);
        NotificationManager.showToast('Habit Deleted', 'The habit and its streak history were removed.', 'info');
        closeAllModals();
        render();
      }
    });
  }

  function closeAllModals() {
    if (typeof VoiceAssistant !== 'undefined') {
      VoiceAssistant.stopListening();
    }
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('modal-open'));
    editingHabitId = null;
  }

  function openHabitModal(habitId = null) {
    editingHabitId = habitId;
    const modal = document.getElementById('habit-modal');
    const modalTitle = document.getElementById('habit-modal-title');
    const titleInput = document.getElementById('habit-form-title');
    const descInput = document.getElementById('habit-form-desc');
    const catSelect = document.getElementById('habit-form-category');
    const freqSelect = document.getElementById('habit-form-frequency');
    const emojiInput = document.getElementById('habit-form-emoji');
    const colorInput = document.getElementById('habit-form-color');
    const reminderEnabled = document.getElementById('habit-form-reminder-enabled');
    const reminderTime = document.getElementById('habit-form-reminder-time');

    if (habitId) {
      const habit = StorageManager.getHabitById(habitId);
      if (!habit) return;

      modalTitle.textContent = 'Edit Habit';
      titleInput.value = habit.title || '';
      descInput.value = habit.description || '';
      catSelect.value = habit.category || 'Lifestyle';
      if (freqSelect) freqSelect.value = habit.frequency || 'daily';
      emojiInput.value = habit.emoji || '⚡';
      colorInput.value = habit.color || '#6366f1';
      reminderEnabled.checked = Boolean(habit.reminderEnabled);
      reminderTime.value = habit.reminderTime || '09:00';
    } else {
      modalTitle.textContent = 'Create New Habit';
      titleInput.value = '';
      descInput.value = '';
      catSelect.value = 'Health';
      if (freqSelect) freqSelect.value = 'daily';
      emojiInput.value = '⚡';
      colorInput.value = '#6366f1';
      reminderEnabled.checked = false;
      reminderTime.value = '08:00';
    }

    document.querySelectorAll('.color-picker-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-color') === colorInput.value);
    });

    document.querySelectorAll('.emoji-picker-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-emoji') === emojiInput.value);
    });

    modal.classList.add('modal-open');
    titleInput.focus();
  }

  function saveHabitFromForm() {
    const titleInput = document.getElementById('habit-form-title');
    const descInput = document.getElementById('habit-form-desc');
    const catSelect = document.getElementById('habit-form-category');
    const freqSelect = document.getElementById('habit-form-frequency');
    const emojiInput = document.getElementById('habit-form-emoji');
    const colorInput = document.getElementById('habit-form-color');
    const reminderEnabled = document.getElementById('habit-form-reminder-enabled');
    const reminderTime = document.getElementById('habit-form-reminder-time');

    const title = titleInput.value.trim();
    if (!title) {
      alert('Please enter a habit title.');
      return;
    }

    const habitData = {
      title,
      description: descInput.value.trim(),
      category: catSelect.value,
      frequency: freqSelect ? freqSelect.value : 'daily',
      emoji: emojiInput.value || '✨',
      color: colorInput.value || '#6366f1',
      reminderEnabled: reminderEnabled.checked,
      reminderTime: reminderTime.value || '09:00'
    };

    if (editingHabitId) {
      habitData.id = editingHabitId;
      StorageManager.saveHabit(habitData);
      NotificationManager.showToast('Habit Updated', `"${title}" has been saved.`, 'success');
    } else {
      StorageManager.saveHabit(habitData);
      GamificationEngine.addXP(25, 'Created new habit');
      NotificationManager.showToast('Habit Created! 🌱', `"${title}" is ready to track. (+25 XP)`, 'success');
      NotificationManager.playCheckinSound();
    }

    closeAllModals();
    render();
  }

  function confirmDeleteHabit(habitId) {
    const habit = StorageManager.getHabitById(habitId);
    if (!habit) return;

    const modal = document.getElementById('delete-modal');
    modal.dataset.targetId = habitId;
    const nameEl = document.getElementById('delete-habit-name');
    if (nameEl) nameEl.textContent = `"${habit.title}"`;
    modal.classList.add('modal-open');
  }

  function showDateModal(dateStr) {
    const modal = document.getElementById('date-inspection-modal');
    if (!modal) return;

    const habits = StorageManager.getHabits();
    const parsedDate = StreakEngine.parseDateString(dateStr) || new Date();
    const formatted = parsedDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    document.getElementById('date-modal-title').textContent = formatted;
    document.getElementById('date-modal-subtitle').textContent = `Check-ins for ${dateStr}`;

    const listContainer = document.getElementById('date-modal-habits-list');
    let html = '';

    habits.forEach(h => {
      const isDone = Array.isArray(h.completedDates) && h.completedDates.includes(dateStr);
      html += `
        <div class="date-modal-habit-item card-glass ${isDone ? 'is-done' : ''}">
          <div class="dm-info">
            <span class="dm-emoji">${h.emoji || '⚡'}</span>
            <div>
              <div class="dm-title">${escapeHtml(h.title)}</div>
              <div class="dm-category">${h.category}</div>
            </div>
          </div>
          <button class="btn btn-sm ${isDone ? 'btn-success' : 'btn-secondary'} btn-retro-toggle"
                  data-retro-id="${h.id}" data-retro-date="${dateStr}">
            ${isDone ? '✓ Completed' : '+ Mark Done'}
          </button>
        </div>
      `;
    });

    listContainer.innerHTML = html;

    listContainer.querySelectorAll('.btn-retro-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const hId = btn.getAttribute('data-retro-id');
        const dStr = btn.getAttribute('data-retro-date');
        StorageManager.toggleHabitDate(hId, dStr);
        showDateModal(dateStr);
        render();
      });
    });

    modal.classList.add('modal-open');
  }

  /**
   * Lightweight Canvas Confetti Particles
   */
  let confettiCanvas, confettiCtx, confettiParticles = [], confettiAnimationId = null;

  function setupCanvasConfetti() {
    confettiCanvas = document.getElementById('confetti-canvas');
    if (!confettiCanvas) return;
    confettiCtx = confettiCanvas.getContext('2d');

    function resize() {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
  }

  function triggerConfetti() {
    if (!confettiCanvas || !confettiCtx) return;

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444'];
    confettiParticles = [];

    const numParticles = 90;
    for (let i = 0; i < numParticles; i++) {
      confettiParticles.push({
        x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 200,
        y: confettiCanvas.height / 2 - 50,
        w: Math.random() * 8 + 4,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 1.5) * 10,
        tilt: Math.random() * 10 - 10,
        tiltAngle: 0,
        tiltAngleInc: (Math.random() * 0.07) + 0.05,
        opacity: 1
      });
    }

    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);

    function updateConfetti() {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      let activeParticles = false;

      confettiParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.tiltAngle += p.tiltAngleInc;
        p.tilt = Math.sin(p.tiltAngle) * 12;
        p.opacity -= 0.007;

        if (p.opacity > 0 && p.y < confettiCanvas.height) {
          activeParticles = true;
          confettiCtx.save();
          confettiCtx.globalAlpha = Math.max(0, p.opacity);
          confettiCtx.fillStyle = p.color;
          confettiCtx.beginPath();
          confettiCtx.rect(p.x + p.tilt, p.y, p.w, p.h);
          confettiCtx.fill();
          confettiCtx.restore();
        }
      });

      if (activeParticles) {
        confettiAnimationId = requestAnimationFrame(updateConfetti);
      } else {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }

    updateConfetti();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    init,
    render,
    switchTab,
    showDateModal,
    triggerConfetti
  };
})();

// Auto boot on DOM load
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
