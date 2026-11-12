# Registro de actividades de tratamiento · BORRADOR

> **Borrador sin validar.** Redactado por Claude a partir del código (art. 30 del RGPD). Debe
> revisarlo un profesional. Lo que va entre corchetes está por rellenar o decidir.

**Responsable:** [nombre o razón social, NIF, dirección, email de contacto]
**Delegado de protección de datos:** [no designado / nombre. Confirmar si es obligatorio.]
**Fecha de esta versión:** 12 de noviembre de 2026

## 1. Prevención de lesiones y seguimiento del jugador

| | |
|---|---|
| **Finalidad** | Calcular el perfil de riesgo por zona, ofrecer rutinas y programas, registrar el dolor y avisar de cuándo parar y consultar |
| **Base legal** | Consentimiento explícito para los datos de salud (art. 9.2.a). Ejecución del servicio para el resto (art. 6.1.b) [confirmar] |
| **Interesados** | Jugadores de pádel adultos que usan la app |
| **Datos** | Edad, horas de juego semanales, nivel; dolor de 0 a 10 por zona con fecha y contexto (salud); programa activo y rutinas terminadas; fecha y versión del consentimiento; huella de la clave del móvil |
| **Datos que no se recogen** | Nombre, email, teléfono, ubicación, identificadores publicitarios |
| **Origen** | El propio jugador, desde la app |
| **Destinatarios** | Proveedor de alojamiento como encargado: [proveedor, país de la UE] |
| **Transferencias internacionales** | Ninguna [confirmar con el proveedor] |
| **Conservación** | Hasta que el jugador borra su cuenta. [Plazo por inactividad por decidir] |
| **Dónde está** | Tablas `player`, `pain_entry`, `program_enrollment`, `routine_completion` |

## 2. Mejora del contenido con estadísticas agregadas

| | |
|---|---|
| **Finalidad** | Saber cuántos jugadores vuelven y en qué ejercicio se abandonan las rutinas, para mejorar el contenido |
| **Base legal** | Interés legítimo (art. 6.1.f) [confirmar] |
| **Interesados** | Los mismos jugadores |
| **Datos** | Rutina y ejercicio en el que el jugador pulsa "Salir", con fecha, ligados a su identificador anónimo. El panel solo muestra totales |
| **Destinatarios** | Proveedor de alojamiento. Ningún servicio de analítica externo |
| **Conservación** | La misma que la cuenta: se borra con ella |
| **Dónde está** | Tabla `routine_abandonment`; panel en `/api/admin/panel`, protegido con contraseña |

## 3. Aviso del partido con la app cerrada

| | |
|---|---|
| **Finalidad** | Avisar al jugador 30 minutos antes de su partido para que caliente |
| **Base legal** | Consentimiento: el permiso de notificaciones que el jugador concede en su navegador (art. 6.1.a) [confirmar] |
| **Interesados** | Jugadores que marcan la hora del partido y aceptan las notificaciones |
| **Datos** | Hora del partido; si se repite cada semana y la zona horaria del móvil; dirección de notificaciones del móvil (endpoint) y sus claves de cifrado |
| **Destinatarios** | Proveedor de alojamiento. Servicio de notificaciones del navegador del jugador (Google, Apple o Mozilla), que recibe la dirección y un mensaje cifrado sin datos personales ni de salud |
| **Transferencias internacionales** | Posibles, a través de esos servicios [revisar con el abogado] |
| **Conservación** | Hasta 24 horas después del partido; el semanal, hasta que el jugador deja de pedir el aviso. Siempre se borra al borrar la cuenta |
| **Dónde está** | Tabla `match_reminder` |

## 4. Seguridad del servicio

| | |
|---|---|
| **Finalidad** | Evitar la creación masiva de jugadores |
| **Base legal** | Interés legítimo (art. 6.1.f) |
| **Interesados** | Cualquiera que se conecte al servidor |
| **Datos** | Dirección IP (en IPv6, su prefijo) y número de altas en la última hora |
| **Destinatarios** | Proveedor de alojamiento [indicar si conserva registros de acceso y cuánto tiempo] |
| **Conservación** | Una hora como máximo, solo en memoria. No llega a la base de datos |

## Medidas de seguridad (art. 32)

- De la clave del jugador solo se guarda una huella (hash).
- Conexión cifrada por HTTPS y cabeceras de seguridad en todas las respuestas.
- Límite de altas por conexión y hora.
- Borrado completo e inmediato desde la app, en cascada sobre todas las tablas.
- Los datos de dolor no se envían a servicios externos.
- [Pendiente: cifrado de la base de datos en reposo, copias de seguridad cifradas y control de
  quién accede a la base de datos, al contratar el alojamiento.]

## Encargados del tratamiento

| Encargado | Servicio | Contrato (art. 28) |
|---|---|---|
| [Proveedor de alojamiento] | Servidor y base de datos PostgreSQL en la UE | [pendiente de firmar] |
| Google, Apple, Mozilla (servicio de notificaciones del navegador) | Entrega del aviso del partido, cifrado | [revisar con el abogado si aplica y cómo] |
