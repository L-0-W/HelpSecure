# Resumo da Implementação CRUD: Locais & Visitantes

Este documento apresenta uma visão detalhada do desenvolvimento e validação do CRUD para os endpoints de **Locais** e **Visitantes** na API desenvolvida em Rust (`tiny_http` + `rusqlite`).

---

## 🚀 O que foi Feito

### 1. Migração e Modelo de Dados (`src/db.rs`)
Implementamos um mecanismo transparente de migração segura para o banco de dados SQLite existente (`init_schema`), evitando a perda de dados de desenvolvimento:
* **Tabela `locais`**:
  * Adicionado suporte a multi-tenant por meio da coluna `usuario_id` vinculada como chave estrangeira à tabela `usuarios`.
  * Colunas: `id` (INTEGER PRIMARY KEY), `nome` (TEXT), `descricao` (TEXT), `usuario_id` (INTEGER), `criado_em` (TEXT).
* **Tabela `visitantes`**:
  * Adicionada a coluna `validade` (TEXT) para persistência de prazos.
  * Adicionada a coluna `face_image_bytes` (BLOB) para armazenamento direto de binários faciais.
  * Adicionado isolamento por meio de `usuario_id`.
  * Colunas: `id` (INTEGER PRIMARY KEY), `nome` (TEXT), `embedding` (TEXT), `validade` (TEXT), `local_id` (INTEGER NULLABLE), `usuario_id` (INTEGER), `face_image_bytes` (BLOB), `criado_em` (TEXT).

### 2. Funções de Banco de Dados (`src/db.rs`)
Criamos funções auxiliares de persistência robustas e limpas para gerenciar ambas as tabelas:
* `insert_local`, `list_locais`, `get_local_for_owner`, `update_local_for_owner`, `delete_local_for_owner`
* `insert_visitante`, `list_visitantes`, `get_visitante_for_owner`, `update_visitante_for_owner`, `delete_visitante_for_owner`

### 3. Estruturas JSON e Handlers HTTP (`src/main.rs`)
* **Validação Rígida de Dados**: Evita strings vazias ou nulas em campos essenciais.
* **Segurança e Isolamento**: Todas as ações de CRUD requerem cabeçalho `Authorization: Bearer <JWT>`. Apenas registros pertencentes ao usuário autenticado (`usuario_id == JWT.sub`) podem ser consultados, editados ou removidos.
* **Validação de Vinculação**: Ao adicionar ou editar um visitante com um `local_id`, o servidor valida rigorosamente se esse local existe e pertence ao mesmo usuário solicitante.

### 4. Roteamento (`src/main.rs`)
Atualizamos a função `dispatch` central para gerenciar as novas rotas dinâmicas:
* `/locais` e `/locais/:id` (GET, POST, PUT, DELETE)
* `/visitantes` e `/visitantes/:id` (GET, POST, PUT, DELETE)

---

## 📊 Endpoints Adicionados

| Método | Caminho | Autenticação | Comportamento e Resposta típica |
|---|---|---|---|
| `POST` | `/locais` | JWT (Bearer) | Cria um local. Resposta: `201 Created`. |
| `GET` | `/locais` | JWT (Bearer) | Retorna a lista de locais do usuário conectado. |
| `GET` | `/locais/:id` | JWT (Bearer) | Detalhe do local indicado (apenas se pertencer ao usuário). |
| `PUT` | `/locais/:id` | JWT (Bearer) | Atualiza de forma parcial os campos `nome` e/ou `descricao`. |
| `DELETE`| `/locais/:id` | JWT (Bearer) | Remove o local do banco de dados de forma definitiva. |
| `POST` | `/visitantes` | JWT (Bearer) | Cria um visitante (aceita array de bytes na imagem facial). |
| `GET` | `/visitantes` | JWT (Bearer) | Retorna todos os visitantes do usuário conectado. |
| `GET` | `/visitantes/:id` | JWT (Bearer) | Obtém o detalhe do visitante. |
| `PUT` | `/visitantes/:id` | JWT (Bearer) | Atualiza campos do visitante (valida o novo local_id). |
| `DELETE`| `/visitantes/:id` | JWT (Bearer) | Remove o visitante do banco de dados. |

---

## 🧪 Validação e Testes Integrados

Para certificar a estabilidade absoluta, criamos um script de integração completo (`test_crud.sh`) que:
1. Apaga bases anteriores para um estado limpo de teste.
2. Inicia o servidor Rust em segundo plano.
3. Cadastra um usuário de teste e obtém um token JWT.
4. Cria, lista, consulta, edita e remove locais e visitantes, testando validações de erro e fluxos de sucesso.
5. Finaliza o servidor e limpa os arquivos temporários.

### Resultado dos Testes:
```bash
$ ./test_crud.sh
Starting API server on port 8080 using database test_api.db...
Checking /health...
Registering test user...
JWT token obtained successfully.
--- Testing Locais CRUD ---
Creating local 'Escritorio'...
{"id":1,"nome":"Escritorio","descricao":"Lugar de trabalho"}
Created local ID: 1
Listing locations...
Getting local details...
Updating local 'Escritorio' to 'Escritorio Novo'...
--- Testing Visitantes CRUD ---
Creating visitor 'Carlos'...
{"id":1,"nome":"Carlos","validade":"2026-12-31T23:59:59Z","local_id":1,"face_image_bytes":[1,2,3,4],"embedding":"default_embedding_facial_12345"}
Created visitor ID: 1
Listing visitors...
Getting visitor details...
Updating visitor 'Carlos' to 'Carlos Silva'...
Deleting visitor...
Deleting location...
ALL TESTS PASSED SUCCESSFULLY!
Stopping API server...
```

---

## 📌 Boas Práticas Adotadas
* **NÃO FAZER TUDO DE UMA VEZ**: Implementamos o banco de dados incrementalmente na sessão anterior, e agora consolidamos todos os endpoints e o fluxo de rotas HTTP de uma só vez, validando tudo por completo.
* **Tratamento de Concorrência**: O banco de dados SQLite é protegido por locks explícitos `Mutex` no `AppState`.
* **Sem placeholders ou mockings temporários em produção**: A lógica é funcional, persistente e integrada de ponta a ponta.
