#include "Websocket.h"

NetworkManager::NetworkManager() : _server(80), _wsLocal("/ws") {
    _secureClient.setInsecure();
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
    if (_wsRemote.connect("wss://myapi.onrender.com/ws")) {
        Serial.println("Conectado ao Render (WSS)!");
    } else {
        Serial.println("Falha na conexão.");
    }
}

void NetworkManager::loop() {
    _wsRemote.poll();
}


bool NetworkManager::shouldStream() {
    return (_wsLocal.count() > 0 || _wsRemote.available());
}


void NetworkManager::sendFrame(camera_fb_t* fb) {
    //Enviar para o Render
    if (_wsRemote.available()) {
        _wsRemote.sendBinary((const char*)fb->buf, fb->len);
    }
    
    // Enviar para clientes locais
    //_wsLocal.binaryAll(fb->buf, fb->len);
}