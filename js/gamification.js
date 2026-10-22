/**
 * Habit & Streak Tracker - Gamification, XP & Trophy Room Module
 * Developed by Lavish Tushir
 * 
 * Features:
 * - XP progression and Level Ladder (Level 1 to Level 10)
 * - 8 Unlockable Achievement Badges with progress tracking
 * - Streak Freeze Shield management
 * - Trophy Room renderer
 */

const GamificationEngine = (() => {
  const RANKS = [
    { level: 1, title: 'Novice Tracker', minXP: 0, maxXP: 100, icon: '🌱' },
    { level: 2, title: 'Habit Explorer', minXP: 100, maxXP: 250, icon: '🧭' },
    { level: 3, title: 'Momentum Builder', minXP: 250, maxXP: 450, icon: '⚡' },
    { level: 4, title: 'Consistency Apprentice', minXP: 450, maxXP: 700, icon: '🛡️' },
    { level: 5, title: 'Consistency Pro', minXP: 700, maxXP: 1000, icon: '🔥' },
    { level: 6, title: 'Routine Veteran', minXP: 1000, maxXP: 1400, icon: '⚔️' },
    { level: 7, title: 'Focus Champion', minXP: 1400, maxXP: 1900, icon: '🎯' },
    { level: 8, title: 'Iron Disciplined', minXP: 1900, maxXP: 2500, icon: '💎' },
    { level: 9, title: 'Habit Master', minXP: 2500, maxXP: 3200, icon: '👑' },
    { level: 10, title: 'Grandmaster of Discipline', minXP: 3200, maxXP: Infinity, icon: '🏆' }
  ];

  const BADGE_DEFINITIONS = [
    {
      id: 'first_step',
      title: 'First Step',
      emoji: '🐣',
      description: 'Check off your very first habit',
      xpReward: 30,
      check: (data) => data.totalCompletions >= 1
    },
    {
      id: 'week_fire',
      title: 'Week on Fire',
      emoji: '🔥',
      description: 'Achieve a 7-day streak on any habit',
      xpReward: 100,
      check: (data) => data.maxStreak >= 7
    },
    {
      id: 'flawless_day',
      title: 'Flawless Day',
      emoji: '🏆',
      description: 'Complete 100% of all habits in a single day',
      xpReward: 50,
      check: (data) => data.flawlessDay === true
    },
    {
      id: 'deep_focus',
      title: 'Deep Focus',
      emoji: '⏱️',
      description: 'Complete a full Pomodoro focus session',
      xpReward: 50,
      check: (data) => data.pomodoroCompleted === true
    },
    {
      id: 'iron_will',
      title: 'Shield Bearer',
      emoji: '🛡️',
      description: 'Activate an emergency Streak Freeze to protect a streak',
      xpReward: 40,
      check: (data) => data.freezeUsed === true
    },
    {
      id: 'early_bird',
      title: 'Early Bird',
      emoji: '☀️',
      description: 'Check in a habit before 8:00 AM',
      xpReward: 40,
      check: (data) => data.isEarlyBird === true
    },
    {
      id: 'night_owl',
      title: 'Night Owl',
      emoji: '🌙',
      description: 'Check in a habit after 9:00 PM',
      xpReward: 40,
      check: (data) => data.isNightOwl === true
    },
    {
      id: 'centurion',
      title: 'Centurion',
      emoji: '💎',
      description: 'Reach 100 total habit check-ins all time',
      xpReward: 200,
      check: (data) => data.totalCompletions >= 100
    }
  ];

  /**
   * Get level information for given XP
   */
  function getLevelInfo(totalXP = 0) {
    let rank = RANKS[0];
    for (let i = 0; i < RANKS.length; i++) {
      if (totalXP >= RANKS[i].minXP) {
        rank = RANKS[i];
      }
    }

    const isMax = rank.level === 10;
    const levelRange = isMax ? 1000 : (rank.maxXP - rank.minXP);
    const xpInLevel = totalXP - rank.minXP;
    const progressPercent = isMax ? 100 : Math.min(100, Math.round((xpInLevel / levelRange) * 100));

    return {
      level: rank.level,
      title: rank.title,
      icon: rank.icon,
      totalXP,
      minXP: rank.minXP,
      maxXP: rank.maxXP,
      neededXP: isMax ? 0 : (rank.maxXP - totalXP),
      progressPercent
    };
  }

  /**
   * Add XP, handle level-up, and save
   */
  function addXP(amount, reason = '') {
    const gamification = StorageManager.getGamification();
    const oldLevelInfo = getLevelInfo(gamification.xp);
    
    gamification.xp += amount;
    const newLevelInfo = getLevelInfo(gamification.xp);

    StorageManager.saveGamification(gamification);

    // Show toast for XP gained
    NotificationManager.showToast(`+${amount} XP! ⚡`, reason, 'streak', 2500);

    // Check if user Leveled Up!
    if (newLevelInfo.level > oldLevelInfo.level) {
      setTimeout(() => {
        NotificationManager.playCelebrationSound();
        if (window.App && typeof window.App.triggerConfetti === 'function') {
          window.App.triggerConfetti();
        }
        NotificationManager.showToast(
          `🎉 LEVEL UP! Level ${newLevelInfo.level}`,
          `Rank Unlocked: ${newLevelInfo.title} ${newLevelInfo.icon}! Keep pushing your streak!`,
          'success',
          6000
        );
      }, 400);
    }

    // Refresh UI elements
    updateHeaderGamification();
    return newLevelInfo;
  }

  /**
   * Check all achievement badges against current habits & context
   */
  function checkBadges(context = {}) {
    const habits = StorageManager.getHabits();
    const gamification = StorageManager.getGamification();
    const unlockedSet = new Set(gamification.badges || []);

    let totalCompletions = 0;
    let maxStreak = 0;
    const todayStr = StreakEngine.getToday();
    let completedToday = 0;

    habits.forEach(h => {
      const dates = h.completedDates || [];
      totalCompletions += dates.length;
      const s = StreakEngine.calculate(dates, todayStr, h.frequency, h.frozenDates);
      if (s.bestStreak > maxStreak) maxStreak = s.bestStreak;
      if (s.isCompletedToday) completedToday++;
    });

    const hour = new Date().getHours();
    const evalData = {
      totalCompletions,
      maxStreak,
      flawlessDay: habits.length > 0 && completedToday === habits.length,
      pomodoroCompleted: Boolean(context.pomodoroCompleted),
      freezeUsed: Boolean(context.freezeUsed || (gamification.usedFreezes && gamification.usedFreezes.length > 0)),
      isEarlyBird: hour < 8,
      isNightOwl: hour >= 21
    };

    let newlyUnlocked = false;

    BADGE_DEFINITIONS.forEach(b => {
      if (!unlockedSet.has(b.id) && b.check(evalData)) {
        unlockedSet.add(b.id);
        newlyUnlocked = true;

        setTimeout(() => {
          NotificationManager.playCelebrationSound();
          if (window.App && typeof window.App.triggerConfetti === 'function') {
            window.App.triggerConfetti();
          }
          NotificationManager.showToast(
            `🏆 Badge Unlocked: ${b.title}!`,
            `${b.emoji} ${b.description} (+${b.xpReward} Bonus XP)`,
            'success',
            6000
          );
          addXP(b.xpReward, `Badge Unlocked: ${b.title}`);
        }, 600);
      }
    });

    if (newlyUnlocked) {
      gamification.badges = Array.from(unlockedSet);
      StorageManager.saveGamification(gamification);
      updateHeaderGamification();
    }
  }

  /**
   * Use an emergency Streak Freeze to save a habit
   */
  function useStreakFreeze(habitId) {
    const gamification = StorageManager.getGamification();
    if (gamification.streakFreezes <= 0) {
      NotificationManager.showToast('No Streak Freezes Left', 'You earn +1 Freeze for every 10 active check-ins!', 'warning');
      return false;
    }

    const todayStr = StreakEngine.getToday();
    const yesterdayStr = StreakEngine.getYesterday();
    const success = StorageManager.freezeHabitDate(habitId, yesterdayStr);

    if (success) {
      gamification.streakFreezes--;
      if (!Array.isArray(gamification.usedFreezes)) gamification.usedFreezes = [];
      gamification.usedFreezes.push({ habitId, dateStr: yesterdayStr, usedAt: new Date().toISOString() });
      StorageManager.saveGamification(gamification);

      NotificationManager.playCelebrationSound();
      NotificationManager.showToast('🛡️ Streak Shield Activated!', 'Your streak was frozen and saved without penalty!', 'success', 5000);
      checkBadges({ freezeUsed: true });
      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }
      return true;
    }
    return false;
  }

  /**
   * Update header and widget XP display
   */
  function updateHeaderGamification() {
    const gamification = StorageManager.getGamification();
    const info = getLevelInfo(gamification.xp);

    const levelBadge = document.getElementById('header-level-badge');
    const xpProgress = document.getElementById('header-xp-bar-fill');
    const xpLabel = document.getElementById('header-xp-label');
    const freezeCount = document.getElementById('header-freeze-count');

    if (levelBadge) levelBadge.textContent = `Lvl ${info.level} ${info.icon}`;
    if (xpProgress) xpProgress.style.width = `${info.progressPercent}%`;
    if (xpLabel) xpLabel.textContent = `${info.totalXP} XP (${info.title})`;
    if (freezeCount) freezeCount.textContent = `❄️ ${gamification.streakFreezes}`;
  }

  /**
   * Render the Trophy Room (Achievement Badges tab)
   */
  function renderTrophyRoom(container) {
    if (!container) return;

    const gamification = StorageManager.getGamification();
    const unlockedSet = new Set(gamification.badges || []);
    const levelInfo = getLevelInfo(gamification.xp);

    let html = `
      <!-- LEVEL HERO CARD -->
      <div class="trophy-hero-card card-glass">
        <div class="trophy-hero-left">
          <div class="level-avatar">${levelInfo.icon}</div>
          <div>
            <span class="focus-date-badge">Level ${levelInfo.level} Adventurer</span>
            <h2 class="trophy-hero-title">${levelInfo.title}</h2>
            <p class="trophy-hero-sub">Keep checking in daily habits to earn XP and level up!</p>
          </div>
        </div>

        <div class="trophy-hero-right">
          <div class="xp-score-block">
            <span class="xp-score-number">${levelInfo.totalXP}</span>
            <span class="xp-score-sub">Total XP Earned</span>
          </div>
          <div class="trophy-xp-bar-wrapper">
            <div class="trophy-xp-bar">
              <div class="trophy-xp-fill" style="width: ${levelInfo.progressPercent}%"></div>
            </div>
            <span class="trophy-xp-pct">${levelInfo.progressPercent}% to Next Level (${levelInfo.neededXP} XP needed)</span>
          </div>
        </div>
      </div>

      <!-- FREEZE SHIELDS BANNER -->
      <div class="freeze-banner card-glass">
        <div class="freeze-banner-content">
          <div class="freeze-icon">❄️</div>
          <div>
            <h4 class="freeze-title">Emergency Streak Freezes: <strong>${gamification.streakFreezes} Available</strong></h4>
            <p class="freeze-desc">Missed yesterday? Use a freeze shield to protect your streak unbroken without losing your progress.</p>
          </div>
        </div>
        <div class="freeze-meta">Earn +1 Freeze every 10 active days</div>
      </div>

      <!-- BADGES SHOWCASE GRID -->
      <div class="section-header">
        <div>
          <h3 class="section-title">🏆 Achievement Badges (${unlockedSet.size} of ${BADGE_DEFINITIONS.length} Unlocked)</h3>
          <p class="section-subtitle">Earn unique trophies by building enduring consistency</p>
        </div>
      </div>

      <div class="trophy-grid">
    `;

    BADGE_DEFINITIONS.forEach(b => {
      const isUnlocked = unlockedSet.has(b.id);
      html += `
        <div class="badge-card card-glass ${isUnlocked ? 'badge-unlocked' : 'badge-locked'}">
          <div class="badge-icon-box">
            <span class="badge-emoji">${b.emoji}</span>
            ${isUnlocked ? '<span class="badge-check-tag">✓ Unlocked</span>' : '<span class="badge-lock-tag">🔒 Locked</span>'}
          </div>
          <div class="badge-info">
            <h4 class="badge-title">${b.title}</h4>
            <p class="badge-desc">${b.description}</p>
            <div class="badge-reward">+${b.xpReward} XP Reward</div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  return {
    RANKS,
    BADGE_DEFINITIONS,
    getLevelInfo,
    addXP,
    checkBadges,
    useStreakFreeze,
    updateHeaderGamification,
    renderTrophyRoom
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GamificationEngine;
}
