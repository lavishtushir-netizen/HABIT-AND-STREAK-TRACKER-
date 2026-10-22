-- ============================================================================
-- Habit & Streak Tracker - Fail-Proof Supabase SQL Setup
-- Developed by Lavish Tushir
-- ============================================================================

-- Clean reset any partially created tables
DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS habits CASCADE;

-- 1. Create Habits Table
CREATE TABLE habits (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Lifestyle',
    emoji TEXT DEFAULT '⚡',
    color TEXT DEFAULT '#6366f1',
    frequency TEXT DEFAULT 'daily',
    reminder_time TEXT DEFAULT '09:00',
    reminder_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Check-ins Table
CREATE TABLE check_ins (
    id BIGSERIAL PRIMARY KEY,
    habit_id TEXT REFERENCES habits(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(habit_id, date)
);

-- 3. Create Daily Reflection Journal Table
CREATE TABLE journal_entries (
    id TEXT PRIMARY KEY,
    habit_id TEXT REFERENCES habits(id) ON DELETE SET NULL,
    mood TEXT DEFAULT '🚀',
    note_text TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Disable RLS to allow instant read/write connection without policy blocks
ALTER TABLE habits DISABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;
