use crate::db::{get_camera_by_token, update_camera_ip};
use crate::AppState;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{ConnectInfo, State};
use axum::response::IntoResponse;
use futures_util::{SinkExt, StreamExt};
use rusqlite::Connection;
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};

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

async fn send_json(ws: &mut WebSocket, v: &serde_json::Value) {
    if let Ok(s) = serde_json::to_string(v) {
        let _ = ws.send(Message::Text(s.into())).await;
    }
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let peer_ip = addr.ip().to_string();
    ws.on_upgrade(move |socket| handle_socket(socket, state, peer_ip))
}

async fn handle_socket(mut ws: WebSocket, state: Arc<AppState>, peer_ip: String) {
    let first = match ws.next().await {
        Some(Ok(m)) => m,
        _ => {
            eprintln!("ws camera: primeira leitura falhou");
            let _ = ws.close().await;
            return;
        }
    };

    let text = match first {
        Message::Text(t) => t.to_string(),
        Message::Ping(d) => {
            let _ = ws.send(Message::Pong(d)).await;
            send_json(
                &mut ws,
                &json!({"ok": false, "error": "expected_json_with_token_first"}),
            )
            .await;
            let _ = ws.close().await;
            return;
        }
        Message::Close(_) => return,
        _ => {
            send_json(
                &mut ws,
                &json!({"ok": false, "error": "expected_text_json_first"}),
            )
            .await;
            let _ = ws.close().await;
            return;
        }
    };

    let auth: CamAuthMsg = match serde_json::from_str(text.trim()) {
        Ok(a) => a,
        Err(_) => {
            send_json(&mut ws, &json!({"ok": false, "error": "invalid_json"})).await;
            let _ = ws.close().await;
            return;
        }
    };

    let token = auth.token.trim();
    if token.is_empty() {
        send_json(&mut ws, &json!({"ok": false, "error": "missing_token"})).await;
        let _ = ws.close().await;
        return;
    }

    let db_res = match state.db.lock() {
        Err(_) => Err("database_lock"),
        Ok(conn) => match get_camera_by_token(&conn, token) {
            Ok(Some(ids)) => {
                if update_camera_ip(&conn, token, &peer_ip).is_err() {
                    Err("database_error")
                } else {
                    Ok(ids)
                }
            }
            Ok(None) => Err("invalid_token"),
            Err(_) => Err("database_error"),
        },
    }; // conn is dropped here

    let (cam_id, user_id) = match db_res {
        Ok(ids) => ids,
        Err(e) => {
            send_json(&mut ws, &json!({"ok": false, "error": e})).await;
            let _ = ws.close().await;
            return;
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
    )
    .await;

    let _guard = ActiveEntry::register(state.active_cameras.clone(), cam_id, user_id);

    loop {
        match ws.next().await {
            Some(Ok(Message::Ping(d))) => {
                let _ = ws.send(Message::Pong(d)).await;
            }
            Some(Ok(Message::Pong(_))) => {}
            Some(Ok(Message::Close(_))) | None => break,
            Some(Ok(Message::Binary(_))) => {
                // Reservado: frames de imagem
            }
            Some(Ok(Message::Text(_))) => {
                // Heartbeat
            }
            Some(Err(e)) => {
                eprintln!("ws camera {} read error: {}", cam_id, e);
                break;
            }
        }
    }
    let _ = ws.close().await;
}
