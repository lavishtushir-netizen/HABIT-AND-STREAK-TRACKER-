/**
 * Habit & Streak Tracker - Social Share Card Generator
 * Developed by Lavish Tushir
 * 
 * Features:
 * - High-resolution Canvas snapshot card generator
 * - Displays Lavish Tushir's top streak, level, rank title, XP, and weekly rate
 * - 1-Click PNG file download for LinkedIn, Instagram stories, or project slides
 */

const ShareCardModule = (() => {
  function drawCard(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 800;
    const height = 480;
    canvas.width = width;
    canvas.height = height;

    const habits = StorageManager.getHabits();
    const gamification = StorageManager.getGamification();
    const levelInfo = GamificationEngine.getLevelInfo(gamification.xp);
    const todayStr = StreakEngine.getToday();

    let maxStreak = 0;
    let totalChecks = 0;
    let completedToday = 0;

    habits.forEach(h => {
      const dates = h.completedDates || [];
      totalChecks += dates.length;
      const s = StreakEngine.calculate(dates, todayStr, h.frequency, h.frozenDates);
      if (s.currentStreak > maxStreak) maxStreak = s.currentStreak;
      if (s.isCompletedToday) completedToday++;
    });

    const completionRate = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;
    const badgesCount = (gamification.badges || []).length;

    // --- 1. Background Gradient ---
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#1e1b4b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative Glow Orbs
    const glow1 = ctx.createRadialGradient(150, 100, 10, 150, 100, 200);
    glow1.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    glow1.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(650, 380, 10, 650, 380, 200);
    glow2.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
    glow2.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // Outer Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    roundRect(ctx, 16, 16, width - 32, height - 32, 24);
    ctx.stroke();

    // --- 2. Header Brand & Date ---
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#6366f1';
    ctx.fillText('🏃 Habit & Streak Tracker', 44, 60);

    const dateFormatted = new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    ctx.font = '600 14px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText(dateFormatted, width - 44, 60);
    ctx.textAlign = 'left';

    // Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(44, 80);
    ctx.lineTo(width - 44, 80);
    ctx.stroke();

    // --- 3. User Avatar & Title ---
    const currentUser = (typeof StorageManager !== 'undefined' && StorageManager.getCurrentUser) ? StorageManager.getCurrentUser() : null;
    const shareName = (currentUser && currentUser.name) ? currentUser.name : 'Lavish Tushir';

    ctx.font = '800 32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(shareName, 44, 130);

    ctx.font = '600 16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`Level ${levelInfo.level} · ${levelInfo.title} ${levelInfo.icon}  •  ${levelInfo.totalXP} Total XP`, 44, 160);

    // --- 4. 4 Metric Cards Grid ---
    const cardY = 195;
    const cardH = 145;
    const cardW = 162;
    const gap = 16;
    const startX = 44;

    const stats = [
      { label: 'TOP STREAK', val: `${maxStreak}d`, icon: '🔥', color: '#f59e0b' },
      { label: 'COMPLETED', val: `${totalChecks}`, icon: '✓', color: '#10b981' },
      { label: 'TODAY RATE', val: `${completionRate}%`, icon: '🎯', color: '#6366f1' },
      { label: 'TROPHIES', val: `${badgesCount}/8`, icon: '🏆', color: '#ec4899' }
    ];

    stats.forEach((st, idx) => {
      const cx = startX + idx * (cardW + gap);

      // Card Box
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      roundRect(ctx, cx, cardY, cardW, cardH, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.stroke();

      // Icon & Label
      ctx.font = '22px system-ui, -apple-system, sans-serif';
      ctx.fillText(st.icon, cx + 18, cardY + 38);

      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(st.label, cx + 18, cardY + 65);

      // Big Value
      ctx.font = '800 28px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = st.color;
      ctx.fillText(st.val, cx + 18, cardY + 112);
    });

    // --- 5. Motivational Quote Footer ---
    ctx.font = 'italic 14px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('“Success is the sum of small efforts, repeated day in and day out.”', 44, 395);

    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Discipline & Consistency Dashboard • 100% Offline Habit Tracker', 44, 430);
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function openShareModal() {
    const modal = document.getElementById('share-modal');
    const canvas = document.getElementById('share-card-canvas');
    if (!modal || !canvas) return;

    drawCard(canvas);
    modal.classList.add('modal-open');
  }

  function downloadPNG() {
    const canvas = document.getElementById('share-card-canvas');
    if (!canvas) return;

    const currentUser = (typeof StorageManager !== 'undefined' && StorageManager.getCurrentUser) ? StorageManager.getCurrentUser() : null;
    const rawName = (currentUser && currentUser.name) ? currentUser.name : 'streak';
    const safeName = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'streak';

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${safeName}-streak-${StreakEngine.getToday()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    NotificationManager.showToast('Card Downloaded! 📸', 'Your streak snapshot image has been saved to your downloads.', 'success');
  }

  return {
    drawCard,
    openShareModal,
    downloadPNG
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShareCardModule;
}
