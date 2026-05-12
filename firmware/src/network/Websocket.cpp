#include "Websocket.h"

#define FLASH_GPIO 4

NetworkManager::NetworkManager() : _server(80), _ws("/ws") {}

void NetworkManager::init() {
    _ws.onEvent(onEvent);
    _server.addHandler(&_ws);
    _server.begin();
    
    pinMode(FLASH_GPIO, OUTPUT);
}

void NetworkManager::onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, 
                             AwsEventType type, void *arg, uint8_t *data, size_t len) {
    if (type == WS_EVT_DATA) {
        AwsFrameInfo *info = (AwsFrameInfo*)arg;
        if (info->opcode == WS_TEXT) {
            data[len] = 0;
            
            String msg = (char*)data;


            if (msg == "LIGAR_FLASH") digitalWrite(FLASH_GPIO, HIGH);
            if (msg == "DESLIGAR_FLASH") digitalWrite(FLASH_GPIO, LOW);
        }
    }
}

void NetworkManager::sendFrame(camera_fb_t* fb) {
    _ws.binaryAll(fb->buf, fb->len);
}

void NetworkManager::cleanup() {
    _ws.cleanupClients();
}

int NetworkManager::getClientCount() {
    return (int)_ws.count();
}