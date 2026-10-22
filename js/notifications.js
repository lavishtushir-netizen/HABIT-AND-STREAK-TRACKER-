/**
 * Habit & Streak Tracker - Notifications & Audio Engine
 * Developed by Lavish Tushir
 * 
 * Features:
 * - HTML5 Web Notifications API (`Notification`)
 * - Web Audio API synthesized sound themes (Marimba, 8-Bit Arcade, Zen Bell, Sci-Fi)
 * - In-app floating toast alerts with micro-animations
 * - Scheduled daily reminder background runner
 */

const NotificationManager = (() => {
  let audioCtx = null;
  let checkInterval = null;
  const triggeredToday = new Set();

  /**
   * Lazily initialize Web Audio Context on first user interaction
   */
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * Synthesize sound based on chosen sound pack
   */
  function playSound(pack, type = 'checkin') {
    const settings = StorageManager.getSettings();
    if (!settings.soundEnabled) return;

    const chosenPack = pack || settings.soundPack || 'marimba';
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (chosenPack === 'arcade') {
        // --- 8-Bit Retro Arcade (Square Waves) ---
        const notes = type === 'celebration' ? [261.63, 329.63, 392.00, 523.25, 659.25] : [392.00, 523.25, 659.25];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          gain.gain.setValueAtTime(0, now + idx * 0.06);
          gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.06 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.18);
        });

      } else if (chosenPack === 'zen') {
        // --- Zen Bell (Gentle Tibetan Singing Bowl Chime) ---
        const baseFreq = type === 'celebration' ? 528 : 432;
        const harmonics = [baseFreq, baseFreq * 1.5, baseFreq * 2.05];
        harmonics.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.16 / (idx + 1), now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 - idx * 0.2);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 1.3);
        });

      } else if (chosenPack === 'scifi') {
        // --- Sci-Fi Cyber Chime (Frequency Sweep & Warp Ping) ---
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(3000, now + 0.2);

        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.4);

      } else {
        // --- Default: Modern Crisp Marimba (Warm Sine Fanfare) ---
        const notes = type === 'celebration' ? [523.25, 659.25, 783.99, 1046.50] : [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);

          gain.gain.setValueAtTime(0, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.32);
        });
      }
    } catch (e) {
      console.warn('Audio playback not permitted or failed:', e);
    }
  }

  function playCheckinSound() {
    playSound(null, 'checkin');
  }

  function playCelebrationSound() {
    playSound(null, 'celebration');
  }

  function playReminderSound() {
    playSound(null, 'checkin');
  }

  function previewSoundPack(packName) {
    getAudioContext();
    playSound(packName, 'celebration');
  }

  /**
   * Display modern floating in-app Toast notification
   */
  function showToast(title, message = '', type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '🔔';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'streak') icon = '⚡';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      dismissToast(toast);
    });

    container.appendChild(toast);

    const timer = setTimeout(() => {
      dismissToast(toast);
    }, duration);

    toast.dataset.timer = timer;
  }

  function dismissToast(toast) {
    if (!toast || toast.classList.contains('toast-exit')) return;
    toast.classList.add('toast-exit');
    clearTimeout(toast.dataset.timer);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Request browser desktop notification permission
   */
  async function requestPermission() {
    if (!('Notification' in window)) {
      showToast('Notifications Not Supported', 'Your browser does not support desktop alerts, but in-app toast reminders will work!', 'warning');
      return false;
    }

    if (Notification.permission === 'granted') {
      showToast('Notifications Active', 'Desktop daily reminders are enabled.', 'success');
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showToast('Notifications Enabled!', 'You will receive daily habit reminders.', 'success');
        return true;
      } else {
        showToast('Permission Denied', 'Desktop notifications blocked. In-app alerts will be used.', 'info');
        return false;
      }
    } catch (e) {
      console.warn('Permission request error:', e);
      return false;
    }
  }

  /**
   * Trigger a notification for a habit (Desktop + In-app Toast + Sound)
   */
  function triggerHabitReminder(habit, isTest = false) {
    const title = `${habit.emoji || '🏃'} Time for ${habit.title}!`;
    const body = habit.description || `Don't break your streak! Take a minute to check this habit off today.`;

    playReminderSound();
    showToast(title, body, 'info', 6000);

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: body,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏃</text></svg>',
          tag: `habit_${habit.id}_${Date.now()}`
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn('Desktop notification dispatch failed:', e);
      }
    }
  }

  function testReminder(habit) {
    getAudioContext();
    if (!habit) {
      const sampleHabit = {
        id: 'test',
        title: 'Daily Streak Check',
        emoji: '🏃',
        description: 'Test reminder: Your Habit & Streak Tracker notifications are working properly!'
      };
      triggerHabitReminder(sampleHabit, true);
    } else {
      triggerHabitReminder(habit, true);
    }
  }

  /**
   * Background check loop
   */
  function startReminderScheduler() {
    if (checkInterval) clearInterval(checkInterval);

    checkInterval = setInterval(() => {
      const habits = StorageManager.getHabits();
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayStr = StreakEngine.getToday();

      habits.forEach(habit => {
        if (!habit.reminderEnabled || !habit.reminderTime) return;

        const isDoneToday = Array.isArray(habit.completedDates) && habit.completedDates.includes(todayStr);
        if (isDoneToday) return;

        const triggerKey = `${habit.id}_${todayStr}_${currentTimeStr}`;
        if (habit.reminderTime === currentTimeStr && !triggeredToday.has(triggerKey)) {
          triggeredToday.add(triggerKey);
          triggerHabitReminder(habit);
        }
      });
    }, 30000);
  }

  return {
    getAudioContext,
    playSound,
    playCheckinSound,
    playCelebrationSound,
    playReminderSound,
    previewSoundPack,
    showToast,
    requestPermission,
    triggerHabitReminder,
    testReminder,
    startReminderScheduler
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationManager;
}
