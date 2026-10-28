-- Endereços externos cadastrados e validados pela gestão; nenhuma confirmação automática de convênio.
CREATE TABLE IF NOT EXISTS club_destinations (
 club_id TEXT PRIMARY KEY,
 site_url TEXT NOT NULL,
 link_verified INTEGER NOT NULL DEFAULT 0 CHECK(link_verified IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
