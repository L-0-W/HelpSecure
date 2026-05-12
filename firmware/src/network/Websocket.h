#pragma once
#include <Arduino.h>
#include <ESPAsyncWebServer.h>
#include "esp_camera.h"

class NetworkManager {
public:
    NetworkManager();
    void init();
    void cleanup();
    void sendFrame(camera_fb_t* fb);
    int getClientCount();

private:
    AsyncWebServer _server;
    AsyncWebSocket _ws;
    static void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, 
                        AwsEventType type, void *arg, uint8_t *data, size_t len);
};