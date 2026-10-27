
-- Cadastro de clubes administrado exclusivamente pelo painel.
-- is_active=0: rascunho/oculto; is_active=1: pode aparecer como preferência no site.
-- Ativo NÃO significa clube conveniado ou pagamento de benefícios.
CREATE TABLE IF NOT EXISTS clubs (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL COLLATE NOCASE UNIQUE,
 state TEXT NOT NULL DEFAULT '',
 is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clubs_active_name ON clubs(is_active,name);
