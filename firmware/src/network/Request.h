#pragma once

#include "HTTPClient.h"
#include "WiFi.h"

class Request {
    public:
        Request();
        ~Request() = default;

        void sendIp();
    private:
            char _token[50];

};