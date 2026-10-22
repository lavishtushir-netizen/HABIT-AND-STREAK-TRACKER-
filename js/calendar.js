/**
 * Habit & Streak Tracker - Calendar & Heatmap Module
 * Developed by Lavish Tushir
 * 
 * Stretch Feature #3:
 * - GitHub-style Activity Heatmap (contribution grid)
 * - Interactive Monthly Calendar view with past check-in inspection & editing
 */

const CalendarModule = (() => {
  let calendarYear = new Date().getFullYear();
  let calendarMonth = new Date().getMonth(); // 0-indexed

  /**
   * Helper to get stats for a specific date
   */
  function getDateStats(habits, dateStr) {
    if (!habits || habits.length === 0) return { completedCount: 0, totalCount: 0, habitsCompleted: [] };
    const completed = habits.filter(h => Array.isArray(h.completedDates) && h.completedDates.includes(dateStr));
    return {
      completedCount: completed.length,
      totalCount: habits.length,
      habitsCompleted: completed
    };
  }

  /**
   * Render GitHub-style Activity Heatmap
   * Shows past 16 weeks (112 days) up to today
   */
  function renderHeatmap(containerElement, habits) {
    if (!containerElement) return;

    const today = new Date();
    const todayStr = StreakEngine.getToday();
    const weeksToShow = 18;
    const totalDays = weeksToShow * 7;

    // Determine the end date (end of current week, Sunday)
    const currentDayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
    const daysUntilSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysUntilSunday);

    // Calculate start date
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - totalDays + 1);

    // Build day list
    const days = [];
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const dStr = StreakEngine.formatDate(curr);
      const isFuture = dStr > todayStr;
      const stats = isFuture ? { completedCount: 0, totalCount: habits.length, habitsCompleted: [] } : getDateStats(habits, dStr);
      days.push({
        date: new Date(curr),
        dateStr: dStr,
        isFuture,
        isToday: dStr === todayStr,
        dayOfWeek: curr.getDay(),
        stats
      });
      curr.setDate(curr.getDate() + 1);
    }

    // Group into columns (weeks), each with 7 days (Mon=0 to Sun=6)
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    let maxPossible = Math.max(1, habits.length);

    let html = `
      <div class="heatmap-wrapper">
        <div class="heatmap-header">
          <div class="heatmap-title">
            <span class="heatmap-icon">🟩</span> Habit Consistency Heatmap (Past 18 Weeks)
          </div>
          <div class="heatmap-legend">
            <span>Less</span>
            <span class="legend-cell level-0"></span>
            <span class="legend-cell level-1"></span>
            <span class="legend-cell level-2"></span>
            <span class="legend-cell level-3"></span>
            <span class="legend-cell level-4"></span>
            <span>More</span>
          </div>
        </div>
        <div class="heatmap-grid-scroll">
          <div class="heatmap-grid">
            <div class="heatmap-day-labels">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
              <span>Sun</span>
            </div>
            <div class="heatmap-weeks">
    `;

    weeks.forEach(week => {
      html += `<div class="heatmap-week-col">`;
      week.forEach(day => {
        let level = 0;
        const count = day.stats.completedCount;
        if (!day.isFuture && count > 0) {
          const ratio = count / maxPossible;
          if (ratio <= 0.25) level = 1;
          else if (ratio <= 0.5) level = 2;
          else if (ratio <= 0.75) level = 3;
          else level = 4;
        }

        const dateFormatted = day.date.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });

        const tooltipText = day.isFuture
          ? `${dateFormatted} (Future)`
          : `${day.stats.completedCount} of ${habits.length} habits done on ${dateFormatted}`;

        html += `
          <div class="heatmap-cell level-${level} ${day.isToday ? 'cell-today' : ''} ${day.isFuture ? 'cell-future' : ''}" 
               data-date="${day.dateStr}" 
               data-tooltip="${tooltipText}"
               title="${tooltipText}">
          </div>
        `;
      });
      html += `</div>`;
    });

    html += `
            </div>
          </div>
        </div>
      </div>
    `;

    containerElement.innerHTML = html;

    // Attach click listeners to heatmap cells
    containerElement.querySelectorAll('.heatmap-cell:not(.cell-future)').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.getAttribute('data-date');
        openDateInspectionModal(dateStr);
      });
    });
  }

  /**
   * Render Monthly Calendar View
   */
  function renderCalendar(containerElement, habits) {
    if (!containerElement) return;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
    const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Day of week for 1st of month: 0=Sun, 1=Mon... Adjust to Monday-start (0=Mon, 6=Sun)
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const todayStr = StreakEngine.getToday();

    let html = `
      <div class="calendar-card">
        <div class="calendar-nav-bar">
          <div class="calendar-title-group">
            <h3 class="calendar-month-title">${monthNames[calendarMonth]} ${calendarYear}</h3>
            <span class="calendar-badge">Interactive Month View</span>
          </div>
          <div class="calendar-controls">
            <button class="cal-btn" id="cal-prev-btn" title="Previous Month">&larr; Prev</button>
            <button class="cal-btn" id="cal-today-btn" title="Jump to Today">Today</button>
            <button class="cal-btn" id="cal-next-btn" title="Next Month">Next &rarr;</button>
          </div>
        </div>

        <div class="calendar-table">
          <div class="cal-weekdays">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
          <div class="cal-days-grid">
    `;

    // Empty lead cells
    for (let i = 0; i < startDay; i++) {
      html += `<div class="cal-day-cell cal-cell-empty"></div>`;
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dObj = new Date(calendarYear, calendarMonth, day);
      const dateStr = StreakEngine.formatDate(dObj);
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      const stats = isFuture ? { completedCount: 0, totalCount: habits.length, habitsCompleted: [] } : getDateStats(habits, dateStr);

      const completionPercent = habits.length > 0 ? Math.round((stats.completedCount / habits.length) * 100) : 0;
      const isAllDone = habits.length > 0 && stats.completedCount === habits.length;

      let habitEmojis = stats.habitsCompleted.slice(0, 3).map(h => h.emoji || '•').join('');
      if (stats.habitsCompleted.length > 3) {
        habitEmojis += `+${stats.habitsCompleted.length - 3}`;
      }

      html += `
        <div class="cal-day-cell ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''} ${isAllDone ? 'is-all-done' : ''}" 
             data-date="${dateStr}">
          <div class="cal-day-header">
            <span class="cal-day-num">${day}</span>
            ${stats.completedCount > 0 ? `<span class="cal-day-score">${stats.completedCount}/${habits.length}</span>` : ''}
          </div>
          <div class="cal-day-body">
            ${stats.completedCount > 0 ? `<div class="cal-habit-icons">${habitEmojis}</div>` : ''}
            ${stats.completedCount > 0 ? `
              <div class="cal-progress-mini">
                <div class="cal-progress-fill" style="width: ${completionPercent}%"></div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    html += `
          </div>
        </div>
      </div>
    `;

    containerElement.innerHTML = html;

    // Attach control buttons
    document.getElementById('cal-prev-btn')?.addEventListener('click', () => {
      calendarMonth--;
      if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
      }
      renderCalendar(containerElement, StorageManager.getHabits());
    });

    document.getElementById('cal-next-btn')?.addEventListener('click', () => {
      calendarMonth++;
      if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
      }
      renderCalendar(containerElement, StorageManager.getHabits());
    });

    document.getElementById('cal-today-btn')?.addEventListener('click', () => {
      calendarYear = new Date().getFullYear();
      calendarMonth = new Date().getMonth();
      renderCalendar(containerElement, StorageManager.getHabits());
    });

    // Cell clicks
    containerElement.querySelectorAll('.cal-day-cell:not(.cal-cell-empty):not(.is-future)').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.getAttribute('data-date');
        openDateInspectionModal(dateStr);
      });
    });
  }

  /**
   * Opens date inspection & retroactive check-in modal
   */
  function openDateInspectionModal(dateStr) {
    if (window.App && typeof window.App.showDateModal === 'function') {
      window.App.showDateModal(dateStr);
    }
  }

  return {
    renderHeatmap,
    renderCalendar,
    getDateStats
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendarModule;
}
