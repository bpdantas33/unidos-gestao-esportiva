-- ESQUEMA SUPABASE PARA UNIDOS FC
-- Cole isso no SQL Editor do Supabase (Dashboard → SQL Editor → New Query)
-- Depois clique em "Run" (▶)

-- 1. TABELAS (camelCase para 1:1 com os tipos TypeScript)

CREATE TABLE IF NOT EXISTS "players" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  number INTEGER DEFAULT 0,
  position TEXT DEFAULT '',
  country TEXT DEFAULT '',
  age INTEGER DEFAULT 0,
  rating INTEGER DEFAULT 75,
  condition INTEGER DEFAULT 100,
  "isInjured" BOOLEAN DEFAULT FALSE,
  "injuryNote" TEXT DEFAULT '',
  games INTEGER DEFAULT 0,
  goals INTEGER,
  "cleanSheets" INTEGER,
  tackles INTEGER,
  image TEXT DEFAULT '',
  squad TEXT DEFAULT 'Master',
  "birthDate" TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  pin TEXT DEFAULT '',
  "mustChangePin" BOOLEAN DEFAULT FALSE,
  "isBoardMember" BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "matches" (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT '',
  "homeTeam" TEXT DEFAULT '',
  "homeLogo" TEXT DEFAULT '',
  "awayTeam" TEXT DEFAULT '',
  "awayLogo" TEXT DEFAULT '',
  "homeScore" INTEGER,
  "awayScore" INTEGER,
  "isConfirmed" BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'CONFIRMADO',
  time TEXT DEFAULT '',
  stadium TEXT DEFAULT '',
  address TEXT DEFAULT '',
  scorers TEXT DEFAULT '',
  observation TEXT DEFAULT '',
  squad TEXT DEFAULT 'Master',
  "confirmedPlayers" JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS "transactions" (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT '',
  "expenseType" TEXT DEFAULT '',
  "chargedToPlayers" BOOLEAN DEFAULT FALSE,
  date TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  cancelled BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "unpaidMembers" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  "daysLate" INTEGER DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  image TEXT DEFAULT '',
  "isPaid" BOOLEAN DEFAULT FALSE,
  reason TEXT DEFAULT '',
  cancelled BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "standings" (
  id TEXT PRIMARY KEY,
  rank INTEGER DEFAULT 0,
  club TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  "logoText" TEXT DEFAULT '',
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  "goalDifference" INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  form JSONB DEFAULT '[]'::jsonb,
  squad TEXT DEFAULT 'Master'
);

CREATE TABLE IF NOT EXISTS "trainingLogs" (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT '',
  duration INTEGER DEFAULT 0,
  "playersCount" INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  squad TEXT DEFAULT 'Master'
);

CREATE TABLE IF NOT EXISTS "config" (
  id TEXT PRIMARY KEY DEFAULT 'app',
  "adminPassword" TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "confirmations" (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  data JSONB DEFAULT '{}'::jsonb
);

-- 2. HABILITAR REALTIME (para os 3 listeners ativos + futuros)

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS "players";
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS "matches";
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS "confirmations";
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS "transactions";
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS "unpaidMembers";
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS "standings";
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS "trainingLogs";
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS "config";
