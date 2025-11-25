#include <Wire.h>
#include <BH1750.h>
#include <WiFi.h>
#include <HTTPClient.h>

#define TCA_ADDR 0x70   // Dirección del multiplexor

// === Sensores BH1750 en cada canal del TCA9548A ===
BH1750 s0;
BH1750 s1;
BH1750 s2;
BH1750 s3;
BH1750 s4;
BH1750 s5;
BH1750 s6;
BH1750 s7A(0x23);   // Canal 7 – sensor A
BH1750 s7B(0x5C);   // Canal 7 – sensor B

// === WiFi y servidor ===
const char* ssid     = "S22 de Mario";      
const char* password = "vjgw3101";   

const char* serverUrl = "http://10.226.92.153:3000/api/lecturas-multi";

// ==========================
// Seleccionar canal del TCA
// ==========================
void tcaSelect(uint8_t channel) {
  if (channel > 7) return;
  Wire.beginTransmission(TCA_ADDR);
  Wire.write(1 << channel);
  Wire.endTransmission();
  delay(3);
}

// ==========================
// Enviar TODAS las lecturas
// ==========================
void enviarLecturasBatch(float lecturas[]) {

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  // Crear JSON con todas las lecturas
  String json = "{ \"lecturas\": [";

  for (int i = 0; i < 9; i++) {
    json += "{";
    json += "\"sensor_id\":" + String(i + 1) + ",";
    json += "\"lux\":" + String((int)lecturas[i]);
    json += "}";
    if (i < 8) json += ",";
  }

  json += "] }";

  Serial.println("JSON enviado:");
  Serial.println(json);

  int code = http.POST(json);

  Serial.print("POST Batch -> ");
  Serial.println(code);

  if (code > 0) Serial.println(http.getString());

  http.end();
}

// ==========================
void setup() {
  Serial.begin(115200);
  Wire.begin();

  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado.");
  Serial.println(WiFi.localIP());

  // Inicializar BH1750
  tcaSelect(0); s0.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  tcaSelect(1); s1.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  tcaSelect(2); s2.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  tcaSelect(3); s3.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  tcaSelect(4); s4.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  tcaSelect(5); s5.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  tcaSelect(6); s6.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);

  tcaSelect(7);
  s7A.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  s7B.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);

  Serial.println("Sensores BH1750 listos.");
}

// ==========================
void loop() {

  float L[9];

  // === Lectura canales 0–6 ===
  tcaSelect(0); L[0] = s0.readLightLevel();
  tcaSelect(1); L[1] = s1.readLightLevel();
  tcaSelect(2); L[2] = s2.readLightLevel();
  tcaSelect(3); L[3] = s3.readLightLevel();
  tcaSelect(4); L[4] = s4.readLightLevel();
  tcaSelect(5); L[5] = s5.readLightLevel();
  tcaSelect(6); L[6] = s6.readLightLevel();

  // === Canal 7 dos sensores ===
  tcaSelect(7);
  L[7] = s7A.readLightLevel();
  L[8] = s7B.readLightLevel();

  Serial.println("Lecturas OK, enviando batch...");

  enviarLecturasBatch(L);

  delay(1000);
}
