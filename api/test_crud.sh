#!/bin/bash
set -e

# Configuration
PORT=8080
API_URL="http://127.0.0.1:$PORT"
DB_FILE="test_api.db"

# Cleanup old database for clean test run
rm -f "$DB_FILE"

# Start the server in the background
echo "Starting API server on port $PORT using database $DB_FILE..."
DATABASE_PATH="$DB_FILE" BIND_ADDR="127.0.0.1:$PORT" cargo run > server.log 2>&1 &
SERVER_PID=$!

# Ensure the server is terminated on exit
cleanup() {
    echo "Stopping API server..."
    kill $SERVER_PID || true
    rm -f "$DB_FILE"
}
trap cleanup EXIT

# Wait for server to start
sleep 3

# Test /health
echo "Checking /health..."
curl -s -f "$API_URL/health" | grep -q "ok"

# 1. Register a test user
echo "Registering test user..."
AUTH_RESP=$(curl -s -X POST "$API_URL/usuarios" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Test User","email":"test@example.com","senha":"password123"}')

TOKEN=$(echo "$AUTH_RESP" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
if [ -z "$TOKEN" ]; then
    echo "Failed to get JWT token! Response was:"
    echo "$AUTH_RESP"
    exit 1
fi
echo "JWT token obtained successfully."

# 2. Local CRUD Tests
echo "--- Testing Locais CRUD ---"

# 2.1 Create a location
echo "Creating local 'Escritorio'..."
CREATE_LOCAL_RESP=$(curl -s -X POST "$API_URL/locais" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Escritorio","descricao":"Lugar de trabalho"}')

echo "$CREATE_LOCAL_RESP"
LOCAL_ID=$(echo "$CREATE_LOCAL_RESP" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
if [ -z "$LOCAL_ID" ]; then
    echo "Failed to create location! Response was: $CREATE_LOCAL_RESP"
    exit 1
fi
echo "Created local ID: $LOCAL_ID"

# 2.2 List locations
echo "Listing locations..."
LIST_LOCAL_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/locais")
echo "$LIST_LOCAL_RESP" | grep -q "Escritorio"

# 2.3 Get location detail
echo "Getting local details..."
GET_LOCAL_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/locais/$LOCAL_ID")
echo "$GET_LOCAL_RESP" | grep -q '"nome":"Escritorio"'

# 2.4 Update location
echo "Updating local 'Escritorio' to 'Escritorio Novo'..."
UPDATE_LOCAL_RESP=$(curl -s -X PUT "$API_URL/locais/$LOCAL_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Escritorio Novo","descricao":"Lugar de trabalho renovado"}')
echo "$UPDATE_LOCAL_RESP" | grep -q "Escritorio Novo"

# 3. Visitors CRUD Tests
echo "--- Testing Visitantes CRUD ---"

# 3.1 Create a visitor linked to the location
echo "Creating visitor 'Carlos'..."
CREATE_VIS_RESP=$(curl -s -X POST "$API_URL/visitantes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"nome\":\"Carlos\",\"validade\":\"2026-12-31T23:59:59Z\",\"local_id\":$LOCAL_ID,\"face_image_bytes\":[1,2,3,4]}")

echo "$CREATE_VIS_RESP"
VIS_ID=$(echo "$CREATE_VIS_RESP" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
if [ -z "$VIS_ID" ]; then
    echo "Failed to create visitor! Response was: $CREATE_VIS_RESP"
    exit 1
fi
echo "Created visitor ID: $VIS_ID"

# 3.2 List visitors
echo "Listing visitors..."
LIST_VIS_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/visitantes")
echo "$LIST_VIS_RESP" | grep -q "Carlos"

# 3.3 Get visitor detail
echo "Getting visitor details..."
GET_VIS_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/visitantes/$VIS_ID")
echo "$GET_VIS_RESP" | grep -q '"nome":"Carlos"'

# 3.4 Update visitor
echo "Updating visitor 'Carlos' to 'Carlos Silva'..."
UPDATE_VIS_RESP=$(curl -s -X PUT "$API_URL/visitantes/$VIS_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Carlos Silva","validade":"2027-01-01T00:00:00Z"}')
echo "$UPDATE_VIS_RESP" | grep -q "Carlos Silva"

# 3.5 Delete visitor
echo "Deleting visitor..."
DELETE_VIS_RESP=$(curl -s -X DELETE "$API_URL/visitantes/$VIS_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "$DELETE_VIS_RESP" | grep -q '"ok":true'

# Verify visitor is gone
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/visitantes/$VIS_ID" | grep -q "visitante_not_found"

# 2.5 Delete location
echo "Deleting location..."
DELETE_LOCAL_RESP=$(curl -s -X DELETE "$API_URL/locais/$LOCAL_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "$DELETE_LOCAL_RESP" | grep -q '"ok":true'

# Verify location is gone
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/locais/$LOCAL_ID" | grep -q "local_not_found"

echo "ALL TESTS PASSED SUCCESSFULLY!"
