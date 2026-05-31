import re

with open("src/main.rs", "r") as f:
    code = f.read()

# 1. Remove tiny_http imports
code = re.sub(r'use tiny_http::.*?;\n', '', code)

# 2. Add axum and tokio imports + Mocks
mocks = """use axum::{
    extract::{State, Request as AxumRequest},
    response::{IntoResponse, Response as AxumResponse},
    routing::{any, get},
    Router,
};
use http_body_util::BodyExt;
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
    pub fn method(&self) -> &Method { &self.method }
    pub fn url(&self) -> &str { &self.url }
    pub fn headers(&self) -> &[Header] { &self.headers }
    pub fn as_reader(&mut self) -> &mut std::io::Cursor<Vec<u8>> { &mut self.body }
}

pub struct Response<R: std::io::Read> {
    pub status: u16,
    pub headers: Vec<Header>,
    pub body: R,
}
impl<R: std::io::Read> Response<R> {
    pub fn new(status: u16, headers: Vec<Header>, body: R, _un1: Option<usize>, _un2: Option<usize>) -> Self {
        Self { status, headers, body }
    }
}

#[allow(non_snake_case)]
pub fn StatusCode(code: u16) -> u16 { code }
// --- FIM DOS MOCKS ---
"""

code = code.replace("use serde::{Deserialize, Serialize};", mocks + "\nuse serde::{Deserialize, Serialize};")

# 3. Add the fallback handler
fallback = """
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
    
    let body_bytes = req.into_body().collect().await.unwrap().to_bytes().to_vec();
    
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
"""

# Replace main function
main_re = r'fn main\(\) \{.*'
new_main = fallback + """
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

    let state = Arc::new(AppState {
        db,
        jwt_secret: jwt_secret.into_bytes(),
        jwt_ttl_secs,
        active_cameras,
    });

    let app = Router::new()
        .route("/ws", get(camera_ws::ws_handler))
        .fallback(any(axum_fallback))
        .with_state(state);

    let listener = TcpListener::bind(&bind_addr).await.unwrap();
    eprintln!("API e WebSocket escutando na porta {} (db: {})", addr, db_path);
    axum::serve(listener, app).await.unwrap();
}
"""

code = re.sub(main_re, new_main, code, flags=re.DOTALL)

# Fix bearer_user_jwt field.equiv("authorization") to field.eq_ignore_ascii_case
code = code.replace('h.field.equiv("authorization")', 'h.field.eq_ignore_ascii_case("authorization")')

# Change response of StatusCode(XXX) instead of tiny_http StatusCode
code = re.sub(r'StatusCode\(([0-9]+)\)', r'\1', code)
# wait, json_response uses status code u16 now, so we can just replace StatusCode(200) with 200, 
# or we have the mock `StatusCode(code: u16) -> u16`. Both work. The mock is there so we don't need to replace.

with open("src/main.rs", "w") as f:
    f.write(code)
print("main.rs refactored successfully")
