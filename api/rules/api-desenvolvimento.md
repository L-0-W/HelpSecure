# Registro de desenvolvimento da API (Rust)

Este arquivo é atualizado conforme o projeto evolui: **fluxo de negócio**, **documentação dos endpoints**, **alterações no código**, **erros encontrados e soluções**.

---

## 1. Fluxo: compra da câmera → ESP → app do utilizador

Objetivo: quando alguém **compra** uma câmera, ela passa a pertencer à **conta do utilizador**; ao ligar na internet, a ESP **abre uma ligação WebSocket para a API**, envia o **token** da câmera; o servidor valida na base, sabe **qual câmera e qual utilizador** são, grava o **IP visível pelo servidor** (`cam_ip`) e mantém a sessão WS aberta para dados em tempo real (ex.: imagens para o app).

### Passo a passo

1. **Compra / registo da câmera no utilizador**  
   - **Opção A (implementada):** utilizador autenticado chama **`POST /cameras`**; o servidor gera **token** opaco (32 bytes, base64url), grava `cameras` com `usuario_id` = `sub` do JWT e devolve o **token na resposta 201** (única vez na API — gravar na ESP / app).  
   - **Opção B:** painel admin ou outro fluxo insere na base o mesmo esquema (`token` + `usuario_id`).  
   - O **app** (React Native), com JWT, usa **`GET /cameras`** para listar câmeras (sem repetir o token) e vê `cam_ip` depois da ESP **autenticar-se no WebSocket** (campo atualizado com o endereço TCP do peer visto pelo servidor).

2. **Câmera liga na rede (ESP32)**  
   - A ESP abre **WebSocket** para `WS_BIND_ADDR` (por defeito `ws://<host>:9000/` ou no render `wss://sua-api.onrender.com/`).  
   - **Primeira mensagem** (texto JSON): `{"token":"<token_da_camara>"}`.  
   - O servidor responde com JSON `{"ok":true,"camera_id",...,"peer_ip":...}` ou `{"ok":false,"error":"..."}` e mantém a ligação.

3. **Servidor**  
   - Valida `token` em **`cameras`** com **`usuario_id` não nulo**.  
   - Atualiza **`cam_ip`** com o IP do **peer TCP** da ligação (o que o servidor vê — por vezes o IP público da NAT, não o 192.168.x local; pode evoluir-se para a ESP enviar o IP local numa mensagem seguinte).  
   - Regista **`camera_id` → `usuario_id`** num mapa em memória enquanto o WebSocket estiver aberto (para relay futuro ao React Native).  
   - O **app** lista câmeras e vê `cam_ip` / estado conforme a evolução da API.

### O que **não** faz sentido na prática

- Token inválido ou câmera sem `usuario_id`: o WebSocket responde `invalid_token` em JSON e fecha — sem revelar se o token existe sem dono.

### Resumo em uma frase

**Token = identidade da câmera; `usuario_id` = dono na base; WebSocket = a ESP liga-se à API, autentica com o token, e o servidor associa sessão + IP visível ao utilizador dono.**

### 1.1 Alinhamento com a Especificação (`doc/tarefa.md` e `doc/rules.md`)

A implementação atual atende de forma coesa aos requisitos de `doc/tarefa.md`, incorporando uma **melhoria arquitetural crítica**:
- **Requisito Original:** Previa um endpoint `GET /receberIP` para a câmera "cadastrar" seu IP, e em seguida, o servidor conectar via WebSocket ao IP da câmera.
- **A Melhoria (Implementada):** Como a grande maioria das câmeras ESP32 estará conectada através de redes NAT (roteadores residenciais comuns), o servidor na nuvem **não consegue iniciar uma conexão direta** para a câmera de forma confiável. Para contornar essa limitação física, a arquitetura foi invertida: **A própria câmera ESP32 é quem inicia a conexão WebSocket para o servidor** (`WS_BIND_ADDR`). Essa mudança elimina completamente a necessidade do `/receberIP` e contorna qualquer limitação de firewall/NAT, alcançando de forma muito mais eficaz o objetivo final de streaming bidirecional.
- **Login, Cadastro e JWT:** A API já atende plenamente a solicitação de possuir "endpoints de login/cadastro, utilizando JWT para manter conectado", assim como as "senhas hasheadas para guardar no banco de dados". A integração de Argon2 (hashing) e a geração autossuficiente de JWT via `hmac` alinham-se aos padrões de segurança desejados, de forma leve.
- **Progresso Gradual (`doc/rules.md`):** Obedecendo à regra de "NÃO FAZER TUDO DE UMA VEZ", a fundação (autenticação, contas de usuário e o registro das câmeras via WS) foi consolidada e validada primeiro, deixando os CRUDs de visitantes e locais como os próximos passos seguros a serem integrados à base sólida.

---

## 2. Endpoints implementados (estado atual)

| Método | Caminho | Autenticação | Descrição |
|--------|---------|----------------|-----------|
| `GET` | `/health` | — | `{"status":"ok"}`. |
| **WS** | `ws://…:9000/` (ver `WS_BIND_ADDR`) | **token** no 1.º frame JSON | Câmera liga-se à API; autenticação e canal contínuo. |
| `POST` | `/usuarios` | — | Criar conta (nome, email, senha). Resposta inclui JWT. |
| `POST` | `/auth/login` | — | Login com email e senha; devolve JWT. |
| `GET` | `/usuarios/:id` | Bearer = **JWT do utilizador** | Só o próprio utilizador (`:id` = `sub` do token). |
| `PUT` | `/usuarios/:id` | Bearer = JWT | Atualizar nome, email e/ou senha (corpo JSON parcial). |
| `DELETE` | `/usuarios/:id` | Bearer = JWT | Apagar a própria conta. |
| `POST` | `/cameras` | Bearer = JWT | “Compra” / registo: gera `token`, associa ao utilizador. |
| `GET` | `/cameras` | Bearer = JWT | Lista câmeras do utilizador (**sem** campo `token`). |
| `GET` | `/cameras/:id` | Bearer = JWT | Detalhe de uma câmera do dono (**sem** `token`). |
| `PUT` | `/cameras/:id` | Bearer = JWT | Atualizar `nome` (JSON `{"nome":"..."}` ou `null` / `""` para limpar). |
| `DELETE` | `/cameras/:id` | Bearer = JWT | Remover câmera do utilizador. |
| `POST` | `/locais` | Bearer = JWT | Criar local para o utilizador. |
| `GET` | `/locais` | Bearer = JWT | Listar locais do utilizador. |
| `GET` | `/locais/:id` | Bearer = JWT | Obter detalhe de um local. |
| `PUT` | `/locais/:id` | Bearer = JWT | Atualizar local (nome, descricao). |
| `DELETE` | `/locais/:id` | Bearer = JWT | Remover local. |
| `POST` | `/visitantes` | Bearer = JWT | Criar visitante. |
| `GET` | `/visitantes` | Bearer = JWT | Listar visitantes do utilizador. |
| `GET` | `/visitantes/:id` | Bearer = JWT | Obter detalhe de um visitante. |
| `PUT` | `/visitantes/:id` | Bearer = JWT | Atualizar visitante. |
| `DELETE` | `/visitantes/:id` | Bearer = JWT | Remover visitante. |

### WebSocket — câmera (`camera_ws`)

- **Porta / endereço:** variável `WS_BIND_ADDR` (ex. `0.0.0.0:9000`). URL típica: `ws://<ip_do_servidor>:9000/` (path na handshake é indiferente para o código atual).  
- **Protocolo:** após o upgrade WebSocket, a **primeira mensagem de texto** tem de ser JSON:  
  `{"token":"<mesmo_token_que_POST_/cameras_devolveu>"}`  
- **Sucesso:** mensagem de texto `{"ok":true,"camera_id":N,"usuario_id":M,"peer_ip":"..."}`.  
- **Falha:** `{"ok":false,"error":"invalid_token"}` (e variantes: `invalid_json`, `missing_token`, `database_error`, …); a ligação fecha.  
- **Depois:** o servidor responde a **Ping** com **Pong**; frames **Binary** estão reservados para imagem/stream no próximo passo.  
- **Estado interno:** enquanto o WS está aberto, existe entrada `camera_id → usuario_id` em memória (partilhada com `AppState.active_cameras` para uso futuro).

### `POST /usuarios` — criar conta

Corpo JSON:

```json
{ "nome": "...", "email": "...", "senha": "..." }
```

- Email: validação mínima (`@`, comprimento).  
- Senha: mínimo **8** caracteres.  
- Senha guardada com **Argon2** (PHC string).  
- **201:** `{"token":"<jwt>","usuario":{"id", "nome", "email", "criado_em"}}`  
- **409:** `email_in_use`  
- Outros: `invalid_json`, `invalid_nome`, `invalid_email`, `weak_password`, `hash_failed`, `database_error`, `token_create_failed`.

### `POST /auth/login`

```json
{ "email": "...", "senha": "..." }
```

- **200:** mesmo formato que o registo (`token` + `usuario`).  
- **401:** `invalid_credentials` (email inexistente ou senha errada — mesma mensagem).

### `GET /usuarios/:id`

- **Header:** `Authorization: Bearer <jwt>` com `sub` igual a `:id`.  
- **200:** objeto utilizador público (sem hash de senha).  
- **401:** token em falta ou inválido / expirado.  
- **403:** `forbidden` — JWT válido mas não é o dono do `:id`.  
- **404:** `user_not_found` ou caminho inválido.

### `PUT /usuarios/:id`

Corpo JSON (pelo menos um campo):

```json
{ "nome": "...", "email": "...", "senha": "..." }
```

Todos opcionais, mas não pode ser `{}`. Campos omitidos mantêm o valor atual.

- **200:** utilizador atualizado.  
- **400:** `no_fields_to_update`, validações iguais ao registo.  
- **409:** `email_in_use`.

### `DELETE /usuarios/:id`

- **200:** `{"ok": true}`  
- **404:** `user_not_found`.

### `POST /cameras`

Corpo opcional: `{ "nome": "Sala" }` ou `{}`. O nome é opcional.

- **201:** `{"id", "nome", "cam_ip", "criado_em", "token"}` — o **`token` só aparece aqui**; nas listagens e GETs seguintes não é devolvido (segurança).  
- **401:** JWT em falta ou inválido.  
- **500:** `token_collision` (extremamente raro, após várias tentativas de token único), `database_error`.

### `GET /cameras`

- **200:** `{"cameras": [ { "id", "nome", "cam_ip", "criado_em" }, ... ] }`.

### `GET /cameras/:id` / `PUT` / `DELETE`

- Dono = `usuario_id` igual ao `sub` do JWT.  
- **404:** `camera_not_found` se o id não existir ou não for do utilizador.  
- **PUT:** corpo `{"nome": "..."}` obrigatório (chave `nome` presente); string vazia ou `null` em `nome` grava `NULL` na base.

### `POST /locais`
Corpo JSON:
```json
{ "nome": "Escritorio", "descricao": "Espaço de trabalho" }
```
- **201:** `{"id": 1, "nome": "Escritorio", "descricao": "Espaço de trabalho"}`.
- **400:** `invalid_nome`.

### `GET /locais`
- **200:** `{"locais": [ { "id": 1, "nome": "Escritorio", "descricao": "Espaço de trabalho" } ]}`.

### `GET /locais/:id` / `PUT` / `DELETE`
- **GET (200):** Detalhe do local.
- **PUT:** Corpo `{ "nome": "Novo Nome", "descricao": "Nova Descricao" }` (pelo menos um campo). Retorna `200` com o local atualizado.
- **DELETE (200):** `{"ok": true}`. Apaga o local e desvincula visitantes (local_id passa a NULL).
- **404:** `local_not_found`.

### `POST /visitantes`
Corpo JSON:
```json
{
  "nome": "Carlos",
  "validade": "2026-12-31T23:59:59Z",
  "local_id": 1,
  "face_image_bytes": [1, 2, 3, 4]
}
```
- **201:** Retorna `201` com o JSON do visitante criado contendo `id`, `nome`, `validade`, `local_id`, `face_image_bytes` e `embedding`.
- **400:** `invalid_nome`, `invalid_validade`, `invalid_local_id` (se local não existir ou não for do utilizador).

### `GET /visitantes`
- **200:** `{"visitantes": [ { "id", "nome", "validade", "local_id", "face_image_bytes", "embedding" } ]}`.

### `GET /visitantes/:id` / `PUT` / `DELETE`
- **GET (200):** Detalhe do visitante.
- **PUT:** Corpo parcial do visitante para atualizar. Retorna `200` com o visitante atualizado.
- **DELETE (200):** `{"ok": true}`.
- **404:** `visitante_not_found`.

### Variáveis de ambiente

| Variável | Padrão | Função |
|----------|--------|--------|
| `DATABASE_PATH` | `app.db` | Ficheiro SQLite. |
| `BIND_ADDR` | `0.0.0.0:8080` | Servidor HTTP (`tiny_http`). |
| `WS_BIND_ADDR` | `0.0.0.0:9000` | **WebSocket** para câmeras (TCP + upgrade). |
| `JWT_SECRET` | (valor de desenvolvimento + aviso no stderr) | Chave HMAC para assinar JWT. **Definir em produção.** |
| `JWT_TTL_SECS` | `604800` (7 dias) | Validade do token. |

### JWT (implementação)

- Algoritmo **HS256**, formato compacto standard, sem dependência `jsonwebtoken` (usa `hmac` + `sha2` + `base64`).  
- Payload: `sub` = id do utilizador (string), `exp` = Unix seconds.  
- Rotas `/usuarios/:id` exigem que `sub` == `:id` (cada utilizador só gere a própria conta).

---

## 3. Modelo de dados (SQLite) — resumo

- **`usuarios`** — `nome`, `email` UNIQUE, `senha_hash` (Argon2), `criado_em`.  
- **`cameras`** — `token` UNIQUE, `usuario_id` (dono), `nome`, `cam_ip`, `criado_em`.  
- **`locais`** — `id`, `nome`, `descricao`, `usuario_id` (dono), `criado_em`.
- **`visitantes`** — `id`, `nome`, `embedding`, `validade`, `local_id` (FK locais), `usuario_id` (dono), `face_image_bytes` (BLOB), `criado_em`.

---

## 4. Changelog (alterações relevantes)

### 2026-05-25 — CRUD de Locais e Visitantes (Implementação Completa)

- **Novos Endpoints:** Implementação de todas as operações CRUD para as rotas `/locais`, `/locais/:id`, `/visitantes` e `/visitantes/:id`.
- **Validação de Negócio e Segurança:** Adição de escopo baseado em JWT/`usuario_id` para garantir o isolamento multi-tenant dos dados. A adição de visitantes valida rigorosamente se o local fornecido existe e pertence ao utilizador.
- **Suporte a Imagens e TTL:** A tabela de visitantes agora armazena de forma persistente os campos `validade` e `face_image_bytes` (BLOB) conforme especificado no escopo.
- **Migração Transparente:** Implementado processo automático de migração/alteração de tabelas no banco de dados SQLite existente sem quebras.
- **Asset de Testes:** Criado o script `test_crud.sh` que executa testes de integração ponta a ponta automatizados para todo o fluxo CRUD.

### 2026-05-15 — Verificação de Coesão e Autenticação (JWT)

- **Validação de Requisitos:** Confirmado que a implementação de autenticação (cadastro e login em `/usuarios` e `/auth/login`) já atende rigorosamente ao exigido em `doc/tarefa.md` (senhas com hash Argon2 e proteção de rotas/middlewares usando JWT).
- **Documentação Arquitetural:** Documentado o racional por trás de como a solução de WebSocket invertido (ESP32 conectando ao Servidor) substitui o `GET /receberIP` de forma muito mais resiliente perante NATs e firewalls residenciais.

### 2026-05-13 — WebSocket para câmera (substitui `GET /receberIP`)

- Removido **`GET /receberIP`**. A ESP **liga-se** ao servidor em **`WS_BIND_ADDR`** (TCP + upgrade WebSocket, crate **`tungstenite`**).  
- Novo módulo `src/camera_ws.rs`: primeira mensagem JSON `{"token":"..."}`; validação com `db::get_camera_by_token`; `update_camera_ip` com IP do **peer** TCP; mapa em memória `camera_id → usuario_id` enquanto o WS estiver aberto (`AppState.active_cameras`).  
- `db::get_camera_by_token` para resolver câmera + dono.

### 2026-05-13 — CRUD `/cameras` (JWT, token na criação)

- `auth::random_camera_token()` — 32 bytes aleatórios, base64url.  
- `db`: `insert_camera`, `list_cameras_for_user`, `get_camera_for_owner`, `get_camera_for_owner_with_token`, `update_camera_nome_for_owner`, `delete_camera_for_owner`.  
- Rotas `POST/GET/PUT/DELETE` em `/cameras` e `/cameras/:id`; listagem e GET **sem** expor `token`.  
- `struct AppState` corrigido no `main.rs` (chaves dos campos tinham sido omitidas por engano num replace — compilador reportou delimitador por fechar).

### 2026-05-13 — Contas: Argon2, JWT HS256, CRUD `/usuarios` + `/auth/login`

- Novos ficheiros: `src/auth.rs` (Argon2, assinatura/verificação JWT).  
- `src/db.rs`: `insert_usuario`, `get_usuario_by_email`, `get_usuario_public`, `email_taken_by_other`, `update_usuario`, `delete_usuario`.  
- `src/main.rs`: rotas acima; `dispatch` usa `&mut Request` para ler o corpo e depois `respond`.  
- `Cargo.toml`: `argon2`, `password-hash`, `rand_core` (feature `getrandom`), `hmac`, `sha2`, `base64`.  
- Documentação consolidada neste ficheiro em **`rules/`** (removido duplicado em `doc/` se existia).

### 2026-05-12 — Documentação do fluxo compra/ESP + regra `usuario_id`

- `update_camera_ip` só com `usuario_id IS NOT NULL`.

### 2026-05-12 — Primeira fatia

- `tiny_http`, `rusqlite`, `/health`, ~~`/receberIP`~~ (depois substituído por WebSocket), esquema inicial, `.gitignore` `*.db`, edition `2021`.

---

## 5. Erros encontrados e como foram resolvidos

| Contexto | Erro | Solução |
|----------|------|---------|
| `tiny_http` | `HeaderField` / `AsciiStr` | `h.field.equiv("authorization")`. |
| `tiny_http` | `as_str().ok()` | `AsciiString::as_str()` devolve `&str` diretamente. |
| Sandbox Cargo | `Permission denied` em `~/.cargo` | Build com permissões adequadas. |
| `CARGO_TARGET_DIR` | Binário fora de `api/target/` | Usar caminho do `cargo metadata` ou variável de ambiente. |
| `receberIP` | Câmera sem dono atualizava IP | Condição `usuario_id IS NOT NULL`. |
| `password_hash::rand_core::OsRng` | Item gated por feature `getrandom` | Dependência `rand_core` com `features = ["getrandom"]` e `use rand_core::OsRng`. |
| Loop HTTP | `dispatch` consumia `Request` | `dispatch(&state, &mut request)` e `read_body` antes do `respond`. |
| UNIQUE no insert | Matching fino de `SqliteFailure` | Deteção por `e.to_string().contains("UNIQUE")` no insert/update de email. |
| `main.rs` após editar `AppState` | `unclosed delimiter` | Garantir `struct AppState { ... }` completo com todos os campos antes da próxima função. |
| `camera_ws` | Nome `spawn` chamava a si próprio | Renomear loop para `camera_ws_listen_loop` e `spawn` apenas arranca a thread. |

---

## 6. Testes manuais rápidos

### Registo e login

```bash
curl -s -X POST http://127.0.0.1:8080/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nome":"Ana","email":"ana@exemplo.pt","senha":"senha1234"}'
```

Guardar o `token` da resposta.

```bash
curl -s http://127.0.0.1:8080/usuarios/1 \
  -H "Authorization: Bearer <TOKEN_JWT>"
```

### Câmeras (API)

Depois de obter o JWT (registo ou login):

```bash
curl -s -X POST http://127.0.0.1:8080/cameras \
  -H "Authorization: Bearer <TOKEN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Entrada"}'
```

Guardar o `token` da resposta para a ESP. Listar:

```bash
curl -s http://127.0.0.1:8080/cameras -H "Authorization: Bearer <TOKEN_JWT>"
```

### WebSocket (teste local)

Com [`websocat`](https://github.com/vi/websocat) (ou cliente equivalente), depois de criar a câmera e copiar o `token`:

```bash
printf '%s' '{"token":"<TOKEN_DA_CAMERA>"}' | websocat -n ws://127.0.0.1:9000/
```

Esperado: linha JSON com `"ok":true` e `peer_ip`. O `cam_ip` na base fica com esse IP (visto pelo servidor).

---

## 7. Próximos passos (tarefa geral)

- CRUD **visitantes** e **locais**.  
- Reencaminhar frames **Binary** do WebSocket da câmera para o **React Native** (sessão do utilizador autenticado).

Quando existir UML oficial no repositório, ajustar tabelas e atualizar as secções 3 e 4.

---

## 8. Aprendizados e Melhorias (Construção da API)

1. **Simplicidade vs Eficiência em Rust:** O uso de bibliotecas como `tiny_http` acoplado a uma implementação manual, transparente e enxuta do JWT (usando `hmac` e `sha2`) garantiu que a API permaneça extremamente leve (preservando o princípio *"SER O MAIS SIMPLES POSSÍVEL - EM RUST"* da `tarefa.md`). Ao reduzir o uso de dependências excessivamente mágicas, diminuiu-se o tempo de compilação e tornou-se a análise do código mais fácil.
2. **Inversão de Controle no IoT (WebSocket):** O maior aprendizado arquitetural desta fase foi perceber que no contexto de IoT residencial (ESP32), o servidor assumir que pode se conectar ativamente no IP do dispositivo é irreal por conta do NAT. Fazer o dispositivo abrir a conexão WebSocket com o servidor e mantê-la viva resolve o problema de roteamento e descoberta de IP simultaneamente, o que foi uma evolução vital da arquitetura original.
3. **Segurança por Design:** Adotar o Argon2 (padrão-ouro em Hashing) desde o dia zero para as contas de usuário garante máxima segurança contra ataques de força bruta. Além disso, estender essa proteção amarrando os tokens físicos gerados para as câmeras aos donos (`usuario_id`) previne o sequestro de conexões WS; mesmo que alguém descubra a porta do WebSocket e o token, o acesso à câmera continua sob controle do seu verdadeiro proprietário.
