use rusqlite::{params, Connection, OptionalExtension, Result, Row};

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
pub fn update_camera_ip(conn: &Connection, token: &str, cam_ip: &str) -> Result<bool> {
    let n = conn.execute(
        "UPDATE cameras SET cam_ip = ?1 WHERE token = ?2 AND usuario_id IS NOT NULL",
        params![cam_ip, token],
    )?;
    Ok(n > 0)
}

/// `(camera_id, usuario_id)` se o token for válido e a câmera tiver dono.
pub fn get_camera_by_token(conn: &Connection, token: &str) -> Result<Option<(i64, i64)>> {
    let mut stmt = conn.prepare(
        "SELECT id, usuario_id FROM cameras WHERE token = ?1 AND usuario_id IS NOT NULL",
    )?;
    stmt.query_row(params![token], |r| Ok((r.get(0)?, r.get(1)?)))
        .optional()
}

pub fn insert_usuario(conn: &Connection, nome: &str, email: &str, senha_hash: &str) -> Result<i64> {
    conn.execute(
        "INSERT INTO usuarios (nome, email, senha_hash) VALUES (?1, ?2, ?3)",
        params![nome, email, senha_hash],
    )?;
    Ok(conn.last_insert_rowid())
}

/// (id, nome, email, senha_hash) para login.
pub fn get_usuario_by_email(
    conn: &Connection,
    email: &str,
) -> Result<Option<(i64, String, String, String)>> {
    let mut stmt = conn.prepare(
        "SELECT id, nome, email, senha_hash FROM usuarios WHERE lower(email) = lower(?1)",
    )?;
    stmt.query_row(params![email], |r| {
        Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))
    })
    .optional()
}

/// (id, nome, email, criado_em)
pub fn get_usuario_public(conn: &Connection, id: i64) -> Result<Option<(i64, String, String, String)>> {
    let mut stmt = conn.prepare(
        "SELECT id, nome, email, criado_em FROM usuarios WHERE id = ?1",
    )?;
    stmt.query_row(params![id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)))
        .optional()
}

struct UsuarioRow {
    nome: String,
    email: String,
    senha_hash: String,
}

fn get_usuario_full(conn: &Connection, id: i64) -> Result<Option<UsuarioRow>> {
    let mut stmt = conn.prepare(
        "SELECT nome, email, senha_hash FROM usuarios WHERE id = ?1",
    )?;
    stmt.query_row(params![id], |r| {
        Ok(UsuarioRow {
            nome: r.get(0)?,
            email: r.get(1)?,
            senha_hash: r.get(2)?,
        })
    })
    .optional()
}

/// Verifica se outro utilizador já usa este email.
pub fn email_taken_by_other(conn: &Connection, email: &str, exclude_id: i64) -> Result<bool> {
    let n: i64 = conn.query_row(
        "SELECT COUNT(*) FROM usuarios WHERE lower(email) = lower(?1) AND id != ?2",
        params![email, exclude_id],
        |r| r.get(0),
    )?;
    Ok(n > 0)
}

pub fn update_usuario(
    conn: &Connection,
    id: i64,
    nome: Option<&str>,
    email: Option<&str>,
    senha_hash: Option<&str>,
) -> Result<bool> {
    let Some(row) = get_usuario_full(conn, id)? else {
        return Ok(false);
    };

    let nome = nome.unwrap_or(row.nome.as_str());
    let email = email.unwrap_or(row.email.as_str());
    let senha_hash = senha_hash.unwrap_or(row.senha_hash.as_str());

    let n = conn.execute(
        "UPDATE usuarios SET nome = ?1, email = ?2, senha_hash = ?3 WHERE id = ?4",
        params![nome, email, senha_hash, id],
    )?;
    Ok(n > 0)
}

pub fn delete_usuario(conn: &Connection, id: i64) -> Result<bool> {
    let n = conn.execute("DELETE FROM usuarios WHERE id = ?1", params![id])?;
    Ok(n > 0)
}

// --- câmeras (donos: usuario_id) ---

pub fn insert_camera(
    conn: &Connection,
    usuario_id: i64,
    nome: Option<&str>,
    token: &str,
) -> Result<i64> {
    conn.execute(
        "INSERT INTO cameras (nome, token, usuario_id) VALUES (?1, ?2, ?3)",
        params![nome, token, usuario_id],
    )?;
    Ok(conn.last_insert_rowid())
}

fn row_to_camera_public(row: &Row<'_>) -> Result<(i64, Option<String>, Option<String>, String)> {
    Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
}

/// Lista câmeras do utilizador (sem expor `token`).
pub fn list_cameras_for_user(
    conn: &Connection,
    usuario_id: i64,
) -> Result<Vec<(i64, Option<String>, Option<String>, String)>> {
    let mut stmt = conn.prepare(
        "SELECT id, nome, cam_ip, criado_em FROM cameras WHERE usuario_id = ?1 ORDER BY id",
    )?;
    let rows = stmt.query_map(params![usuario_id], |r| row_to_camera_public(r))?;
    rows.collect()
}

/// Uma câmera se pertencer ao utilizador (sem `token`).
pub fn get_camera_for_owner(
    conn: &Connection,
    camera_id: i64,
    usuario_id: i64,
) -> Result<Option<(i64, Option<String>, Option<String>, String)>> {
    let mut stmt = conn.prepare(
        "SELECT id, nome, cam_ip, criado_em FROM cameras WHERE id = ?1 AND usuario_id = ?2",
    )?;
    stmt.query_row(params![camera_id, usuario_id], |r| row_to_camera_public(r))
        .optional()
}

/// Lê câmera do dono incluindo token (ex.: resposta imediata após INSERT).
pub fn get_camera_for_owner_with_token(
    conn: &Connection,
    camera_id: i64,
    usuario_id: i64,
) -> Result<Option<(i64, Option<String>, Option<String>, String, String)>> {
    let mut stmt = conn.prepare(
        "SELECT id, nome, cam_ip, criado_em, token FROM cameras WHERE id = ?1 AND usuario_id = ?2",
    )?;
    stmt.query_row(params![camera_id, usuario_id], |r| {
        Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?))
    })
    .optional()
}

pub fn update_camera_nome_for_owner(
    conn: &Connection,
    camera_id: i64,
    usuario_id: i64,
    nome: Option<&str>,
) -> Result<bool> {
    let n = conn.execute(
        "UPDATE cameras SET nome = ?1 WHERE id = ?2 AND usuario_id = ?3",
        params![nome, camera_id, usuario_id],
    )?;
    Ok(n > 0)
}

pub fn delete_camera_for_owner(
    conn: &Connection,
    camera_id: i64,
    usuario_id: i64,
) -> Result<bool> {
    let n = conn.execute(
        "DELETE FROM cameras WHERE id = ?1 AND usuario_id = ?2",
        params![camera_id, usuario_id],
    )?;
    Ok(n > 0)
}
