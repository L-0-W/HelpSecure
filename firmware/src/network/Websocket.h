#pragma once
#include <Arduino.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoWebsockets.h>

#include "esp_camera.h"


class NetworkManager {
public:
    NetworkManager();
    void init(); // Inicia tanto o servidor local quanto o cliente WSS
    void connectToRemote();
    void sendFrame(camera_fb_t* fb);
    void loop(); // Necessário para processar o WebSocket do cliente (poll)
    void pollRemote();
    bool shouldStream();       // Adicione isso
 
private:
    AsyncWebServer _server;
    AsyncWebSocket _wsLocal; // Seu servidor local
    websockets::WebsocketsClient _wsRemote; // Cliente para o Render
    WiFiClientSecure _secureClient;

    static void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, 
                        AwsEventType type, void *arg, uint8_t *data, size_t len);
};