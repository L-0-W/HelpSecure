#include <Arduino.h>
#include <WiFiClientSecure.h>
#include <WiFi.h>
#include <ArduinoWebsockets.h>

#include "HardwareSerial.h"
#include "camera/Camera.h"
#include "network/Websocket.h"
#include "sonico/Sonico.hpp"

const char* ssid = "Zelma";
const char* password = "luiz246810";

Camera cam;
NetworkManager net;
Sonico sonico;

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

    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    Serial.print("Aguardando sincronizacao de tempo (NTP).");
    time_t now = time(nullptr);
    while (now < 24 * 3600) {
        Serial.print(".");
        delay(500);
        now = time(nullptr);
    }
    Serial.println("\nTempo sincronizado!");

    Serial.println("Enviando REQUEST para API; Inicio de conversa WEBSOCKET");

    if (!cam.init()) {
        Serial.println("Erro na Câmera!");
        ESP.restart();
    }

    net.init();
}

void loop() {
    net.pollRemote(); 


    Serial.println(sonico.getSonicoValue());

    if (cam.State == 1 && sonico.getSonicoValue() > 30) cam.shutdownCamera();
     
    if (millis() - lastMillis >= interval) 
    {
        lastMillis = millis();

        if (net.shouldStream() && sonico.getSonicoValue() < 30) {
            
            if (cam.State == 0)  cam.powerupCamera();

            camera_fb_t* fb = cam.getFrame();
            if (fb) {
                net.sendFrame(fb); 
                cam.freeBuffer(fb);
            }
        }
    }
}