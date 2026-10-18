# GPS-AI — Reconocimiento de señales con cámara del móvil

Estado: preparado como siguiente fase, sin activar todavía en producción.

## Objetivo
Reconocer señales de tráfico mediante la cámara trasera del teléfono durante la navegación, sin depender de la cámara del vehículo ni de Android Auto.

## Primera versión prevista
- Límites de velocidad: 20, 30, 40, 50, 60, 70, 80, 90, 100, 110 y 120 km/h.
- STOP.
- Dirección prohibida.
- Entrada prohibida / restricciones básicas cuando el modelo lo permita con suficiente confianza.
- Procesamiento local en el dispositivo cuando sea viable.
- Umbral de confianza alto y confirmación en varios fotogramas para reducir falsos avisos.
- Actualización temporal del límite mostrado solo cuando la detección sea suficientemente fiable.
- Aviso por voz breve y no repetitivo.

## Seguridad y Android Auto
Android Auto no proporciona acceso general a la cámara ADAS integrada del coche. Esta función usará exclusivamente la cámara del teléfono y debe funcionar como módulo separado de la interfaz Android Auto. La interfaz del coche seguirá usando las plantillas Android for Cars.

## Integración
La implementación se añadirá detrás de un interruptor de función para no afectar al mapa, GPS, navegación, radares ni Android Auto hasta que el detector esté validado en dispositivo real.

## Pendiente antes de activar
1. Elegir un modelo compatible con Android y revisar su licencia.
2. Integrar CameraX y el runtime de inferencia.
3. Añadir permiso CAMERA y flujo de consentimiento.
4. Validar precisión con señales españolas y condiciones reales de luz/distancia.
5. Medir consumo de batería, temperatura y FPS.
6. Activar solo después de comprobar que no degrada la navegación.
