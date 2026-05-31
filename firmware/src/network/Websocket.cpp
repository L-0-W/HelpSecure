#include "Websocket.h"

const char *rootCACertificate =
    "-----BEGIN CERTIFICATE-----\n"
    "MIICCTCCAY6gAwIBAgINAgPlwGjvYxqccpBQUjAKBggqhkjOPQQDAzBHMQswCQYD\n"
    "VQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExMQzEUMBIG\n"
    "A1UEAxMLR1RTIFJvb3QgUjQwHhcNMTYwNjIyMDAwMDAwWhcNMzYwNjIyMDAwMDAw\n"
    "WjBHMQswCQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2Vz\n"
    "IExMQzEUMBIGA1UEAxMLR1RTIFJvb3QgUjQwdjAQBgcqhkjOPQIBBgUrgQQAIgNi\n"
    "AATzdHOnaItgrkO4NcWBMHtLSZ37wWHO5t5GvWvVYRg1rkDdc/eJkTBa6zzuhXyi\n"
    "QHY7qca4R9gq55KRanPpsXI5nymfopjTX15YhmUPoYRlBtHci8nHc8iMai/lxKvR\n"
    "HYqjQjBAMA4GA1UdDwEB/wQEAwIBhjAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQW\n"
    "BBSATNbrdP9JNqPV2Py1PsVq8JQdjDAKBggqhkjOPQQDAwNpADBmAjEA6ED/g94D\n"
    "9J+uHXqnLrmvT/aDHQ4thQEd0dlq7A/Cr8deVl5c1RxYIigL9zC2L7F8AjEA8GE8\n"
    "p/SgguMh1YQdc4acLa/KNJvxn7kjNuK8YAOdgLOaVsjh4rsUecrNIdSUtUlD\n"
    "-----END CERTIFICATE-----\n";

NetworkManager::NetworkManager() : _server(80), _wsLocal("/ws") {
  _wsRemote.setCACert(rootCACertificate);
}

void NetworkManager::init() {
  _server.addHandler(&_wsLocal);
  _server.begin();

  connectToRemote();
}

void NetworkManager::pollRemote() {
  if (!_wsRemote.available()) {
    Serial.println("Reconectando ao WSS...");
    connectToRemote();
  }
  _wsRemote.poll();
}

void NetworkManager::connectToRemote() {
  if (_wsRemote.connect("wss://api-robotica-movel.onrender.com/ws")) {
    Serial.println("Conectado ao Render (WSS)!");

    // Envia o JSON com o token de autenticação exigido pela API
    // Substitua "token_super_secreto_123" pelo token real gerado no banco de
    // dados.
    String authMessage = "{\"token\": \"casa-123\"}";
    _wsRemote.send(authMessage);
    Serial.println("Enviado JSON de autenticação: " + authMessage);
  } else {
    Serial.println("Falha na conexão.");
  }
}

void NetworkManager::loop() { _wsRemote.poll(); }

bool NetworkManager::shouldStream() {
  return (_wsLocal.count() > 0 || _wsRemote.available());
}

void NetworkManager::sendFrame(camera_fb_t *fb) {
  // Enviar para o Render
  if (_wsRemote.available()) {
    _wsRemote.sendBinary((const char *)fb->buf, fb->len);
  }

  // Enviar para clientes locais
  //_wsLocal.binaryAll(fb->buf, fb->len);
}