#include "./Sonico.hpp"
#include "Arduino.h"
#include <cstddef>


const int PIN_TRIG = 15;
const int PIN_ECHO = 13;

#define VELOCIDADE_SOM 0.0343

Sonico::Sonico()
{

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  
  digitalWrite(PIN_TRIG, LOW);
}


float Sonico::getSonicoValue() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  
  long duracao = pulseIn(PIN_ECHO, HIGH);
  float distancia_cm = duracao * VELOCIDADE_SOM / 2;
  
  if (duracao == 0) {
    return 0;  
  } else {
    return distancia_cm;
  }
  
  delay(500);
}