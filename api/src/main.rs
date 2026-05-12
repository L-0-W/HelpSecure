mod db;

use std::sync::{Arc, Mutex};

use db::{init_schema, update_camera_ip};
use rusqlite::Connection;
use serde::Serialize;
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

#[derive(Serialize)]
struct JsonError {
    error: &'static str,
}

#[derive(Serialize)]
struct JsonOk {
    ok: bool,
    cam_ip: String,
}

fn json_response<T: Serialize>(status: StatusCode, body: &T) -> Response<std::io::Cursor<Vec<u8>>> {
    let bytes = serde_json::to_vec(body).unwrap_or_else(|_| b"{\"error\":\"serialize\"}".to_vec());
    Response::new(
        status,
        vec![Header::from_bytes(&b"Content-Type"[..], &b"application/json; charset=utf-8"[..]).unwrap()],
        std::io::Cursor::new(bytes),
        None,
        None,
    )
}

fn bearer_token(req: &Request) -> Option<String> {
    let h = req
        .headers()
        .iter()
        .find(|h| h.field.equiv("authorization"))?;
    let raw = h.value.as_str();
    let raw = raw.trim();
    let prefix = "Bearer ";
    if raw.len() > prefix.len() && raw[..prefix.len()].eq_ignore_ascii_case(prefix) {
        Some(raw[prefix.len()..].trim().to_string())
    } else {
        None
    }
}

fn query_param(url_path: &str, key: &str) -> Option<String> {
    let q = url_path.split('?').nth(1)?;
    for pair in q.split('&') {
        let mut it = pair.splitn(2, '=');
        let k = it.next()?;
        if k == key {
            let v = it.next().unwrap_or("");
            return Some(url_decode(v));
        }
    }
    None
}

fn url_decode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '+' {
            out.push(' ');
        } else if c == '%' {
            let a = chars.next();
            let b = chars.next();
            if let (Some(a), Some(b)) = (a, b) {
                let hex = format!("{}{}", a, b);
                if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                    out.push(byte as char);
                    continue;
                }
            }
            out.push(c);
        } else {
            out.push(c);
        }
    }
    out
}

fn handle_receber_ip(req: &Request, db: &Mutex<Connection>) -> Response<std::io::Cursor<Vec<u8>>> {
    if req.method() != &Method::Get {
        return json_response(
            StatusCode(405),
            &JsonError {
                error: "method_not_allowed",
            },
        );
    }

    let url = req.url();
    let path = url.split('?').next().unwrap_or("/");
    if path != "/receberIP" {
        return json_response(
            StatusCode(404),
            &JsonError { error: "not_found" },
        );
    }

    let Some(cam_ip) = query_param(url, "cam_ip") else {
        return json_response(
            StatusCode(400),
            &JsonError {
                error: "missing_cam_ip",
            },
        );
    };

    if cam_ip.is_empty() {
        return json_response(
            StatusCode(400),
            &JsonError {
                error: "empty_cam_ip",
            },
        );
    }

    let Some(token) = bearer_token(req) else {
        return json_response(
            StatusCode(401),
            &JsonError {
                error: "missing_bearer_token",
            },
        );
    };

    if token.is_empty() {
        return json_response(
            StatusCode(401),
            &JsonError {
                error: "empty_token",
            },
        );
    }

    let conn = match db.lock() {
        Ok(c) => c,
        Err(_) => {
            return json_response(
                StatusCode(500),
                &JsonError {
                    error: "database_lock",
                },
            );
        }
    };

    match update_camera_ip(&conn, &token, &cam_ip) {
        Ok(true) => json_response(
            StatusCode(200),
            &JsonOk {
                ok: true,
                cam_ip,
            },
        ),
        Ok(false) => json_response(
            StatusCode(401),
            &JsonError {
                error: "invalid_token",
            },
        ),
        Err(_) => json_response(
            StatusCode(500),
            &JsonError {
                error: "database_error",
            },
        ),
    }
}

fn handle_health() -> Response<std::io::Cursor<Vec<u8>>> {
    let body = b"{\"status\":\"ok\"}";
    Response::new(
        StatusCode(200),
        vec![Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap()],
        std::io::Cursor::new(body.to_vec()),
        None,
        None,
    )
}

fn main() {
    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "app.db".to_string());
    let addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());

    let conn = Connection::open(&db_path).expect("abrir sqlite");
    init_schema(&conn).expect("schema");
    let db = Arc::new(Mutex::new(conn));

    let server = Server::http(&addr).expect("bind");
    eprintln!("API escutando em http://{addr} (db: {db_path})");

    for request in server.incoming_requests() {
        let response = match request.url().split('?').next() {
            Some("/health") => handle_health(),
            Some(p) if p == "/receberIP" || request.url().starts_with("/receberIP?") => {
                handle_receber_ip(&request, &db)
            }
            _ => json_response(
                StatusCode(404),
                &JsonError { error: "not_found" },
            ),
        };

        let _ = request.respond(response);
    }
}
