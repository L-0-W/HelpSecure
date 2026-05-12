# Registro de desenvolvimento da API (Rust)

Este arquivo é atualizado conforme o projeto evolui: **fluxo de negócio**, **documentação dos endpoints**, **alterações no código**, **erros encontrados e soluções**.

---

## 1. Fluxo: compra da câmera → ESP → app do usuário

Objetivo: quando alguém **compra** uma câmera, ela passa a pertencer à **conta do usuário**; ao ligar na internet, a ESP **registra o IP** no servidor usando um **token secreto** que identifica aquela câmera (e indiretamente o dono).

### Passo a passo

1. **Compra / cadastro da venda (backend ou painel admin)**  
   - Gera-se um **token** forte e único (ex.: 32+ bytes em base64 ou hex, armazenado só no servidor e gravado na ESP na fábrica ou no primeiro pareamento).  
   - Cria-se ou atualiza-se a linha na tabela **`cameras`**:  
     - `token` = esse segredo  
     - `usuario_id` = ID do comprador  
   - O **app** (React Native), autenticado com JWT, consulta a API e lista as câmeras do usuário (incluindo `cam_ip` quando a ESP já tiver enviado).

2. **Câmera liga na rede (ESP32)**  
   - A ESP obtém o IP local (Wi‑Fi).  
   - Envia **`GET /receberIP?cam_ip=...`** com cabeçalho **`Authorization: Bearer <token>`** (o mesmo token gravado na câmera / vinculado à compra).

3. **Servidor**  
   - Procura em **`cameras`** uma linha com `token` igual ao Bearer **e** `usuario_id` **não nulo** (câmera “vendida” e vinculada a um usuário).  
   - Se encontrar, atualiza **`cam_ip`** com o IP enviado.  
   - O **app do usuário** já está ligado à mesma conta (`usuario_id`); ao listar câmeras, vê o IP atualizado e pode abrir WebSocket para stream (futuro).

### O que **não** faz sentido na prática

- Token sem `usuario_id`: trata-se de câmera ainda não “vendida” ou dados inconsistentes — o endpoint **`/receberIP`** **não** atualiza IP nesses casos (resposta genérica de falha de autenticação, como token inválido, para não vazar detalhes).

### Resumo em uma frase

**Token = identidade da câmera; `usuario_id` = dono no banco; `receberIP` = a ESP prova que conhece o token e o servidor associa o IP à linha da câmera daquele usuário.**

---

## 2. Endpoints implementados (estado atual)

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/health` | Verificação simples. Resposta: `{"status":"ok"}`. |
| `GET` | `/receberIP` | Registro do IP da câmera. Query: `cam_ip` (obrigatório). Cabeçalho: `Authorization: Bearer <token>`. |

### `GET /receberIP`

- **Query:** `cam_ip` — endereço IP que a ESP obteve (IPv4 típico; formato validado de forma mínima hoje).  
- **Header:** `Authorization: Bearer <token>` — token único da câmera.  
- **Sucesso (200):** `{"ok":true,"cam_ip":"<valor recebido>"}`  
- **Erros (JSON `{"error":"..."}`):**  
  - `400` — `missing_cam_ip`, `empty_cam_ip`  
  - `401` — `missing_bearer_token`, `empty_token`, `invalid_token` (token inexistente, ou câmera sem `usuario_id`, ou token errado — mesma mensagem pública)  
  - `405` — `method_not_allowed`  
  - `500` — `database_lock`, `database_error`

### Variáveis de ambiente

| Variável | Padrão | Função |
|----------|--------|--------|
| `DATABASE_PATH` | `app.db` | Caminho do ficheiro SQLite. |
| `BIND_ADDR` | `0.0.0.0:8080` | Endereço onde o servidor HTTP escuta. |

---

## 3. Modelo de dados (SQLite) — resumo

- **`usuarios`** — contas (nome, email, senha hasheada; CRUD JWT ainda por implementar).  
- **`cameras`** — `token` único, `usuario_id` FK para dono, `cam_ip` atualizado pela ESP.  
- **`locais`**, **`visitantes`** — preparados para CRUD futuro.

---

## 4. Changelog (alterações relevantes)

### 2026-05-12 — Documentação do fluxo compra/ESP + regra `usuario_id`

- **Criado** este ficheiro `rules/api-desenvolvimento.md`.  
- **Alterado** `update_camera_ip` em `src/db.rs`: o `UPDATE` só corre se `token` coincide **e** `usuario_id IS NOT NULL`, alinhado ao fluxo “câmera vendida e vinculada ao utilizador”.

### 2026-05-12 (sessão anterior) — Primeira fatia da API

- Servidor `tiny_http`, SQLite `rusqlite` (feature `bundled`), JSON com `serde_json`.  
- Endpoints `/health` e `/receberIP`.  
- Esquema inicial das tabelas em `src/db.rs`.  
- `.gitignore`: `*.db`.  
- `Cargo.toml`: edition `2021` (substituição de `2024` para compatibilidade com toolchains comuns).

---

## 5. Erros encontrados e como foram resolvidos

| Contexto | Erro | Solução |
|----------|------|---------|
| Compilação com `tiny_http` | `HeaderField` usa `AsciiStr`; `eq_ignore_ascii_case("authorization")` não compilava com `&str`. | Usar `h.field.equiv("authorization")` da API do `tiny_http`. |
| Compilação | `h.value.as_str().ok()` — `AsciiString` já expõe `&str` via `as_str()` sem `Option`. | Remover `.ok()`; usar `h.value.as_str()` diretamente. |
| `cargo build` no ambiente Cursor | `Permission denied` ao escrever em `~/.cargo/registry` (sandbox). | Executar build com permissões que permitam escrita no registry, ou build local fora do sandbox. |
| Binário não aparecia em `api/target/debug/` | Variável de ambiente `CARGO_TARGET_DIR` apontava para cache externo. | Usar `cargo run` / caminho indicado pelo `metadata` ou desativar `CARGO_TARGET_DIR` se for preciso binário em `target/` local. |
| Teste manual `receberIP` | Inserir câmera só com `token` sem `usuario_id` → antes atualizava IP. | Após alinhar ao fluxo de “compra”, exige-se `usuario_id` preenchido; testes devem incluir `INSERT` com `usuario_id` válido. |

---

## 6. Teste rápido manual (`receberIP`)

Com servidor a correr e base `app.db` inicializada ao arranque:

```sql
-- utilizador mínimo para FK
INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Teste', 't@exemplo.pt', 'x');

-- câmera "vendida" ao utilizador 1
INSERT INTO cameras (nome, token, usuario_id) VALUES ('Cam A', 'TOKEN_SECRETO_AQUI', 1);
```

```bash
curl -H "Authorization: Bearer TOKEN_SECRETO_AQUI" \
  "http://127.0.0.1:8080/receberIP?cam_ip=192.168.1.100"
```

Esperado: HTTP 200 e `cam_ip` na base atualizado.

---

## 7. Próximos passos (tarefa geral)

- CRUD de contas + hash de senha (ex. Argon2).  
- JWT e middleware nas rotas do app.  
- CRUD câmeras / visitantes / locais (incluindo geração de token na “compra”).  
- WebSocket: servidor liga ao IP da câmera e reencaminha imagens para o cliente RN.

Quando existir UML oficial no repositório, ajustar tabelas/colunas e atualizar as secções 3 e 4 deste documento.
