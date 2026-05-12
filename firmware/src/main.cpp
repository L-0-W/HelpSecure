#include <Arduino.h>
#include <WiFi.h>
#include "camera/Camera.h"
#include "network/Websocket.h"
#include "network/Request.h"

const char* ssid = "Zelma";
const char* password = "luiz246810";

Camera cam;
NetworkManager net;
Request req;

unsigned long lastMillis = 0;
const int interval = 100; // 10 FPS

void setup() {
    Serial.begin(115200);
    
    WiFi.begin(ssid, password);
    
    while (WiFi.status() != WL_CONNECTED) 
    {
      Serial.println("TENTANDO CONECTAR NO WIFI....");
      delay(500);
    };

    Serial.println("Enviando REQUEST para API; Inicio de conversa WEBSOCKET");
    req.sendIp();

    if (!cam.init()) {
        Serial.println("Erro na Câmera!");
        ESP.restart();
    }

    net.init();
}

void loop() {
    net.cleanup();

    if (millis() - lastMillis >= interval) 
    {
        lastMillis = millis();

        if (net.getClientCount() > 0) {
            camera_fb_t* fb = cam.getFrame();
            if (fb) {
                net.sendFrame(fb);
                cam.freeBuffer(fb);
            }
        }
    }
}