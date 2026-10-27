-- Estrutura base da Energy Business. Formulário público só após privacidade e Turnstile.
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  bill_amount INTEGER NOT NULL,
  discount_rate INTEGER NOT NULL,
  property_type TEXT NOT NULL,
  club_code TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'novo',
  notes TEXT NOT NULL DEFAULT '',
  favorite_club TEXT NOT NULL DEFAULT '',
  referral_code TEXT,
  referred_by_code TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status,created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_referral_code ON leads(referral_code);
CREATE INDEX IF NOT EXISTS idx_leads_referred_by ON leads(referred_by_code);
