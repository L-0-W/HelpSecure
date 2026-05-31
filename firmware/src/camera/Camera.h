#pragma once
#include <Arduino.h>
#include "esp_camera.h"

class Camera {
public:
    Camera();
    bool init();
    camera_fb_t* getFrame();
    void freeBuffer(camera_fb_t* fb);
    void shutdownCamera();
    void powerupCamera();

    bool State = 1;

private:
    camera_config_t _config;
};