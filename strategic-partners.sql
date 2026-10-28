-- Referência de esquema para o CRM estratégico Energy Business.
-- Em produção, estas tabelas já foram criadas no Cloudflare D1.
-- NOTA: manager_accounts recebeu as colunas display_name e role via ALTER TABLE.
-- Novas instalações devem adicionar essas colunas na definição inicial de manager_accounts.
CREATE TABLE IF NOT EXISTS strategic_partners (
 id TEXT PRIMARY KEY,
 category TEXT NOT NULL DEFAULT 'clube',
 name TEXT NOT NULL,
 club_id TEXT,
 status TEXT NOT NULL DEFAULT 'pendente',
 fan_count INTEGER,
 club_discount_percent REAL,
 energy_return_percent REAL,
 club_share_percent REAL,
 potential_accounts INTEGER,
 monthly_bill_estimate REAL,
 contact_name TEXT NOT NULL DEFAULT '',
 contact_phone TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '',
 created_by TEXT NOT NULL,
 updated_by TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now')),
 is_test INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_club ON strategic_partners(club_id) WHERE club_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_status ON strategic_partners(status);
CREATE TABLE IF NOT EXISTS partner_history (
 id TEXT PRIMARY KEY,
 partner_id TEXT NOT NULL,
 event TEXT NOT NULL,
 detail TEXT NOT NULL DEFAULT '',
 performed_by TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_partner_history ON partner_history(partner_id,created_at DESC);
