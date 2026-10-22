/**
 * Habit & Streak Tracker - Daily Reflection Journal Module
 * Developed by Lavish Tushir
 * 
 * Features:
 * - Micro-reflections attached to habits and dates
 * - Interactive timeline feed
 * - Mood logging and search
 */

const JournalModule = (() => {
  let selectedHabitFilter = 'ALL';

  function renderJournalTimeline(container) {
    if (!container) return;

    const entries = StorageManager.getJournalEntries();
    const habits = StorageManager.getHabits();

    let filtered = entries;
    if (selectedHabitFilter !== 'ALL') {
      filtered = filtered.filter(e => e.habitId === selectedHabitFilter);
    }

    let html = `
      <div class="journal-header card-glass">
        <div class="journal-header-left">
          <span class="focus-date-badge">Daily Reflection Feed</span>
          <h2 class="section-title">Habit Journal & Memory Lane</h2>
          <p class="section-subtitle">Capture thoughts, progress notes, and mindset wins for each habit</p>
        </div>
        <button class="btn btn-primary" id="btn-open-journal-modal">
          <span class="btn-icon">✍️</span> New Entry
        </button>
      </div>

      <div class="journal-filter-bar card-glass">
        <div class="filter-group">
          <span class="filter-label">Filter by Habit:</span>
          <select id="journal-habit-filter" class="filter-select">
            <option value="ALL" ${selectedHabitFilter === 'ALL' ? 'selected' : ''}>All Habits (${entries.length})</option>
            ${habits.map(h => `
              <option value="${h.id}" ${selectedHabitFilter === h.id ? 'selected' : ''}>
                ${h.emoji || '⚡'} ${h.title}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <div class="journal-timeline-feed">
    `;

    if (filtered.length === 0) {
      html += `
        <div class="empty-state card-glass">
          <div class="empty-emoji">📖</div>
          <h4>No reflection notes yet</h4>
          <p>Add quick 1-2 sentence notes about your habit progress, energy levels, or wins!</p>
          <button class="btn btn-primary" id="btn-empty-journal">+ Write First Reflection</button>
        </div>
      `;
    } else {
      filtered.forEach(entry => {
        const formattedDate = new Date(entry.createdAt || entry.dateStr).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        html += `
          <div class="journal-card card-glass" data-entry-id="${entry.id}">
            <div class="journal-card-top">
              <div class="journal-meta-left">
                <span class="journal-mood">${entry.mood || '✨'}</span>
                <div>
                  <h4 class="journal-habit-title">${escapeHtml(entry.habitTitle || 'General')}</h4>
                  <span class="journal-date">${formattedDate}</span>
                </div>
              </div>
              <button class="icon-action-btn btn-delete-journal" data-del-note="${entry.id}" title="Delete note">🗑️</button>
            </div>
            <div class="journal-body-text">
              ${escapeHtml(entry.text)}
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
    container.innerHTML = html;

    // Attach listeners
    document.getElementById('btn-open-journal-modal')?.addEventListener('click', () => openJournalModal());
    document.getElementById('btn-empty-journal')?.addEventListener('click', () => openJournalModal());

    const filterSelect = document.getElementById('journal-habit-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        selectedHabitFilter = e.target.value;
        renderJournalTimeline(container);
      });
    }

    container.querySelectorAll('[data-del-note]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del-note');
        if (confirm('Delete this reflection entry?')) {
          StorageManager.deleteJournalEntry(id);
          NotificationManager.showToast('Note Deleted', 'The reflection entry was removed.', 'info');
          renderJournalTimeline(container);
        }
      });
    });
  }

  function openJournalModal(habitId = null) {
    const modal = document.getElementById('journal-modal');
    if (!modal) return;

    const habitSelect = document.getElementById('journal-modal-habit-select');
    const habits = StorageManager.getHabits();

    if (habitSelect) {
      habitSelect.innerHTML = habits.map(h => `
        <option value="${h.id}" ${habitId === h.id ? 'selected' : ''}>
          ${h.emoji || '⚡'} ${h.title}
        </option>
      `).join('');
    }

    const textInput = document.getElementById('journal-modal-text');
    if (textInput) textInput.value = '';

    modal.classList.add('modal-open');
    if (textInput) textInput.focus();
  }

  function saveEntryFromModal() {
    const habitSelect = document.getElementById('journal-modal-habit-select');
    const textInput = document.getElementById('journal-modal-text');
    const moodInput = document.getElementById('journal-modal-mood');

    const habitId = habitSelect ? habitSelect.value : null;
    const habit = StorageManager.getHabitById(habitId);
    const text = textInput ? textInput.value.trim() : '';
    const mood = moodInput ? moodInput.value : '🚀';

    if (!text) {
      alert('Please write a quick note.');
      return;
    }

    StorageManager.saveJournalEntry({
      habitId: habitId || 'general',
      habitTitle: habit ? habit.title : 'General Focus',
      dateStr: StreakEngine.getToday(),
      text,
      mood
    });

    GamificationEngine.addXP(15, 'Added reflection note');
    NotificationManager.showToast('Reflection Saved! ✍️', 'Your reflection note was saved to your habit timeline.', 'success');

    const modal = document.getElementById('journal-modal');
    if (modal) modal.classList.remove('modal-open');

    const container = document.getElementById('journal-content');
    if (container) renderJournalTimeline(container);
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
    renderJournalTimeline,
    openJournalModal,
    saveEntryFromModal
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JournalModule;
}
