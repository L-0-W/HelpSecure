use rusqlite::{params, Connection, Result};

/// Esquema inicial alinhado à tarefa (UML pode refinar depois).
pub fn init_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r"
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS cameras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            cam_ip TEXT,
            token TEXT NOT NULL UNIQUE,
            usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
            criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS locais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS visitantes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            documento TEXT,
            local_id INTEGER REFERENCES locais(id) ON DELETE SET NULL,
            criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
        ",
    )?;
    Ok(())
}

/// Atualiza o IP só se o token existir **e** a câmera estiver vendida/vinculada (`usuario_id` preenchido).
/// Evita que tokens órfãos ou de estoque sem dono alterem registros.
pub fn update_camera_ip(conn: &Connection, token: &str, cam_ip: &str) -> Result<bool> {
    let n = conn.execute(
        "UPDATE cameras SET cam_ip = ?1 WHERE token = ?2 AND usuario_id IS NOT NULL",
        params![cam_ip, token],
    )?;
    Ok(n > 0)
}
