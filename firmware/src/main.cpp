#include <Arduino.h>
#include <WiFiClientSecure.h>
#include <WiFi.h>
#include <ArduinoWebsockets.h>

#include "camera/Camera.h"
#include "network/Websocket.h"

const char* ssid = "Zelma";
const char* password = "luiz246810";

Camera cam;
NetworkManager net;

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

    if (!cam.init()) {
        Serial.println("Erro na Câmera!");
        ESP.restart();
    }

    net.init();
}

void loop() {
    // Manter a conexão WSS ativa (essencial para não cair o ping)
    net.pollRemote(); 

    if (millis() - lastMillis >= interval) 
    {
        lastMillis = millis();

        // Verifica se há interesse em vídeo (seja local ou remoto)
        if (net.shouldStream()) {
            camera_fb_t* fb = cam.getFrame();
            if (fb) {
                net.sendFrame(fb); 
                cam.freeBuffer(fb);
            }
        }
    }
}