#pragma once
#include <Arduino.h>
#include "esp_camera.h"

class Camera {
public:
    Camera();
    bool init();
    camera_fb_t* getFrame();
    void freeBuffer(camera_fb_t* fb);

private:
    camera_config_t _config;
};