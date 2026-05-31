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

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let mut dot = 0.0;
    let mut norm_a = 0.0;
    let mut norm_b = 0.0;
    for (va, vb) in a.iter().zip(b.iter()) {
        dot += va * vb;
        norm_a += va * va;
        norm_b += vb * vb;
    }
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    dot / (norm_a.sqrt() * norm_b.sqrt())
}
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
            Some(Ok(Message::Binary(bytes))) => {
                let detector = state.detector.clone();
                let embedder = state.embedder.clone();
                let db_conn = state.db.clone();
                let log_sender = state.log_sender.clone();
                let u_id = user_id;
                let c_id = cam_id;
                
                tokio::task::spawn_blocking(move || {
                    if let Ok(img) = image::load_from_memory(&bytes) {
                        let rgb_img = img.to_rgb8();
                        if let Ok(results) = detector.lock().unwrap().detect(&img) {
                            if let Some(res) = results.first() {
                                if let Some(landmarks) = res.landmarks.as_ref() {
                                    if let Ok(lms_array) = landmarks.iter().map(|&(x,y)| (x * rgb_img.width() as f32, y * rgb_img.height() as f32)).collect::<Vec<_>>().try_into() {
                                        let crop = face_id::face_align::norm_crop(&rgb_img, &lms_array, 112);
                                        if let Ok(embeddings) = embedder.lock().unwrap().compute_embeddings_batch(&[crop]) {
                                            if let Some(target_emb) = embeddings.first() {
                                                let mut conn = db_conn.lock().unwrap();
                                                let mut stmt = conn.prepare("SELECT id, nome, embedding FROM visitantes WHERE usuario_id = ? AND embedding IS NOT NULL").unwrap();
                                                let mut rows = stmt.query([u_id]).unwrap();
                                                
                                                let mut max_sim = 0.0;
                                                let mut found = false;
                                                while let Ok(Some(row)) = rows.next() {
                                                    let id: i64 = row.get(0).unwrap();
                                                    let nome: String = row.get(1).unwrap();
                                                    let emb_str: String = row.get(2).unwrap();
                                                    
                                                    if let Ok(db_emb) = serde_json::from_str::<Vec<f32>>(&emb_str) {
                                                        let sim = cosine_similarity(target_emb, &db_emb);
                                                        if sim > max_sim {
                                                            max_sim = sim;
                                                        }
                                                        if sim > 0.6 {
                                                            println!("✅ Visitante reconhecido! ID: {}, Nome: {} (Score: {:.2})", id, nome, sim);
                                                            found = true;
                                                            
                                                            let _ = log_sender.send(crate::LogMessage {
                                                                usuario_id: u_id,
                                                                camera_id: c_id,
                                                                message: format!("Visitante '{}' reconhecido com sucesso (Score: {:.2})", nome, sim),
                                                                timestamp: chrono::Utc::now().to_rfc3339(),
                                                                success: true,
                                                            });
                                                            
                                                            break;
                                                        }
                                                    }
                                                }
                                                
                                                if !found {
                                                    println!("❌ Rosto detectado, mas nenhum visitante compatível encontrado na base. (Max Score: {:.2})", max_sim);
                                                    let _ = log_sender.send(crate::LogMessage {
                                                        usuario_id: u_id,
                                                        camera_id: c_id,
                                                        message: format!("Tentativa de reconhecimento falhou. Rosto desconhecido. (Score Máx: {:.2})", max_sim),
                                                        timestamp: chrono::Utc::now().to_rfc3339(),
                                                        success: false,
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                eprintln!("Nenhum rosto detectado na imagem recebida do ESP32.");
                            }
                        } else {
                            eprintln!("Falha na detecção facial.");
                        }
                    } else {
                        eprintln!("Falha ao decodificar a imagem recebida do ESP32.");
                    }
                });
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
