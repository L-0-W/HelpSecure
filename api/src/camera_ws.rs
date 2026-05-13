//! WebSocket para câmeras: a ESP **liga-se** ao servidor, envia JSON `{"token":"..."}` na
//! primeira mensagem de texto; o servidor valida na base, atualiza `cam_ip` (IP do peer TCP)
//! e mantém o mapeamento `camera_id -> usuario_id` enquanto a ligação existir.

use std::collections::HashMap;
use std::net::TcpListener;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use rusqlite::Connection;
use serde::Deserialize;
use serde_json::json;
use tungstenite::{accept, Message};

use crate::db::{get_camera_by_token, update_camera_ip};

#[derive(Deserialize)]
struct CamAuthMsg {
    token: String,
}

pub type ActiveCameras = Arc<Mutex<HashMap<i64, i64>>>;

struct ActiveEntry {
    map: ActiveCameras,
    camera_id: i64,
}

impl ActiveEntry {
    fn register(map: ActiveCameras, camera_id: i64, usuario_id: i64) -> Self {
        if let Ok(mut g) = map.lock() {
            g.insert(camera_id, usuario_id);
        }
        Self { map, camera_id }
    }
}

impl Drop for ActiveEntry {
    fn drop(&mut self) {
        if let Ok(mut g) = self.map.lock() {
            g.remove(&self.camera_id);
        }
    }
}

fn send_json(ws: &mut tungstenite::WebSocket<std::net::TcpStream>, v: &serde_json::Value) {
    if let Ok(s) = serde_json::to_string(v) {
        let _ = ws.send(Message::Text(s.into()));
    }
}

fn handle_stream(
    stream: std::net::TcpStream,
    db: Arc<Mutex<Connection>>,
    active: ActiveCameras,
) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(120)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(30)));

    let peer_ip = stream
        .peer_addr()
        .ok()
        .map(|a| a.ip().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "unknown".to_string());

    let mut ws = match accept(stream) {
        Ok(w) => w,
        Err(e) => {
            eprintln!("ws camera: handshake {e}");
            return;
        }
    };

    let first = match ws.read() {
        Ok(m) => m,
        Err(e) => {
            eprintln!("ws camera: primeira leitura {e}");
            let _ = ws.close(None);
            return;
        }
    };

    let text = match first {
        Message::Text(t) => t.to_string(),
        Message::Ping(d) => {
            let _ = ws.send(Message::Pong(d));
            send_json(
                &mut ws,
                &json!({"ok": false, "error": "expected_json_with_token_first"}),
            );
            let _ = ws.close(None);
            return;
        }
        Message::Close(_) => return,
        _ => {
            send_json(
                &mut ws,
                &json!({"ok": false, "error": "expected_text_json_first"}),
            );
            let _ = ws.close(None);
            return;
        }
    };

    let auth: CamAuthMsg = match serde_json::from_str(text.trim()) {
        Ok(a) => a,
        Err(_) => {
            send_json(&mut ws, &json!({"ok": false, "error": "invalid_json"}));
            let _ = ws.close(None);
            return;
        }
    };

    let token = auth.token.trim();
    if token.is_empty() {
        send_json(&mut ws, &json!({"ok": false, "error": "missing_token"}));
        let _ = ws.close(None);
        return;
    }

    let (cam_id, user_id) = {
        let conn = match db.lock() {
            Ok(c) => c,
            Err(_) => {
                send_json(&mut ws, &json!({"ok": false, "error": "database_lock"}));
                let _ = ws.close(None);
                return;
            }
        };

        match get_camera_by_token(&conn, token) {
            Ok(Some(ids)) => {
                if update_camera_ip(&conn, token, &peer_ip).is_err() {
                    send_json(&mut ws, &json!({"ok": false, "error": "database_error"}));
                    let _ = ws.close(None);
                    return;
                }
                ids
            }
            Ok(None) => {
                send_json(&mut ws, &json!({"ok": false, "error": "invalid_token"}));
                let _ = ws.close(None);
                return;
            }
            Err(_) => {
                send_json(&mut ws, &json!({"ok": false, "error": "database_error"}));
                let _ = ws.close(None);
                return;
            }
        }
    };

    send_json(
        &mut ws,
        &json!({
            "ok": true,
            "camera_id": cam_id,
            "usuario_id": user_id,
            "peer_ip": peer_ip
        }),
    );

    let _guard = ActiveEntry::register(active, cam_id, user_id);

    loop {
        match ws.read() {
            Ok(Message::Ping(d)) => {
                let _ = ws.send(Message::Pong(d));
            }
            Ok(Message::Pong(_)) => {}
            Ok(Message::Close(_)) => break,
            Ok(Message::Binary(_)) => {
                // Reservado: frames de imagem / telemetria para reencaminhar ao app.
            }
            Ok(Message::Text(_)) => {
                // Opcional: heartbeat JSON; ignorar por agora.
            }
            Ok(Message::Frame(_)) => {}
            Err(e) => {
                eprintln!("ws camera {} read: {e}", cam_id);
                break;
            }
        }
    }
    let _ = ws.close(None);
}

/// Aceita ligações em `bind` (ex. `0.0.0.0:9000`). Cada cliente corre numa thread.
fn camera_ws_listen_loop(db: Arc<Mutex<Connection>>, active: ActiveCameras, bind: &str) {
    let listener = match TcpListener::bind(bind) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("ws camera: não foi possível escutar em {bind}: {e}");
            return;
        }
    };
    eprintln!("WebSocket câmeras: ws://{bind}/ (primeira mensagem: {{\"token\":\"...\"}} )");

    for stream in listener.incoming() {
        let stream = match stream {
            Ok(s) => s,
            Err(e) => {
                eprintln!("ws camera: accept {e}");
                continue;
            }
        };
        let db = db.clone();
        let active = active.clone();
        std::thread::spawn(move || handle_stream(stream, db, active));
    }
}

pub fn spawn_camera_ws_server(db: Arc<Mutex<Connection>>, active: ActiveCameras, bind: String) {
    std::thread::spawn(move || camera_ws_listen_loop(db, active, &bind));
}
