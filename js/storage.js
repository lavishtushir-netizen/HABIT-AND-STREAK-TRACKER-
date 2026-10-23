/**
 * Habit & Streak Tracker - Storage & Backup System
 * Developed by Lavish Tushir
 * 
 * Manages 100% offline data persistence via localStorage,
 * automatic initialization of starter habits, gamification state,
 * journal reflection entries, and JSON Backup Export / Import.
 */

const StorageManager = (() => {
  const HABITS_KEY = 'hst_habits_v2';
  const THEME_KEY = 'hst_theme_v1';
  const SETTINGS_KEY = 'hst_settings_v1';
  const GAMIFICATION_KEY = 'hst_gamification_v2';
  const JOURNAL_KEY = 'hst_journal_v2';
  const USER_KEY = 'hst_user_v1';

  // Clear legacy pre-populated demo data so all users start 100% completely fresh
  try {
    if (localStorage.getItem('hst_habits_v1')) {
      localStorage.removeItem('hst_habits_v1');
      localStorage.removeItem('hst_gamification_v1');
      localStorage.removeItem('hst_journal_v1');
    }
  } catch (e) {}

  /**
   * Generates a unique string ID
   */
  function generateId(prefix = 'habit_') {
    return prefix + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Helper to compute date strings relative to today
   */
  function relativeDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Starter habits for fresh install - 100% clean with 0 completed dates (0% done)
   */
  function getSampleHabits() {
    return [
      {
        id: 'seed_water',
        title: 'Drink 2.5L Water',
        description: 'Stay hydrated throughout the day for focus and energy',
        category: 'Health',
        emoji: '💧',
        color: '#06b6d4',
        frequency: 'daily',
        reminderTime: '09:00',
        reminderEnabled: true,
        completedDates: [],
        frozenDates: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed_code',
        title: 'Code for 45 Mins',
        description: 'Problem-solving, web development, and AI engineering',
        category: 'Learning',
        emoji: '💻',
        color: '#6366f1',
        frequency: 'weekdays',
        reminderTime: '18:00',
        reminderEnabled: true,
        completedDates: [],
        frozenDates: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed_workout',
        title: 'Morning Workout & Stretch',
        description: 'Pushups, core routine, and gentle morning mobility',
        category: 'Fitness',
        emoji: '🏃',
        color: '#10b981',
        frequency: 'daily',
        reminderTime: '07:30',
        reminderEnabled: true,
        completedDates: [],
        frozenDates: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed_reading',
        title: 'Read 15 Pages',
        description: 'Read Atomic Habits or tech documentation before sleep',
        category: 'Productivity',
        emoji: '📚',
        color: '#f59e0b',
        frequency: 'daily',
        reminderTime: '21:30',
        reminderEnabled: false,
        completedDates: [],
        frozenDates: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed_meditation',
        title: 'Evening Mindfulness',
        description: '5 minutes of box breathing and gratitude reflection',
        category: 'Mindfulness',
        emoji: '🧘',
        color: '#ec4899',
        frequency: 'daily',
        reminderTime: '22:00',
        reminderEnabled: true,
        completedDates: [],
        frozenDates: [],
        createdAt: new Date().toISOString()
      }
    ];
  }

  /**
   * Retrieve all habits from localStorage.
   */
  function getHabits() {
    try {
      const data = localStorage.getItem(HABITS_KEY);
      if (!data) {
        const samples = getSampleHabits();
        saveHabits(samples);
        return samples;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error reading habits from localStorage:', e);
      return [];
    }
  }

  /**
   * Save habits array to localStorage
   */
  function saveHabits(habits) {
    try {
      localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
      if (typeof SupabaseClient !== 'undefined' && SupabaseClient.isReady()) {
        SupabaseClient.syncLocalToCloud();
      }
      return true;
    } catch (e) {
      console.error('Error writing habits to localStorage:', e);
      return false;
    }
  }

  /**
   * Get single habit by ID
   */
  function getHabitById(id) {
    const habits = getHabits();
    return habits.find(h => h.id === id) || null;
  }

  /**
   * Create or update habit
   */
  function saveHabit(habitData) {
    const habits = getHabits();
    if (!habitData.id) {
      // New habit
      habitData.id = generateId('habit_');
      habitData.createdAt = new Date().toISOString();
      if (!Array.isArray(habitData.completedDates)) habitData.completedDates = [];
      if (!Array.isArray(habitData.frozenDates)) habitData.frozenDates = [];
      if (!habitData.frequency) habitData.frequency = 'daily';
      habits.unshift(habitData);
    } else {
      // Update existing
      const index = habits.findIndex(h => h.id === habitData.id);
      if (index !== -1) {
        habits[index] = {
          ...habits[index],
          ...habitData,
          completedDates: habitData.completedDates || habits[index].completedDates || [],
          frozenDates: habitData.frozenDates || habits[index].frozenDates || [],
          frequency: habitData.frequency || habits[index].frequency || 'daily'
        };
      } else {
        habits.unshift(habitData);
      }
    }
    saveHabits(habits);
    return habitData;
  }

  /**
   * Delete habit by ID
   */
  function deleteHabit(id) {
    let habits = getHabits();
    habits = habits.filter(h => h.id !== id);
    saveHabits(habits);
    return habits;
  }

  /**
   * Toggle completion for a specific date
   */
  function toggleHabitDate(id, dateStr) {
    const habits = getHabits();
    const habit = habits.find(h => h.id === id);
    if (!habit) return null;

    if (!Array.isArray(habit.completedDates)) habit.completedDates = [];

    const dateSet = new Set(habit.completedDates);
    let isCompleted = false;

    if (dateSet.has(dateStr)) {
      dateSet.delete(dateStr);
      isCompleted = false;
    } else {
      dateSet.add(dateStr);
      isCompleted = true;
    }

    habit.completedDates = Array.from(dateSet).sort();
    saveHabits(habits);

    const streakInfo = StreakEngine.calculate(habit.completedDates, StreakEngine.getToday(), habit.frequency, habit.frozenDates);

    return {
      habit,
      isCompleted,
      streakInfo
    };
  }

  /**
   * Add a streak freeze to a habit on a date
   */
  function freezeHabitDate(id, dateStr) {
    const habits = getHabits();
    const habit = habits.find(h => h.id === id);
    if (!habit) return false;

    if (!Array.isArray(habit.frozenDates)) habit.frozenDates = [];
    if (!habit.frozenDates.includes(dateStr)) {
      habit.frozenDates.push(dateStr);
      habit.frozenDates.sort();
      saveHabits(habits);
      return true;
    }
    return false;
  }

  /**
   * Theme preferences
   */
  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
  }

  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }

  /**
   * App settings (sound, sound pack, reminders, notifications)
   */
  function getSettings() {
    const defaults = {
      soundEnabled: true,
      soundPack: 'marimba', // 'marimba' | 'arcade' | 'zen' | 'scifi'
      notificationsEnabled: true,
      userName: 'Lavish Tushir'
    };
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      return s ? { ...defaults, ...JSON.parse(s) } : defaults;
    } catch {
      return defaults;
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  /**
   * Gamification State (XP, Level, Badges, Freezes)
   */
  function getGamification() {
    const defaults = {
      xp: 0,
      badges: [],
      streakFreezes: 2,
      usedFreezes: []
    };
    try {
      const data = localStorage.getItem(GAMIFICATION_KEY);
      return data ? { ...defaults, ...JSON.parse(data) } : defaults;
    } catch {
      return defaults;
    }
  }

  function saveGamification(gamificationData) {
    try {
      localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(gamificationData));
      return true;
    } catch (e) {
      console.error('Error saving gamification state:', e);
      return false;
    }
  }

  /**
   * Journal / Reflection Micro-Notes
   */
  function getJournalEntries() {
    const defaults = [];
    try {
      const data = localStorage.getItem(JOURNAL_KEY);
      if (!data) {
        localStorage.setItem(JOURNAL_KEY, JSON.stringify(defaults));
        return defaults;
      }
      return JSON.parse(data);
    } catch {
      return defaults;
    }
  }

  function saveJournalEntry(entry) {
    const entries = getJournalEntries();
    if (!entry.id) {
      entry.id = generateId('note_');
      entry.createdAt = new Date().toISOString();
      entries.unshift(entry);
    } else {
      const idx = entries.findIndex(e => e.id === entry.id);
      if (idx !== -1) entries[idx] = { ...entries[idx], ...entry };
      else entries.unshift(entry);
    }
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
    return entry;
  }

  function deleteJournalEntry(id) {
    let entries = getJournalEntries();
    entries = entries.filter(e => e.id !== id);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
    return entries;
  }

  /**
   * Reset all data back to factory samples (100% clean, 0% done)
   */
  function resetToDefaults() {
    const samples = getSampleHabits();
    saveHabits(samples);
    saveGamification({
      xp: 0,
      badges: [],
      streakFreezes: 2,
      usedFreezes: []
    });
    localStorage.removeItem(JOURNAL_KEY);
    return samples;
  }

  /**
   * Clear all habit data completely
   */
  function clearAllData() {
    saveHabits([]);
    saveGamification({ xp: 0, badges: [], streakFreezes: 1, usedFreezes: [] });
    localStorage.setItem(JOURNAL_KEY, JSON.stringify([]));
    return [];
  }

  /**
   * Stretch Feature #1: Export entire database as JSON file download
   */
  function exportBackupJSON() {
    const data = {
      project: 'Habit & Streak Tracker',
      version: '2.0.0',
      author: 'Lavish Tushir',
      exportedAt: new Date().toISOString(),
      theme: getTheme(),
      settings: getSettings(),
      gamification: getGamification(),
      journal: getJournalEntries(),
      habits: getHabits()
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-tracker-backup-${StreakEngine.getToday()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }

  /**
   * Stretch Feature #1: Import & Restore data from JSON string
   */
  function importBackupJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !Array.isArray(data.habits)) {
        throw new Error('Invalid backup file: missing habits array');
      }

      // Validate and sanitize imported habits
      const sanitized = data.habits.map(h => ({
        id: h.id || generateId('habit_'),
        title: String(h.title || 'Untitled Habit').trim(),
        description: String(h.description || '').trim(),
        category: h.category || 'Lifestyle',
        emoji: h.emoji || '✨',
        color: h.color || '#6366f1',
        frequency: h.frequency || 'daily',
        reminderTime: h.reminderTime || '',
        reminderEnabled: Boolean(h.reminderEnabled),
        completedDates: Array.isArray(h.completedDates) ? h.completedDates : [],
        frozenDates: Array.isArray(h.frozenDates) ? h.frozenDates : [],
        createdAt: h.createdAt || new Date().toISOString()
      }));

      saveHabits(sanitized);

      if (data.theme) setTheme(data.theme);
      if (data.settings) saveSettings(data.settings);
      if (data.gamification) saveGamification(data.gamification);
      if (Array.isArray(data.journal)) localStorage.setItem(JOURNAL_KEY, JSON.stringify(data.journal));

      return { success: true, count: sanitized.length };
    } catch (err) {
      console.error('Import failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * User Session Management (Personalized Greeting)
   */
  function getCurrentUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function setCurrentUser(user) {
    try {
      if (typeof user === 'string') {
        user = { name: user };
      }
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } catch (e) {
      console.error('Error saving user to localStorage:', e);
      return user;
    }
  }

  function clearCurrentUser() {
    try {
      localStorage.removeItem(USER_KEY);
    } catch (e) {}
  }

  return {
    generateId,
    getHabits,
    getHabitById,
    saveHabit,
    deleteHabit,
    toggleHabitDate,
    freezeHabitDate,
    getTheme,
    setTheme,
    getSettings,
    saveSettings,
    getGamification,
    saveGamification,
    getJournalEntries,
    saveJournalEntry,
    deleteJournalEntry,
    resetToDefaults,
    clearAllData,
    exportBackupJSON,
    importBackupJSON,
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
