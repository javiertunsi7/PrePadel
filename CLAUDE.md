# PrePádel · guía para Claude

Prevención de lesiones y preparación física para jugadores amateur de pádel de 35 a 55 años.
Rutinas de 8 a 12 minutos para codo, hombro y rodilla. Repo de una sola persona (Javier).
Responde en español.

Este archivo se carga en cada sesión. Con él basta para empezar: no explores el repo ni leas
README o `docs/` "para situarte". Ve directo al archivo que indica el mapa.

## Alcance

El MVP son cinco funcionalidades y están construidas:

1. Cuestionario inicial (2 min) → perfil de riesgo por zona.
2. Rutina del día: calentamiento y recuperación, con temporizador y voz. Es la pantalla principal.
3. Programa de 4 semanas por zona, con progresión de carga.
4. Registro de dolor en un toque (0 a 10) y regla de "para y consulta".
5. Recordatorio 30 min antes del partido (hoy solo con la app abierta).

**Fuera del MVP, no se construye:** nutrición, integración con relojes, comunidad o funciones
sociales, análisis de vídeo.

**Pendiente y permitido** (única lista de trabajo; el detalle está en
`docs/movil-y-siguientes-pasos.md`, sección 2): contenido validado por un fisio, vídeos,
alojamiento, cuenta recuperable por email, RGPD, pagos,
analítica de retención, editor o revisión de contenido para el fisio, app Android con Capacitor,
notificaciones con la app cerrada, pruebas de la app entera en navegador.

**Regla.** Si lo que se pide no es una de las cinco funcionalidades ni está en la lista de
pendientes, o es una zona del cuerpo nueva (la espalda no está), dilo en una frase antes de
tocar código y espera la decisión de Javier. No lo construyas por tu cuenta.

Dentro de una tarea:

- Haz lo pedido y nada más. Sin refactors de paso, sin funciones "ya que estamos", sin
  opciones de configuración que nadie ha pedido.
- No añadas dependencias sin preguntar. El frontend solo tiene react, react-dom, react-router
  y dos fuentes, y la app pesa unos 100 kB comprimida.
- Stack decidido, no se vuelve a proponer otro: Java 25 + Spring Boot 4, React 19 +
  TypeScript + Vite (PWA), Vitest, PostgreSQL en producción y H2 en local.
- Lo que más importa es que el jugador pulse "Empezar" antes del partido. Ante la duda,
  gana ese camino frente a una función nueva.

## Reglas que no se rompen

- **Rutinas como datos.** Ejercicios, duraciones y progresiones viven en tablas, no en código.
  El contenido se cambia con una migración nueva (`V3__...sql`). `V1` y `V2` no se editan:
  Flyway lo comprueba.
- **Offline first.** Todo lo que el jugador hace debe funcionar sin cobertura: pasa por la
  cola de `frontend/src/lib/store.tsx` y `sync.ts`.
- **Manos libres.** Voz, pitidos, cuenta atrás gigante, letra y botones grandes.
- **El contenido es un borrador.** Ejercicios, ilustraciones, pesos de riesgo y umbrales de
  dolor los redactó Claude, no un profesional. Nunca los describas como validados ni quites
  el aviso de borrador mientras `content_review` diga `DRAFT`.
- **Jugador anónimo.** Token en el móvil, sin nombre ni email; del token solo se guarda el
  hash. El dolor es dato de salud (RGPD): no se envía a servicios externos.
- Las rutinas duran entre 8 y 12 minutos y cada zona tiene su programa de 4 semanas. Hay
  tests que lo vigilan (`ContentCatalogTest`).

## Mapa

```
backend/src/main/java/com/prepadel/
  content/   catálogo de solo lectura             GET /api/content
  player/    cuestionario, token, estado          POST /api/players, GET|DELETE /api/me,
             (PlayerController tiene toda la API)  POST /api/me/{enrollment,completions,pain}
  risk/      RiskProfileService: pesos del perfil de riesgo
  pain/      PainRules, PainAlertService; umbrales prepadel.pain.* en application.properties
  progress/  programa activo y rutinas completadas
             RegistrationRateLimiter: tope de altas por IP y hora (prepadel.rate-limit.*)
  web/       en producción sirve la web construida junto a la API;
             SecurityHeadersFilter: cabeceras de seguridad y CSP (si la web carga algo de
             otro dominio, hay que añadirlo ahí)
backend/src/main/resources/db/migration/   V1 esquema, V2 contenido inicial

frontend/src/
  App.tsx         rutas: / , /programas[/:slug], /dolor, /perfil[/ejercicios], /rutina/:slug, /bienvenida
  lib/            api, store (estado + cola offline), sync, player (reproductor puro),
                  voice, reminder, derive, types, copy (textos), zones
  screens/        una pantalla por ruta
  components/     Mascot, Icons, PainScale, Ring, TabBar, ExerciseSheet, Bits
  illustrations/  catalog.ts (posturas por slug de ejercicio), engine.ts (animación),
                  DevSheet en /dev/ilustraciones (solo en desarrollo)
  styles.css      todos los estilos
```

Despliegue: `Dockerfile`, `docker-compose.yml` (puerto 8090), `docs/despliegue.md`.
CI: `.github/workflows/ci.yml`.

## Para gastar poco contexto

- Archivos grandes: búscalos con Grep y lee solo el tramo que necesites. Nunca enteros:
  `V2__seed_content.sql`, `styles.css`, `illustrations/engine.ts`, `illustrations/catalog.ts`,
  `RoutineScreen.tsx`, `Onboarding.tsx`. `package-lock.json` no se lee.
- Lee `README.md` y `docs/` solo si la tarea trata de lo que cuentan (arranque para humanos,
  despliegue, camino al móvil).
- Pasa solo los tests de lo que has tocado. La batería completa y `npm run build`, una vez al
  final. Docker solo si cambia el despliegue.
- No uses subagentes para explorar: el mapa de arriba ya dice dónde está cada cosa.
- Una sesión por tarea. Al cambiar de tema, sesión nueva.
- Si cambias la estructura, la API o el alcance, actualiza este archivo en el mismo cambio y
  mantenlo corto.

## Comandos

```bash
cd backend && ./mvnw -B -ntp test                    # todo el backend
cd backend && ./mvnw -B -ntp test -Dtest=NombreTest  # una clase
cd frontend && npx vitest run src/lib/sync.test.ts   # un archivo
cd frontend && npm test                              # todo el frontend
cd frontend && npm run build                         # tipos + build de producción
```

Servidores de desarrollo: `preview_start` con `backend` (8080) o `frontend` (5173), definidos
en `.claude/launch.json`. Javier prueba la app con su propio jugador: no borres `backend/data/`
ni sus datos al comprobar algo.
