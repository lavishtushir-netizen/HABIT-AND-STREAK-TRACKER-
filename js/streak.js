/**
 * Habit & Streak Tracker - Streak Calculation Engine
 * Developed by Lavish Tushir
 * 
 * Handles bulletproof streak calculation:
 * - Current streak (active today, at-risk from yesterday, or protected by streak freeze)
 * - Best / longest all-time streak
 * - Midnight and timezone-safe date normalization (YYYY-MM-DD in local time)
 * - Flexible frequencies (Daily, Weekdays only, Weekends only, 3x per week)
 * - Streak Freeze protection bridges
 */

const StreakEngine = (() => {
  /**
   * Format a Date object into a local 'YYYY-MM-DD' string.
   */
  function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      date = new Date();
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get today's local date string
   */
  function getToday() {
    return formatDate(new Date());
  }

  /**
   * Get yesterday's local date string
   */
  function getYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDate(d);
  }

  /**
   * Parse 'YYYY-MM-DD' into a local Date object set at 12:00:00 (noon)
   * to prevent daylight saving / midnight boundary shifts.
   */
  function parseDateString(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0, 0);
  }

  /**
   * Calculate difference in calendar days between two 'YYYY-MM-DD' strings
   */
  function dayDifference(dateStrA, dateStrB) {
    const dateA = parseDateString(dateStrA);
    const dateB = parseDateString(dateStrB);
    if (!dateA || !dateB) return 0;
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((dateB.getTime() - dateA.getTime()) / msPerDay);
  }

  /**
   * Check if a date is a required active day based on frequency
   */
  function isRequiredDay(dateObj, frequency = 'daily') {
    if (!(dateObj instanceof Date)) return true;
    const day = dateObj.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    if (frequency === 'weekdays') {
      return day >= 1 && day <= 5;
    } else if (frequency === 'weekends') {
      return day === 0 || day === 6;
    }
    return true; // 'daily' or '3days'
  }

  /**
   * Calculate current streak, best streak, and streak status
   * 
   * @param {string[]} completedDates - Array of 'YYYY-MM-DD' date strings
   * @param {string} [referenceDateStr] - Defaults to today's date
   * @param {string} [frequency] - 'daily' | 'weekdays' | 'weekends' | '3days'
   * @param {string[]} [frozenDates] - Array of 'YYYY-MM-DD' dates protected by freeze
   * @returns {Object} { currentStreak, bestStreak, isCompletedToday, status, totalCompleted, isDueToday }
   */
  function calculate(completedDates = [], referenceDateStr = getToday(), frequency = 'daily', frozenDates = []) {
    const completedSet = new Set(
      (Array.isArray(completedDates) ? completedDates : []).filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    );
    const frozenSet = new Set(
      (Array.isArray(frozenDates) ? frozenDates : []).filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    );

    // Any date that is completed OR frozen counts as satisfied for the streak chain
    const satisfiedSet = new Set([...completedSet, ...frozenSet]);

    const refDate = parseDateString(referenceDateStr) || new Date();
    const todayStr = referenceDateStr;
    const isDueToday = isRequiredDay(refDate, frequency);
    const isCompletedToday = completedSet.has(todayStr);
    const isFrozenToday = frozenSet.has(todayStr);

    if (satisfiedSet.size === 0) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        isCompletedToday: false,
        status: 'inactive',
        totalCompleted: 0,
        isDueToday
      };
    }

    // --- 1. Current Streak Calculation ---
    let currentStreak = 0;
    let status = 'inactive';

    if (isCompletedToday || isFrozenToday) {
      currentStreak = 1;
      status = isFrozenToday ? 'frozen' : 'active';

      let checkDate = new Date(refDate);
      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        // If this day wasn't required for this habit's frequency (e.g. weekend for weekdays habit), skip without breaking
        if (!isRequiredDay(checkDate, frequency)) {
          continue;
        }

        const prevDateStr = formatDate(checkDate);
        if (satisfiedSet.has(prevDateStr)) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else {
      // Not completed today. Find the last required day before today.
      let checkDate = new Date(refDate);
      let lastRequiredDate = null;

      // Look back up to 7 days to find the last required day
      for (let i = 1; i <= 7; i++) {
        const d = new Date(refDate);
        d.setDate(d.getDate() - i);
        if (isRequiredDay(d, frequency)) {
          lastRequiredDate = d;
          break;
        }
      }

      if (lastRequiredDate) {
        const lastRequiredStr = formatDate(lastRequiredDate);
        if (satisfiedSet.has(lastRequiredStr)) {
          // Last required day was satisfied!
          // If habit is due today, streak is at risk. If not due today (e.g. weekend), streak is safe/active!
          currentStreak = 1;
          status = isDueToday ? 'at_risk' : 'active';

          let walkDate = new Date(lastRequiredDate);
          while (true) {
            walkDate.setDate(walkDate.getDate() - 1);
            if (!isRequiredDay(walkDate, frequency)) {
              continue;
            }
            const prevStr = formatDate(walkDate);
            if (satisfiedSet.has(prevStr)) {
              currentStreak++;
            } else {
              break;
            }
          }
        } else {
          currentStreak = 0;
          status = 'inactive';
        }
      } else {
        currentStreak = 0;
        status = 'inactive';
      }
    }

    // --- 2. Best Streak (All-Time Longest) Calculation ---
    const sortedSatisfied = Array.from(satisfiedSet).sort();
    let bestStreak = 0;

    if (sortedSatisfied.length > 0) {
      bestStreak = 1;
      let runningStreak = 1;

      for (let i = 1; i < sortedSatisfied.length; i++) {
        const prevStr = sortedSatisfied[i - 1];
        const currStr = sortedSatisfied[i];
        const prevD = parseDateString(prevStr);
        const currD = parseDateString(currStr);

        // Count how many required days between prevD and currD
        let requiredDaysBetween = 0;
        let d = new Date(prevD);
        d.setDate(d.getDate() + 1);
        while (d < currD) {
          if (isRequiredDay(d, frequency)) {
            requiredDaysBetween++;
          }
          d.setDate(d.getDate() + 1);
        }

        if (requiredDaysBetween === 0) {
          // Consecutive required days
          runningStreak++;
        } else {
          runningStreak = 1;
        }

        if (runningStreak > bestStreak) {
          bestStreak = runningStreak;
        }
      }
    }

    if (currentStreak > bestStreak) {
      bestStreak = currentStreak;
    }

    return {
      currentStreak,
      bestStreak,
      isCompletedToday,
      status,
      totalCompleted: completedSet.size,
      isDueToday
    };
  }

  /**
   * Get an array of past N dates ending today (in ascending order)
   */
  function getRecentDateRange(numDays = 7, endDateStr = getToday()) {
    const dates = [];
    const endDate = parseDateString(endDateStr) || new Date();
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      dates.push(formatDate(d));
    }
    return dates;
  }

  /**
   * Get days of the current week (Monday through Sunday)
   */
  function getCurrentWeekDates(referenceDate = new Date()) {
    const curr = new Date(referenceDate);
    const dayOfWeek = curr.getDay(); // 0 is Sunday, 1 is Monday ...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMonday);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push({
        dateStr: formatDate(d),
        dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        dayNumber: d.getDate(),
        isToday: formatDate(d) === getToday()
      });
    }
    return weekDates;
  }

  return {
    formatDate,
    getToday,
    getYesterday,
    parseDateString,
    dayDifference,
    isRequiredDay,
    calculate,
    getRecentDateRange,
    getCurrentWeekDates
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StreakEngine;
}
