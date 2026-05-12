#include "Request.h"
#include "WiFi.h"

Request::Request() {}


void Request::sendIp()
{
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;

        String baseUrl = "http://sua-api.com/api/v1/resource";
        String params = "?cam_ip=" + WiFi.localIP().toString(); 
        String fullUrl = baseUrl + params;

        http.begin(fullUrl);

        http.addHeader("Authorization", _token);        
        http.addHeader("Content-Type", "application/json");

        int httpResponseCode = http.GET();

        if (httpResponseCode > 0) {
            String response = http.getString();
            Serial.print("Código de resposta: ");
            Serial.println(httpResponseCode);
            Serial.println("Resposta: " + response);
        } else {
            Serial.print("Erro na requisição: ");
            Serial.println(http.errorToString(httpResponseCode).c_str());
        }

        http.end();
    } else {
        Serial.println("WiFi desconectado!");
    }
}