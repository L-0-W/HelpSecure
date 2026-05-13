use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use hmac::{Hmac, Mac};
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug)]
pub enum AuthError {
    Hash,
    Jwt,
}

pub fn hash_password(plain: &str) -> Result<String, AuthError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(plain.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|_| AuthError::Hash)
}

/// Token opaco para a câmera (32 bytes, base64url). Usar só na criação / provisioning.
pub fn random_camera_token() -> String {
    let mut buf = [0u8; 32];
    OsRng.fill_bytes(&mut buf);
    URL_SAFE_NO_PAD.encode(buf)
}

pub fn verify_password(plain: &str, stored: &str) -> bool {
    let Ok(parsed) = PasswordHash::new(stored) else {
        return false;
    };
    Argon2::default()
        .verify_password(plain.as_bytes(), &parsed)
        .is_ok()
}

#[derive(Serialize)]
struct JwtHeader<'a> {
    alg: &'a str,
    typ: &'a str,
}

#[derive(Serialize, Deserialize)]
struct JwtPayload {
    sub: String,
    exp: u64,
}

/// JWT HS256 compacto (sem dependência `jsonwebtoken` / ring).
pub fn sign_jwt(secret: &[u8], user_id: i64, ttl_secs: u64) -> Result<String, AuthError> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| AuthError::Jwt)?
        .as_secs();
    let exp = now.saturating_add(ttl_secs);

    let header = JwtHeader {
        alg: "HS256",
        typ: "JWT",
    };
    let payload = JwtPayload {
        sub: user_id.to_string(),
        exp,
    };

    let h = URL_SAFE_NO_PAD.encode(serde_json::to_vec(&header).map_err(|_| AuthError::Jwt)?);
    let p = URL_SAFE_NO_PAD.encode(serde_json::to_vec(&payload).map_err(|_| AuthError::Jwt)?);
    let signing_input = format!("{h}.{p}");

    let mut mac = HmacSha256::new_from_slice(secret).map_err(|_| AuthError::Jwt)?;
    mac.update(signing_input.as_bytes());
    let sig = mac.finalize().into_bytes();
    let s = URL_SAFE_NO_PAD.encode(sig);

    Ok(format!("{signing_input}.{s}"))
}

fn sig_bytes_constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut d = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        d |= x ^ y;
    }
    d == 0
}

/// Devolve o `user_id` do campo `sub` se assinatura e `exp` forem válidos.
pub fn verify_jwt(secret: &[u8], token: &str) -> Result<i64, AuthError> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Err(AuthError::Jwt);
    }
    let signing_input = format!("{}.{}", parts[0], parts[1]);

    let mut mac = HmacSha256::new_from_slice(secret).map_err(|_| AuthError::Jwt)?;
    mac.update(signing_input.as_bytes());
    let expected = mac.finalize().into_bytes();

    let sig_decoded = URL_SAFE_NO_PAD
        .decode(parts[2])
        .map_err(|_| AuthError::Jwt)?;
    if !sig_bytes_constant_time_eq(&expected, &sig_decoded) {
        return Err(AuthError::Jwt);
    }

    let payload_raw = URL_SAFE_NO_PAD
        .decode(parts[1])
        .map_err(|_| AuthError::Jwt)?;
    let payload: JwtPayload =
        serde_json::from_slice(&payload_raw).map_err(|_| AuthError::Jwt)?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| AuthError::Jwt)?
        .as_secs();
    if payload.exp < now {
        return Err(AuthError::Jwt);
    }

    payload
        .sub
        .parse::<i64>()
        .map_err(|_| AuthError::Jwt)
}
