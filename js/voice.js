/**
 * Habit & Streak Tracker - Voice AI Assistant (STT & TTS)
 * Developed by Lavish Tushir
 * 
 * Features:
 * - Speech-to-Text via Web Speech Recognition API
 * - Intelligent Natural Language Intent & Keyword Matcher
 * - Automatic Habit Check-in & Creation
 * - Spoken Voice Audio Feedback via Web SpeechSynthesis (TTS)
 * - Text write-in fallback for non-mic environments
 */

const VoiceAssistant = (() => {
  let recognition = null;
  let isListening = false;
  let currentTranscript = '';

  // Common synonym map to enhance natural voice matching
  const KEYWORD_MAP = {
    water: ['water', 'drink', 'drank', 'drinking', 'hydrated', 'hydration', 'liters', 'glass', 'glasses'],
    code: ['code', 'coding', 'coded', 'program', 'programming', 'programmed', 'buildlab', 'developer', 'python', 'javascript'],
    workout: ['workout', 'worked out', 'exercise', 'exercised', 'gym', 'pushup', 'pushups', 'running', 'ran', 'run', 'stretch', 'stretching', 'fitness'],
    reading: ['read', 'reading', 'book', 'books', 'pages', 'chapter', 'atomic habits', 'study', 'studying'],
    meditation: ['meditate', 'meditated', 'meditation', 'mindfulness', 'breathe', 'breathing', 'zen', 'relax']
  };

  /**
   * Initialize Speech Recognition if supported
   */
  function init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          isListening = true;
          updateVoiceUIState('listening');
        };

        recognition.onresult = (event) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              currentTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const display = document.getElementById('voice-transcript-text');
          if (display) {
            display.textContent = `“${currentTranscript || interimTranscript || 'Listening...'}”`;
          }
        };

        recognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
          isListening = false;
          updateVoiceUIState('error', `Microphone note: ${event.error}. You can also type below!`);
        };

        recognition.onend = () => {
          isListening = false;
          if (currentTranscript.trim()) {
            processSpokenText(currentTranscript.trim());
          } else {
            updateVoiceUIState('idle', 'No speech detected. Tap the mic and speak clearly!');
          }
        };
      } catch (e) {
        console.warn('Speech recognition init error:', e);
      }
    }
  }

  /**
   * Start listening
   */
  function startListening() {
    currentTranscript = '';
    const display = document.getElementById('voice-transcript-text');
    if (display) display.textContent = '“Listening... Speak now!”';

    if (!recognition) {
      updateVoiceUIState('unsupported', 'Browser speech recognition not available. Please type your update below!');
      return;
    }

    try {
      recognition.start();
    } catch (e) {
      // If already started or blocked
      try {
        recognition.stop();
        setTimeout(() => recognition.start(), 200);
      } catch (err) {
        updateVoiceUIState('idle', 'Tap to speak what you did today!');
      }
    }
  }

  /**
   * Stop listening
   */
  function stopListening() {
    if (recognition && isListening) {
      try {
        recognition.stop();
      } catch (e) {}
    }
    isListening = false;
  }

  /**
   * Speak back to user using Web SpeechSynthesis (TTS)
   */
  function speakResponse(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      // Pick clean natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex')));
      if (preferred) utterance.voice = preferred;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS playback error:', e);
    }
  }

  /**
   * Natural Language Matcher: parses text and automatically checks off habits
   */
  function processSpokenText(rawText) {
    if (!rawText || !rawText.trim()) return;

    updateVoiceUIState('processing', `Processing: “${rawText}”`);
    const cleanText = rawText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    const tokens = cleanText.split(/\s+/);
    const todayStr = StreakEngine.getToday();
    const habits = StorageManager.getHabits();

    // 1. Check if user wants to create a new habit: e.g. "Add habit Read 20 pages"
    if (cleanText.startsWith('add habit') || cleanText.startsWith('create habit') || cleanText.startsWith('new habit')) {
      let title = rawText.replace(/^(add habit|create habit|new habit)\s*/i, '').trim();
      if (title) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
        const newHabit = StorageManager.saveHabit({
          title,
          category: 'Lifestyle',
          emoji: '🎯',
          color: '#6366f1',
          frequency: 'daily',
          reminderTime: '09:00',
          reminderEnabled: false
        });

        const reply = `Created new habit: ${title}! It is ready on your dashboard.`;
        updateVoiceUIState('success', reply);
        speakResponse(`Awesome! Added new habit ${title}.`);
        NotificationManager.playCheckinSound();
        NotificationManager.showToast('Habit Created via Voice! 🎙️', title, 'success');

        if (window.App && typeof window.App.render === 'function') {
          window.App.render();
        }
        return;
      }
    }

    // 2. Match spoken words against existing habits
    const matchedHabits = [];

    habits.forEach(habit => {
      const hTitle = habit.title.toLowerCase();
      const hCategory = habit.category.toLowerCase();
      let isMatch = false;

      // Direct match
      if (cleanText.includes(hTitle) || hTitle.includes(cleanText)) {
        isMatch = true;
      }

      // Check title keywords
      const titleWords = hTitle.split(/\s+/).filter(w => w.length > 2);
      for (const w of titleWords) {
        if (tokens.includes(w)) {
          isMatch = true;
          break;
        }
      }

      // Check synonym maps
      for (const [key, synonyms] of Object.entries(KEYWORD_MAP)) {
        const habitHasKey = hTitle.includes(key) || hCategory.includes(key);
        if (habitHasKey) {
          const spokenHasSynonym = synonyms.some(syn => cleanText.includes(syn));
          if (spokenHasSynonym) {
            isMatch = true;
            break;
          }
        }
      }

      if (isMatch) {
        matchedHabits.push(habit);
      }
    });

    if (matchedHabits.length > 0) {
      let newlyCheckedNames = [];

      matchedHabits.forEach(habit => {
        const isDone = Array.isArray(habit.completedDates) && habit.completedDates.includes(todayStr);
        if (!isDone) {
          StorageManager.toggleHabitDate(habit.id, todayStr);
          newlyCheckedNames.push(habit.title);
        } else {
          newlyCheckedNames.push(`${habit.title} (already done)`);
        }
      });

      // Feedback
      NotificationManager.playCheckinSound();
      if (window.App && typeof window.App.triggerConfetti === 'function') {
        window.App.triggerConfetti();
      }

      const spokenTitles = matchedHabits.map(h => h.title).join(' and ');
      const currentUser = (typeof StorageManager !== 'undefined' && StorageManager.getCurrentUser) ? StorageManager.getCurrentUser() : null;
      const firstName = (currentUser && currentUser.name) ? currentUser.name.trim().split(' ')[0] : 'friend';
      const responseSpeech = `Awesome job, ${firstName}! Marked ${spokenTitles} as completed for today.`;
      
      updateVoiceUIState('success', `✅ Completed: ${newlyCheckedNames.join(', ')}`);
      speakResponse(responseSpeech);
      NotificationManager.showToast('Voice Check-In Successful! 🎙️', `Marked ${spokenTitles} as done!`, 'streak', 5000);

      if (window.App && typeof window.App.render === 'function') {
        window.App.render();
      }

      // Auto close modal after 3 seconds on success
      setTimeout(() => {
        closeVoiceModal();
      }, 3000);

    } else {
      const fallbackReply = `Heard “${rawText}”, but couldn't match any active habit. Try saying e.g. “I drank water” or “Finished coding”.`;
      updateVoiceUIState('idle', fallbackReply);
      speakResponse("I couldn't match a habit with that. Try saying what you did, like: I drank water today.");
    }
  }

  /**
   * Update visual state in the Voice Modal
   */
  function updateVoiceUIState(state, message = '') {
    const micBtn = document.getElementById('voice-mic-main-btn');
    const statusText = document.getElementById('voice-status-label');
    const waveBox = document.getElementById('voice-wave-animation');

    if (micBtn) {
      micBtn.classList.toggle('is-listening', state === 'listening');
      micBtn.classList.toggle('is-processing', state === 'processing');
    }

    if (waveBox) {
      waveBox.style.display = state === 'listening' ? 'flex' : 'none';
    }

    if (statusText) {
      if (message) {
        statusText.textContent = message;
      } else if (state === 'listening') {
        statusText.textContent = 'Listening... Speak what you accomplished today!';
      } else if (state === 'processing') {
        statusText.textContent = 'AI is analyzing your voice check-in...';
      } else {
        statusText.textContent = 'Tap the microphone or type below:';
      }
    }
  }

  /**
   * Modal Controls
   */
  function openVoiceModal() {
    const modal = document.getElementById('voice-modal');
    if (!modal) return;

    modal.classList.add('modal-open');
    updateVoiceUIState('idle', 'Tap the mic and say what you accomplished today:');
    const textInput = document.getElementById('voice-text-input');
    if (textInput) textInput.value = '';

    // Automatically begin listening
    setTimeout(() => {
      startListening();
    }, 300);
  }

  function closeVoiceModal() {
    stopListening();
    const modal = document.getElementById('voice-modal');
    if (modal) modal.classList.remove('modal-open');
  }

  return {
    init,
    startListening,
    stopListening,
    processSpokenText,
    openVoiceModal,
    closeVoiceModal,
    speakResponse
  };
})();

// Auto initialize on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  VoiceAssistant.init();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceAssistant;
}
