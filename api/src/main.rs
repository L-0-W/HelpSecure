mod auth;
mod camera_ws;
mod db;

use std::collections::HashMap;
use std::io::Read;
use std::sync::{Arc, Mutex};

use auth::{hash_password, random_camera_token, sign_jwt, verify_jwt, verify_password};
use axum::{
    extract::{Request as AxumRequest, State},
    response::{IntoResponse, Response as AxumResponse},
    routing::{any, get},
    Router,
};
use camera_ws::ActiveCameras;
use db::{
    delete_camera_for_owner, delete_local_for_owner, delete_usuario, delete_visitante_for_owner,
    email_taken_by_other, get_camera_for_owner, get_camera_for_owner_with_token,
    get_local_for_owner, get_usuario_by_email, get_usuario_public, get_visitante_for_owner,
    init_schema, insert_camera, insert_local, insert_usuario, insert_visitante,
    list_cameras_for_user, list_locais, list_visitantes, update_camera_nome_for_owner,
    update_local_for_owner, update_usuario, update_visitante_for_owner,
};
use rusqlite::Connection;
use face_id::detector::ScrfdDetector;
use face_id::embedder::ArcFaceEmbedder;
use face_id::face_align::norm_crop;
use std::net::SocketAddr;
use tokio::net::TcpListener;

// --- MOCKS FOR TINY_HTTP ---
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum Method {
    Get,
    Post,
    Put,
    Delete,
    Options,
    Other(String),
}

pub struct Header {
    pub field: String,
    pub value: String,
}
impl Header {
    pub fn from_bytes(field: &[u8], value: &[u8]) -> Result<Self, ()> {
        Ok(Self {
            field: String::from_utf8_lossy(field).to_string(),
            value: String::from_utf8_lossy(value).to_string(),
        })
    }
}

pub struct Request {
    method: Method,
    url: String,
    headers: Vec<Header>,
    body: std::io::Cursor<Vec<u8>>,
}
impl Request {
    pub fn method(&self) -> &Method {
        &self.method
    }
    pub fn url(&self) -> &str {
        &self.url
    }
    pub fn headers(&self) -> &[Header] {
        &self.headers
    }
    pub fn as_reader(&mut self) -> &mut std::io::Cursor<Vec<u8>> {
        &mut self.body
    }
}

pub struct Response<R: std::io::Read> {
    pub status: u16,
    pub headers: Vec<Header>,
    pub body: R,
}
impl<R: std::io::Read> Response<R> {
    pub fn new(
        status: u16,
        headers: Vec<Header>,
        body: R,
        _un1: Option<usize>,
        _un2: Option<usize>,
    ) -> Self {
        Self {
            status,
            headers,
            body,
        }
    }
}

#[allow(non_snake_case)]
pub fn StatusCode(code: u16) -> u16 {
    code
}
// --- FIM DOS MOCKS ---

use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct JsonError {
    error: &'static str,
}

#[derive(Deserialize)]
struct CreateUsuarioBody {
    nome: String,
    email: String,
    senha: String,
}

#[derive(Deserialize)]
struct CreateVisitanteBody {
    nome: String,
    validade: String,
    local_id: Option<i64>,
    face_image_bytes: Option<Vec<u8>>,
}

#[derive(Deserialize)]
struct UpdateVisitanteBody {
    nome: Option<String>,
    validade: Option<String>,
    local_id: Option<i64>,
    face_image_bytes: Option<Vec<u8>>,
}

#[derive(Serialize)]
struct VisitantePublic {
    id: i64,
    nome: String,
    validade: Option<String>,
    local_id: Option<i64>,
    face_image_bytes: Option<Vec<u8>>,
    embedding: Option<String>,
}

#[derive(Serialize)]
struct VisitanteListResponse {
    visitantes: Vec<VisitantePublic>,
}

#[derive(Deserialize)]
struct CreateLocalBody {
    nome: String,
    descricao: Option<String>,
}

#[derive(Deserialize)]
struct UpdateLocalBody {
    nome: Option<String>,
    descricao: Option<String>,
}

#[derive(Serialize)]
struct LocalPublic {
    id: i64,
    nome: String,
    descricao: Option<String>,
}

#[derive(Serialize)]
struct LocalListResponse {
    locais: Vec<LocalPublic>,
}

#[derive(Deserialize)]
struct LoginBody {
    email: String,
    senha: String,
}

#[derive(Deserialize)]
struct UpdateUsuarioBody {
    nome: Option<String>,
    email: Option<String>,
    senha: Option<String>,
}

#[derive(Serialize)]
struct UsuarioPublic {
    id: i64,
    nome: String,
    email: String,
    criado_em: String,
}

#[derive(Deserialize)]
struct CreateCameraBody {
    nome: Option<String>,
    token: Option<String>,
}

#[derive(Deserialize)]
struct UpdateCameraBody {
    nome: Option<String>,
}

#[derive(Serialize)]
struct CameraPublic {
    id: i64,
    nome: Option<String>,
    cam_ip: Option<String>,
    criado_em: String,
}

/// Resposta ao criar câmera: inclui `token` **uma vez** (para gravar na ESP / mostrar no app).
#[derive(Serialize)]
struct CameraCreated {
    id: i64,
    nome: Option<String>,
    cam_ip: Option<String>,
    criado_em: String,
    token: String,
}

#[derive(Serialize)]
struct CameraListResponse {
    cameras: Vec<CameraPublic>,
}

#[derive(Serialize)]
struct AuthResponse {
    token: String,
    usuario: UsuarioPublic,
}

#[derive(Clone, Serialize)]
pub struct LogMessage {
    pub usuario_id: i64,
    pub camera_id: i64,
    pub message: String,
    pub timestamp: String,
    pub success: bool,
}

struct AppState {
    db: Arc<Mutex<Connection>>,
    jwt_secret: Vec<u8>,
    jwt_ttl_secs: u64,
    /// Partilhado com `camera_ws`: ligações autenticadas (para relay RN / diagnóstico).
    #[allow(dead_code)]
    active_cameras: ActiveCameras,
    detector: Arc<std::sync::Mutex<ScrfdDetector>>,
    embedder: Arc<std::sync::Mutex<ArcFaceEmbedder>>,
    log_sender: tokio::sync::broadcast::Sender<LogMessage>,
}

fn json_response<T: Serialize>(status: u16, body: &T) -> Response<std::io::Cursor<Vec<u8>>> {
    let bytes = serde_json::to_vec(body).unwrap_or_else(|_| b"{\"error\":\"serialize\"}".to_vec());
    Response::new(
        status,
        vec![Header::from_bytes(
            &b"Content-Type"[..],
            &b"application/json; charset=utf-8"[..],
        )
        .unwrap()],
        std::io::Cursor::new(bytes),
        None,
        None,
    )
}

fn bearer_user_jwt(req: &Request, secret: &[u8]) -> Result<i64, &'static str> {
    let h = req
        .headers()
        .iter()
        .find(|h| h.field.eq_ignore_ascii_case("authorization"))
        .ok_or("missing_bearer_token")?;
    let raw = h.value.as_str().trim();
    let prefix = "Bearer ";
    if raw.len() <= prefix.len() || !raw[..prefix.len()].eq_ignore_ascii_case(prefix) {
        return Err("missing_bearer_token");
    }
    let token = raw[prefix.len()..].trim();
    if token.is_empty() {
        return Err("empty_token");
    }
    verify_jwt(secret, token).map_err(|_| "invalid_token")
}

fn read_body(req: &mut Request) -> Vec<u8> {
    let mut buf = Vec::new();
    let _ = req.as_reader().read_to_end(&mut buf);
    buf
}

fn validate_email(email: &str) -> bool {
    let e = email.trim();
    e.contains('@') && e.len() >= 3
}

fn validate_password(senha: &str) -> bool {
    senha.len() >= 8
}

fn validate_nome(nome: &str) -> bool {
    !nome.trim().is_empty()
}

fn usuario_to_public(t: (i64, String, String, String)) -> UsuarioPublic {
    UsuarioPublic {
        id: t.0,
        nome: t.1,
        email: t.2,
        criado_em: t.3,
    }
}

fn issue_token(
    state: &AppState,
    user_id: i64,
) -> Result<String, Response<std::io::Cursor<Vec<u8>>>> {
    sign_jwt(&state.jwt_secret, user_id, state.jwt_ttl_secs).map_err(|_| {
        json_response(
            500,
            &JsonError {
                error: "token_create_failed",
            },
        )
    })
}

fn handle_post_usuarios(state: &AppState, body: &[u8]) -> Response<std::io::Cursor<Vec<u8>>> {
    let b: CreateUsuarioBody = match serde_json::from_slice(body) {
        Ok(x) => x,
        Err(_) => {
            return json_response(
                400,
                &JsonError {
                    error: "invalid_json",
                },
            );
        }
    };
    let nome = b.nome.trim();
    let email = b.email.trim();
    let senha = b.senha.as_str();

    if !validate_nome(nome) {
        return json_response(
            400,
            &JsonError {
                error: "invalid_nome",
            },
        );
    }
    if !validate_email(email) {
        return json_response(
            400,
            &JsonError {
                error: "invalid_email",
            },
        );
    }
    if !validate_password(senha) {
        return json_response(
            400,
            &JsonError {
                error: "weak_password",
            },
        );
    }

    let hash = match hash_password(senha) {
        Ok(h) => h,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "hash_failed",
                },
            );
        }
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    let id = match insert_usuario(&conn, nome, email, &hash) {
        Ok(id) => id,
        Err(e) if e.to_string().contains("UNIQUE") => {
            return json_response(
                409,
                &JsonError {
                    error: "email_in_use",
                },
            );
        }
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    let row = match get_usuario_public(&conn, id) {
        Ok(Some(r)) => r,
        _ => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    let token = match issue_token(state, id) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    json_response(
        201,
        &AuthResponse {
            token,
            usuario: usuario_to_public(row),
        },
    )
}

fn handle_post_login(state: &AppState, body: &[u8]) -> Response<std::io::Cursor<Vec<u8>>> {
    let b: LoginBody = match serde_json::from_slice(body) {
        Ok(x) => x,
        Err(_) => {
            return json_response(
                400,
                &JsonError {
                    error: "invalid_json",
                },
            );
        }
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    let row = match get_usuario_by_email(&conn, b.email.trim()) {
        Ok(Some(r)) => r,
        Ok(None) => {
            return json_response(
                401,
                &JsonError {
                    error: "invalid_credentials",
                },
            );
        }
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    if !verify_password(&b.senha, &row.3) {
        return json_response(
            401,
            &JsonError {
                error: "invalid_credentials",
            },
        );
    }

    let pub_row = match get_usuario_public(&conn, row.0) {
        Ok(Some(r)) => r,
        _ => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    let token = match issue_token(state, row.0) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    json_response(
        200,
        &AuthResponse {
            token,
            usuario: usuario_to_public(pub_row),
        },
    )
}

fn parse_usuario_id_path(path: &str) -> Option<i64> {
    let rest = path.strip_prefix("/usuarios/")?;
    let id_str = rest.split('/').next()?;
    id_str.parse().ok()
}

fn parse_camera_id_path(path: &str) -> Option<i64> {
    let rest = path.strip_prefix("/cameras/")?;
    let id_str = rest.split('/').next()?;
    id_str.parse().ok()
}

fn parse_local_id_path(path: &str) -> Option<i64> {
    let rest = path.strip_prefix("/locais/")?;
    let id_str = rest.split('/').next()?;
    id_str.parse().ok()
}

fn parse_visitante_id_path(path: &str) -> Option<i64> {
    let rest = path.strip_prefix("/visitantes/")?;
    let id_str = rest.split('/').next()?;
    id_str.parse().ok()
}

fn camera_row_to_public(t: (i64, Option<String>, Option<String>, String)) -> CameraPublic {
    CameraPublic {
        id: t.0,
        nome: t.1,
        cam_ip: t.2,
        criado_em: t.3,
    }
}

fn handle_post_locais(
    state: &AppState,
    req: &Request,
    body: &[u8],
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Post {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let b: CreateLocalBody = match serde_json::from_slice(body) {
        Ok(x) => x,
        Err(_) => {
            return json_response(
                400,
                &JsonError {
                    error: "invalid_json",
                },
            );
        }
    };

    if b.nome.trim().is_empty() {
        return json_response(
            400,
            &JsonError {
                error: "invalid_nome",
            },
        );
    }

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    let desc = b
        .descricao
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let lid = match insert_local(&conn, uid, b.nome.trim(), desc) {
        Ok(id) => id,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    json_response(
        201,
        &LocalPublic {
            id: lid,
            nome: b.nome.trim().to_string(),
            descricao: desc.map(String::from),
        },
    )
}

fn handle_get_locais(state: &AppState, req: &Request) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Get {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    let list = match list_locais(&conn, uid) {
        Ok(v) => v,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    let locais: Vec<LocalPublic> = list
        .into_iter()
        .map(|t| LocalPublic {
            id: t.0,
            nome: t.1,
            descricao: t.2,
        })
        .collect();

    json_response(200, &LocalListResponse { locais })
}

fn handle_get_local(
    state: &AppState,
    req: &Request,
    path: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Get {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let Some(lid) = parse_local_id_path(path) else {
        return json_response(404, &JsonError { error: "not_found" });
    };

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    match get_local_for_owner(&conn, lid, uid) {
        Ok(Some(r)) => json_response(
            200,
            &LocalPublic {
                id: r.0,
                nome: r.1,
                descricao: r.2,
            },
        ),
        Ok(None) => json_response(
            404,
            &JsonError {
                error: "local_not_found",
            },
        ),
        Err(_) => json_response(
            500,
            &JsonError {
                error: "database_error",
            },
        ),
    }
}

fn handle_put_local(
    state: &AppState,
    req: &Request,
    path: &str,
    body: &[u8],
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Put {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let Some(lid) = parse_local_id_path(path) else {
        return json_response(404, &JsonError { error: "not_found" });
    };

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let b: UpdateLocalBody = match serde_json::from_slice(body) {
        Ok(x) => x,
        Err(_) => {
            return json_response(
                400,
                &JsonError {
                    error: "invalid_json",
                },
            );
        }
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    let existing = match get_local_for_owner(&conn, lid, uid) {
        Ok(Some(r)) => r,
        Ok(None) => {
            return json_response(
                404,
                &JsonError {
                    error: "local_not_found",
                },
            );
        }
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    let new_nome = match b.nome.as_deref() {
        Some(n) => {
            if n.trim().is_empty() {
                return json_response(
                    400,
                    &JsonError {
                        error: "invalid_nome",
                    },
                );
            }
            n.trim().to_string()
        }
        None => existing.1,
    };

    let new_desc = match b.descricao {
        Some(ref d) => {
            let trimmed = d.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }
        None => existing.2,
    };

    match update_local_for_owner(&conn, lid, uid, &new_nome, new_desc.as_deref()) {
        Ok(true) => json_response(
            200,
            &LocalPublic {
                id: lid,
                nome: new_nome,
                descricao: new_desc,
            },
        ),
        _ => json_response(
            500,
            &JsonError {
                error: "database_error",
            },
        ),
    }
}

fn handle_delete_local(
    state: &AppState,
    req: &Request,
    path: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Delete {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let Some(lid) = parse_local_id_path(path) else {
        return json_response(404, &JsonError { error: "not_found" });
    };

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    match delete_local_for_owner(&conn, lid, uid) {
        Ok(true) => json_response(200, &serde_json::json!({"ok": true})),
        Ok(false) => json_response(
            404,
            &JsonError {
                error: "local_not_found",
            },
        ),
        Err(_) => json_response(
            500,
            &JsonError {
                error: "database_error",
            },
        ),
    }
}

fn handle_post_visitantes(
    state: &AppState,
    req: &Request,
    body: &[u8],
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Post {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let b: CreateVisitanteBody = match serde_json::from_slice(body) {
        Ok(x) => x,
        Err(_) => {
            return json_response(
                400,
                &JsonError {
                    error: "invalid_json",
                },
            );
        }
    };

    if b.nome.trim().is_empty() {
        return json_response(
            400,
            &JsonError {
                error: "invalid_nome",
            },
        );
    }

    if b.validade.trim().is_empty() {
        return json_response(
            400,
            &JsonError {
                error: "invalid_validade",
            },
        );
    }

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    // Verify local_id belongs to the user if provided
    if let Some(lid) = b.local_id {
        match get_local_for_owner(&conn, lid, uid) {
            Ok(Some(_)) => {}
            _ => {
                return json_response(
                    400,
                    &JsonError {
                        error: "invalid_local_id",
                    },
                );
            }
        }
    }

    let mut embedding_string = None;
    let face_bytes_ref = b.face_image_bytes.as_deref();

    if let Some(bytes) = face_bytes_ref {
        if !bytes.is_empty() {
            let img = match image::load_from_memory(bytes) {
                Ok(img) => img,
                Err(_) => {
                    return json_response(
                        400,
                        &JsonError {
                            error: "A imagem enviada é inválida ou não pôde ser lida.",
                        },
                    );
                }
            };

            let results = match state.detector.lock().unwrap().detect(&img) {
                Ok(res) => res,
                Err(_) => {
                    return json_response(
                        500,
                        &JsonError {
                            error: "Falha na detecção facial. Tente novamente.",
                        },
                    );
                }
            };

            if results.is_empty() {
                return json_response(
                    400,
                    &JsonError {
                        error: "Não foi possível detectar nenhum rosto na foto.",
                    },
                );
            }

            let res = &results[0];
            let rgb_img = img.to_rgb8();
            let landmarks = res.landmarks.as_ref().unwrap();
            let lms_array: [(f32, f32); 5] = landmarks
                .iter()
                .map(|&(x, y)| (x * rgb_img.width() as f32, y * rgb_img.height() as f32))
                .collect::<Vec<_>>()
                .try_into()
                .unwrap();
                
            let crop = norm_crop(&rgb_img, &lms_array, 112);
            let embeddings = match state.embedder.lock().unwrap().compute_embeddings_batch(&[crop]) {
                Ok(e) => e,
                Err(_) => {
                    return json_response(
                        500,
                        &JsonError {
                            error: "Falha ao extrair biometria.",
                        },
                    );
                }
            };

            let emb = &embeddings[0];
            embedding_string = Some(serde_json::to_string(emb).unwrap());
        }
    }

    let embedding = embedding_string.as_deref();

    let vid = match insert_visitante(
        &conn,
        uid,
        b.nome.trim(),
        Some(b.validade.trim()),
        b.local_id,
        face_bytes_ref,
        embedding,
    ) {
        Ok(id) => id,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    json_response(
        201,
        &VisitantePublic {
            id: vid,
            nome: b.nome.trim().to_string(),
            validade: Some(b.validade.trim().to_string()),
            local_id: b.local_id,
            face_image_bytes: b.face_image_bytes,
            embedding: embedding.map(String::from),
        },
    )
}

fn handle_get_visitantes(state: &AppState, req: &Request) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Get {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    let list = match list_visitantes(&conn, uid) {
        Ok(v) => v,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    let visitantes: Vec<VisitantePublic> = list
        .into_iter()
        .map(|t| VisitantePublic {
            id: t.0,
            nome: t.1,
            validade: t.2,
            local_id: t.3,
            face_image_bytes: t.4,
            embedding: t.5,
        })
        .collect();

    json_response(200, &VisitanteListResponse { visitantes })
}

fn handle_get_visitante(
    state: &AppState,
    req: &Request,
    path: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Get {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let Some(vid) = parse_visitante_id_path(path) else {
        return json_response(404, &JsonError { error: "not_found" });
    };

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    match get_visitante_for_owner(&conn, vid, uid) {
        Ok(Some(r)) => json_response(
            200,
            &VisitantePublic {
                id: r.0,
                nome: r.1,
                validade: r.2,
                local_id: r.3,
                face_image_bytes: r.4,
                embedding: r.5,
            },
        ),
        Ok(None) => json_response(
            404,
            &JsonError {
                error: "visitante_not_found",
            },
        ),
        Err(_) => json_response(
            500,
            &JsonError {
                error: "database_error",
            },
        ),
    }
}

fn handle_put_visitante(
    state: &AppState,
    req: &Request,
    path: &str,
    body: &[u8],
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Put {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let Some(vid) = parse_visitante_id_path(path) else {
        return json_response(404, &JsonError { error: "not_found" });
    };

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let b: UpdateVisitanteBody = match serde_json::from_slice(body) {
        Ok(x) => x,
        Err(_) => {
            return json_response(
                400,
                &JsonError {
                    error: "invalid_json",
                },
            );
        }
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    let existing = match get_visitante_for_owner(&conn, vid, uid) {
        Ok(Some(r)) => r,
        Ok(None) => {
            return json_response(
                404,
                &JsonError {
                    error: "visitante_not_found",
                },
            );
        }
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    let new_nome = match b.nome.as_deref() {
        Some(n) => {
            if n.trim().is_empty() {
                return json_response(
                    400,
                    &JsonError {
                        error: "invalid_nome",
                    },
                );
            }
            n.trim().to_string()
        }
        None => existing.1,
    };

    let new_validade = match b.validade.as_deref() {
        Some(v) => {
            if v.trim().is_empty() {
                return json_response(
                    400,
                    &JsonError {
                        error: "invalid_validade",
                    },
                );
            }
            Some(v.trim().to_string())
        }
        None => existing.2,
    };

    let new_local_id = match b.local_id {
        Some(lid) => match get_local_for_owner(&conn, lid, uid) {
            Ok(Some(_)) => Some(lid),
            _ => {
                return json_response(
                    400,
                    &JsonError {
                        error: "invalid_local_id",
                    },
                );
            }
        },
        None => existing.3,
    };

    let new_face_bytes = b.face_image_bytes.or(existing.4);
    let embedding = existing.5;

    match update_visitante_for_owner(
        &conn,
        vid,
        uid,
        &new_nome,
        new_validade.as_deref(),
        new_local_id,
        new_face_bytes.as_deref(),
        embedding.as_deref(),
    ) {
        Ok(true) => json_response(
            200,
            &VisitantePublic {
                id: vid,
                nome: new_nome,
                validade: new_validade,
                local_id: new_local_id,
                face_image_bytes: new_face_bytes,
                embedding,
            },
        ),
        _ => json_response(
            500,
            &JsonError {
                error: "database_error",
            },
        ),
    }
}

fn handle_delete_visitante(
    state: &AppState,
    req: &Request,
    path: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Delete {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let Some(vid) = parse_visitante_id_path(path) else {
        return json_response(404, &JsonError { error: "not_found" });
    };

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    match delete_visitante_for_owner(&conn, vid, uid) {
        Ok(true) => json_response(200, &serde_json::json!({"ok": true})),
        Ok(false) => json_response(
            404,
            &JsonError {
                error: "visitante_not_found",
            },
        ),
        Err(_) => json_response(
            500,
            &JsonError {
                error: "database_error",
            },
        ),
    }
}

fn handle_get_usuario(
    state: &AppState,
    req: &Request,
    path: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Get {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let Some(id) = parse_usuario_id_path(path) else {
        return json_response(404, &JsonError { error: "not_found" });
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    let row = match get_usuario_public(&conn, id) {
        Ok(Some(r)) => r,
        Ok(None) => {
            return json_response(404, &JsonError { error: "not_found" });
        }
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    json_response(200, &usuario_to_public(row))
}

fn handle_put_usuario(
    state: &AppState,
    req: &Request,
    path: &str,
    body: &[u8],
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Put {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }
    let Some(id) = parse_usuario_id_path(path) else {
        return json_response(404, &JsonError { error: "not_found" });
    };

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    if uid != id {
        return json_response(403, &JsonError { error: "forbidden" });
    }

    let b: UpdateUsuarioBody = match serde_json::from_slice(body) {
        Ok(x) => x,
        Err(_) => {
            return json_response(
                400,
                &JsonError {
                    error: "invalid_json",
                },
            );
        }
    };

    if b.nome.is_none() && b.email.is_none() && b.senha.is_none() {
        return json_response(
            400,
            &JsonError {
                error: "no_fields_to_update",
            },
        );
    }

    if let Some(ref n) = b.nome {
        if !validate_nome(n) {
            return json_response(
                400,
                &JsonError {
                    error: "invalid_nome",
                },
            );
        }
    }
    if let Some(ref e) = b.email {
        if !validate_email(e) {
            return json_response(
                400,
                &JsonError {
                    error: "invalid_email",
                },
            );
        }
    }
    if let Some(ref s) = b.senha {
        if !validate_password(s) {
            return json_response(
                400,
                &JsonError {
                    error: "weak_password",
                },
            );
        }
    }

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    if let Some(ref e) = b.email {
        match email_taken_by_other(&conn, e.trim(), id) {
            Ok(true) => {
                return json_response(
                    409,
                    &JsonError {
                        error: "email_in_use",
                    },
                );
            }
            Err(_) => {
                return json_response(
                    500,
                    &JsonError {
                        error: "database_error",
                    },
                );
            }
            Ok(false) => {}
        }
    }

    let new_hash = if let Some(ref s) = b.senha {
        match hash_password(s) {
            Ok(h) => Some(h),
            Err(_) => {
                return json_response(
                    500,
                    &JsonError {
                        error: "hash_failed",
                    },
                );
            }
        }
    } else {
        None
    };

    let nome_ref = b.nome.as_deref().map(str::trim);
    let email_ref = b.email.as_deref().map(str::trim);
    let hash_ref = new_hash.as_deref();

    match update_usuario(&conn, id, nome_ref, email_ref, hash_ref) {
        Ok(true) => {}
        Ok(false) => {
            return json_response(
                404,
                &JsonError {
                    error: "user_not_found",
                },
            );
        }
        Err(e) if e.to_string().contains("UNIQUE") => {
            return json_response(
                409,
                &JsonError {
                    error: "email_in_use",
                },
            );
        }
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    }

    let row = match get_usuario_public(&conn, id) {
        Ok(Some(r)) => r,
        _ => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    json_response(200, &usuario_to_public(row))
}

fn handle_delete_usuario(
    state: &AppState,
    req: &Request,
    path: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Delete {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }
    let Some(id) = parse_usuario_id_path(path) else {
        return json_response(404, &JsonError { error: "not_found" });
    };

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    if uid != id {
        return json_response(403, &JsonError { error: "forbidden" });
    }

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    match delete_usuario(&conn, id) {
        Ok(true) => json_response(200, &serde_json::json!({"ok": true})),
        Ok(false) => json_response(
            404,
            &JsonError {
                error: "user_not_found",
            },
        ),
        Err(_) => json_response(
            500,
            &JsonError {
                error: "database_error",
            },
        ),
    }
}

fn handle_post_cameras(
    state: &AppState,
    req: &Request,
    body: &[u8],
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Post {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let b: CreateCameraBody = match serde_json::from_slice(body) {
        Ok(x) => x,
        Err(_) => {
            return json_response(
                400,
                &JsonError {
                    error: "invalid_json",
                },
            );
        }
    };

    let nome_db: Option<&str> = b.nome.as_deref().map(str::trim).filter(|s| !s.is_empty());

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    let mut new_id: Option<i64> = None;
    if let Some(user_token) = &b.token {
        if !user_token.trim().is_empty() {
            match insert_camera(&conn, uid, nome_db, user_token.trim()) {
                Ok(id) => new_id = Some(id),
                Err(_) => {
                    return json_response(
                        500,
                        &JsonError {
                            error: "database_error_or_token_taken",
                        },
                    );
                }
            }
        }
    }
    
    if new_id.is_none() {
        for _ in 0..8 {
            let token = random_camera_token();
            match insert_camera(&conn, uid, nome_db, &token) {
                Ok(id) => {
                    new_id = Some(id);
                    break;
                }
                Err(e) if e.to_string().contains("UNIQUE") => continue,
                Err(_) => {
                    return json_response(
                        500,
                        &JsonError {
                            error: "database_error",
                        },
                    );
                }
            }
        }
    }

    let Some(cid) = new_id else {
        return json_response(
            500,
            &JsonError {
                error: "token_collision",
            },
        );
    };

    let row = match get_camera_for_owner_with_token(&conn, cid, uid) {
        Ok(Some(t)) => t,
        _ => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    json_response(
        201,
        &CameraCreated {
            id: row.0,
            nome: row.1,
            cam_ip: row.2,
            criado_em: row.3,
            token: row.4,
        },
    )
}

fn handle_get_cameras(state: &AppState, req: &Request) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Get {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    let list = match list_cameras_for_user(&conn, uid) {
        Ok(v) => v,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    let cameras: Vec<CameraPublic> = list.into_iter().map(camera_row_to_public).collect();
    json_response(200, &CameraListResponse { cameras })
}

fn handle_get_camera(
    state: &AppState,
    req: &Request,
    path: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Get {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let Some(cid) = parse_camera_id_path(path) else {
        return json_response(404, &JsonError { error: "not_found" });
    };

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    match get_camera_for_owner(&conn, cid, uid) {
        Ok(Some(r)) => json_response(200, &camera_row_to_public(r)),
        Ok(None) => json_response(
            404,
            &JsonError {
                error: "camera_not_found",
            },
        ),
        Err(_) => json_response(
            500,
            &JsonError {
                error: "database_error",
            },
        ),
    }
}

fn handle_put_camera(
    state: &AppState,
    req: &Request,
    path: &str,
    body: &[u8],
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Put {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let Some(cid) = parse_camera_id_path(path) else {
        return json_response(404, &JsonError { error: "not_found" });
    };

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let b: UpdateCameraBody = match serde_json::from_slice(body) {
        Ok(x) => x,
        Err(_) => {
            return json_response(
                400,
                &JsonError {
                    error: "invalid_json",
                },
            );
        }
    };

    let nome_sql: Option<&str> = match b.nome.as_ref() {
        None => {
            return json_response(
                400,
                &JsonError {
                    error: "no_fields_to_update",
                },
            );
        }
        Some(s) if s.trim().is_empty() => None,
        Some(s) => Some(s.trim()),
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    match update_camera_nome_for_owner(&conn, cid, uid, nome_sql) {
        Ok(true) => {}
        Ok(false) => {
            return json_response(
                404,
                &JsonError {
                    error: "camera_not_found",
                },
            );
        }
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    }

    let row = match get_camera_for_owner(&conn, cid, uid) {
        Ok(Some(r)) => r,
        _ => {
            return json_response(
                500,
                &JsonError {
                    error: "database_error",
                },
            );
        }
    };

    json_response(200, &camera_row_to_public(row))
}

fn handle_delete_camera(
    state: &AppState,
    req: &Request,
    path: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Delete {
        return json_response(
            405,
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let Some(cid) = parse_camera_id_path(path) else {
        return json_response(404, &JsonError { error: "not_found" });
    };

    let uid = match bearer_user_jwt(req, &state.jwt_secret) {
        Ok(u) => u,
        Err(e) => {
            return json_response(401, &JsonError { error: e });
        }
    };

    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                500,
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    match delete_camera_for_owner(&conn, cid, uid) {
        Ok(true) => json_response(200, &serde_json::json!({"ok": true})),
        Ok(false) => json_response(
            404,
            &JsonError {
                error: "camera_not_found",
            },
        ),
        Err(_) => json_response(
            500,
            &JsonError {
                error: "database_error",
            },
        ),
    }
}

fn handle_health() -> Response<std::io::Cursor<Vec<u8>>> {
    let body = b"{\"status\":\"ok\"}";
    Response::new(
        200,
        vec![Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap()],
        std::io::Cursor::new(body.to_vec()),
        None,
        None,
    )
}

fn dispatch(state: &AppState, request: &mut Request) -> Response<std::io::Cursor<Vec<u8>>> {
    let path = request.url().split('?').next().unwrap_or("/").to_string();
    let method = request.method().clone();

    match (method, path.as_str()) {
        (_, "/health") => handle_health(),
        (Method::Get, "/visitantes") => handle_get_visitantes(state, request),
        (Method::Post, "/visitantes") => {
            let body = read_body(request);
            handle_post_visitantes(state, request, &body)
        }
        (Method::Get, p) if p.starts_with("/visitantes/") => {
            handle_get_visitante(state, request, p)
        }
        (Method::Put, p) if p.starts_with("/visitantes/") => {
            let body = read_body(request);
            handle_put_visitante(state, request, p, &body)
        }
        (Method::Delete, p) if p.starts_with("/visitantes/") => {
            handle_delete_visitante(state, request, p)
        }
        (Method::Get, "/locais") => handle_get_locais(state, request),
        (Method::Post, "/locais") => {
            let body = read_body(request);
            handle_post_locais(state, request, &body)
        }
        (Method::Get, p) if p.starts_with("/locais/") => handle_get_local(state, request, p),
        (Method::Put, p) if p.starts_with("/locais/") => {
            let body = read_body(request);
            handle_put_local(state, request, p, &body)
        }
        (Method::Delete, p) if p.starts_with("/locais/") => handle_delete_local(state, request, p),
        (Method::Post, "/usuarios") => {
            let body = read_body(request);
            handle_post_usuarios(state, &body)
        }
        (Method::Post, "/auth/login") => {
            let body = read_body(request);
            handle_post_login(state, &body)
        }
        (Method::Post, "/cameras") => {
            let body = read_body(request);
            handle_post_cameras(state, request, &body)
        }
        (Method::Get, "/cameras") => handle_get_cameras(state, request),
        (Method::Get, p) if p.starts_with("/cameras/") => handle_get_camera(state, request, p),
        (Method::Put, p) if p.starts_with("/cameras/") => {
            let body = read_body(request);
            handle_put_camera(state, request, p, &body)
        }
        (Method::Delete, p) if p.starts_with("/cameras/") => {
            handle_delete_camera(state, request, p)
        }
        (Method::Get, p) if p.starts_with("/usuarios/") => handle_get_usuario(state, request, p),
        (Method::Put, p) if p.starts_with("/usuarios/") => {
            let body = read_body(request);
            handle_put_usuario(state, request, p, &body)
        }
        (Method::Delete, p) if p.starts_with("/usuarios/") => {
            handle_delete_usuario(state, request, p)
        }
        _ => json_response(404, &JsonError { error: "not_found" }),
    }
}

async fn axum_fallback(State(state): State<Arc<AppState>>, req: AxumRequest) -> impl IntoResponse {
    let method = match *req.method() {
        axum::http::Method::GET => Method::Get,
        axum::http::Method::POST => Method::Post,
        axum::http::Method::PUT => Method::Put,
        axum::http::Method::DELETE => Method::Delete,
        axum::http::Method::OPTIONS => Method::Options,
        _ => Method::Other(req.method().to_string()),
    };
    let url = req.uri().to_string();
    let mut headers = Vec::new();
    for (name, value) in req.headers() {
        headers.push(Header {
            field: name.as_str().to_string(),
            value: String::from_utf8_lossy(value.as_bytes()).to_string(),
        });
    }

    let body_bytes = axum::body::to_bytes(req.into_body(), usize::MAX)
        .await
        .unwrap()
        .to_vec();

    let mut my_req = Request {
        method,
        url,
        headers,
        body: std::io::Cursor::new(body_bytes),
    };

    let mut response = dispatch(&state, &mut my_req);

    let mut axum_res = AxumResponse::builder().status(response.status);
    for h in response.headers {
        axum_res = axum_res.header(h.field, h.value);
    }

    let mut out_body = Vec::new();
    std::io::Read::read_to_end(&mut response.body, &mut out_body).unwrap();

    axum_res.body(axum::body::Body::from(out_body)).unwrap()
}

#[tokio::main]
async fn main() {
    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "app.db".to_string());
    let addr = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let bind_addr = format!("0.0.0.0:{}", addr);

    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| {
        eprintln!("AVISO: JWT_SECRET não definido; usar valor só para desenvolvimento.");
        "dev-altere-JWT_SECRET-em-producao".to_string()
    });
    let jwt_ttl_secs: u64 = std::env::var("JWT_TTL_SECS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(604_800);

    let conn = Connection::open(&db_path).expect("abrir sqlite");
    init_schema(&conn).expect("schema");

    let db = Arc::new(Mutex::new(conn));
    let active_cameras: ActiveCameras = Arc::new(Mutex::new(HashMap::new()));
    
    // Otimizações pesadas de memória para ONNX Runtime (Render Free Tier - 512MB)
    std::env::set_var("ORT_ENABLE_ARENA", "0");
    
    eprintln!("Carregando modelos ONNX da Biometria localmente (Modo Low-RAM)...");
    let detector = ScrfdDetector::builder("models/det_500m.onnx")
        .build()
        .expect("Failed to initialize Face Detector");
        
    let embedder = ArcFaceEmbedder::builder("models/w600k_mbf.onnx")
        .build()
        .expect("Failed to initialize Face Embedder");
    eprintln!("Modelos ONNX carregados com sucesso.");

    let (log_sender, _) = tokio::sync::broadcast::channel(100);

    let state = Arc::new(AppState {
        db,
        jwt_secret: jwt_secret.into_bytes(),
        jwt_ttl_secs,
        active_cameras,
        detector: Arc::new(Mutex::new(detector)),
        embedder: Arc::new(Mutex::new(embedder)),
        log_sender,
    });

    let app = Router::new()
        .route("/ws", get(camera_ws::ws_handler))
        .route("/ws/logs", get(logs_ws_handler))
        .fallback(any(axum_fallback))
        .with_state(state);

    let listener = TcpListener::bind(&bind_addr).await.unwrap();
    eprintln!(
        "API e WebSocket escutando na porta {} (db: {})",
        addr, db_path
    );
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await.unwrap();
}

use axum::extract::ws::{WebSocketUpgrade, WebSocket};
async fn logs_ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> axum::response::Response {
    let token = if let Some(t) = params.get("token") {
        t.clone()
    } else {
        return axum::http::StatusCode::UNAUTHORIZED.into_response();
    };

    let user_id = match verify_jwt(&state.jwt_secret, &token) {
        Ok(uid) => uid,
        Err(_) => return axum::http::StatusCode::UNAUTHORIZED.into_response(),
    };

    if user_id == 0 {
        return axum::http::StatusCode::UNAUTHORIZED.into_response();
    }

    ws.on_upgrade(move |socket| handle_logs_socket(socket, state, user_id))
}

async fn handle_logs_socket(mut socket: WebSocket, state: Arc<AppState>, user_id: i64) {
    let mut rx = state.log_sender.subscribe();

    while let Ok(msg) = rx.recv().await {
        if msg.usuario_id == user_id {
            if let Ok(json) = serde_json::to_string(&msg) {
                if socket.send(axum::extract::ws::Message::Text(json.into())).await.is_err() {
                    break;
                }
            }
        }
    }
}
