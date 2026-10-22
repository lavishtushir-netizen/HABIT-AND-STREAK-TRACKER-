/**
 * Habit & Streak Tracker - Supabase Cloud Backend Integration
 * Developed by Lavish Tushir
 * 
 * Instructions:
 * 1. Create a free project at https://supabase.com
 * 2. Run schema.sql in Supabase's SQL Editor
 * 3. Paste your Project URL and Anon Key below:
 */

const SUPABASE_CONFIG = {
  url: 'https://feewpfjfluljihhdknjj.supabase.co',
  anonKey: 'sb_publishable_a786bEFWsiffUNFpvonmxw_oY_xibeo'
};

const SupabaseClient = (() => {
  let client = null;
  let isConfigured = false;

  function init() {
    if (SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_PROJECT_URL' && 
        SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
        window.supabase) {
      try {
        client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        isConfigured = true;
        console.log('⚡ Supabase Cloud Backend connected successfully!');
        // Automatically sync habits on startup
        setTimeout(() => {
          syncLocalToCloud();
        }, 800);
      } catch (err) {
        console.warn('Supabase initialization error:', err);
      }
    } else {
      console.log('ℹ️ Running in LocalStorage offline mode.');
    }
  }

  /**
   * Sync local habits to Supabase
   */
  async function syncLocalToCloud() {
    if (!isConfigured || !client) return false;
    try {
      const habits = StorageManager.getHabits();
      for (const h of habits) {
        // Upsert habit
        await client.from('habits').upsert({
          id: h.id,
          title: h.title,
          description: h.description || '',
          category: h.category,
          emoji: h.emoji,
          color: h.color,
          frequency: h.frequency || 'daily',
          reminder_time: h.reminderTime || '09:00',
          reminder_enabled: !!h.reminderEnabled
        });

        // Upsert check-ins
        if (Array.isArray(h.completedDates)) {
          for (const dateStr of h.completedDates) {
            await client.from('check_ins').upsert({
              habit_id: h.id,
              date: dateStr
            }, { onConflict: 'habit_id, date' });
          }
        }
      }
      return true;
    } catch (e) {
      console.warn('Sync error to Supabase:', e);
      return false;
    }
  }

  /**
   * Fetch habits and check-ins from Supabase into LocalStorage
   */
  async function pullFromCloud() {
    if (!isConfigured || !client) return null;
    try {
      const { data: habitsData, error: habitsErr } = await client.from('habits').select('*');
      if (habitsErr) throw habitsErr;

      const { data: checkinsData, error: checkinsErr } = await client.from('check_ins').select('*');
      if (checkinsErr) throw checkinsErr;

      const checkinsMap = {};
      (checkinsData || []).forEach(c => {
        if (!checkinsMap[c.habit_id]) checkinsMap[c.habit_id] = [];
        checkinsMap[c.habit_id].push(c.date);
      });

      const mergedHabits = (habitsData || []).map(h => ({
        id: h.id,
        title: h.title,
        description: h.description,
        category: h.category,
        emoji: h.emoji,
        color: h.color,
        frequency: h.frequency,
        reminderTime: h.reminder_time,
        reminderEnabled: h.reminder_enabled,
        completedDates: checkinsMap[h.id] || [],
        createdAt: h.created_at
      }));

      StorageManager.saveHabits(mergedHabits);
      return mergedHabits;
    } catch (e) {
      console.warn('Error pulling from Supabase:', e);
      return null;
    }
  }

  return {
    init,
    syncLocalToCloud,
    pullFromCloud,
    isReady: () => isConfigured
  };
})();

// Auto-init on load
window.addEventListener('DOMContentLoaded', () => {
  SupabaseClient.init();
});
