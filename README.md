# PrePádel

Preparación física y prevención de lesiones para jugadores amateur de pádel (35 a 55 años):
rutinas de 10 minutos para codo, hombro y rodilla.

- **Backend:** Java 25 + Spring Boot 4 (`backend/`)
- **Frontend:** React 19 + TypeScript + Vite, instalable en el móvil como PWA (`frontend/`)
- **Tests:** JUnit + MockMvc en el backend, Vitest + Testing Library en el frontend, y
  GitHub Actions para pasarlos en cada cambio
- **Producción:** una imagen Docker con un solo servidor (web + API) y PostgreSQL

## Qué hace el MVP

| Funcionalidad | Estado |
| --- | --- |
| Cuestionario inicial (edad, horas, nivel, molestias) y perfil de riesgo por zona | Hecho |
| Rutina del día: calentamiento prepartido y recuperación, con temporizador y voz | Hecho. Cada ejercicio lleva una ilustración animada; los vídeos aún no existen (el campo `video_url` está preparado) |
| Programas de 4 semanas por zona con progresión de carga | Hecho: codo, hombro y rodilla |
| Registro de dolor en un toque (0 a 10) y aviso de "para y consulta" | Hecho |
| Recordatorio 30 minutos antes del partido | Parcial: solo llega con la app abierta (ver [guía móvil](docs/movil-y-siguientes-pasos.md)) |

Las tres decisiones de arquitectura del documento de producto están aplicadas:

1. **Rutinas como datos.** Ejercicios, duraciones y progresiones viven en tablas
   (`backend/src/main/resources/db/migration`), no en código.
2. **Offline first.** La app guarda en el móvil el catálogo y el estado del jugador; lo que
   se hace sin cobertura queda en cola y se envía solo al recuperarla (`frontend/src/lib/store.tsx`).
3. **Manos libres.** Voz que anuncia cada ejercicio, pitidos en los últimos segundos, cuenta
   atrás gigante y pantalla siempre encendida (`frontend/src/screens/RoutineScreen.tsx`).

> **Importante:** los ejercicios son un borrador. Deben ser revisados y firmados por un
> fisioterapeuta antes de publicar la app. Mientras la tabla `content_review` diga `DRAFT`,
> la propia app lo avisa en Perfil.

## Arrancar en local

Necesitas Java 25 y Node 24. Dos terminales:

```bash
cd backend
./mvnw spring-boot:run        # en PowerShell o cmd: .\mvnw.cmd spring-boot:run
```

```bash
cd frontend
npm install
npm run dev
```

Abre <http://localhost:5173>. El frontend redirige `/api` al backend (puerto 8080).
Los datos se guardan en `backend/data/` (base de datos H2 en fichero, fuera de git);
bórrala para empezar de cero.

## Como en producción

Con Docker Desktop abierto, esto construye la imagen real y la arranca con su PostgreSQL:

```bash
docker compose up --build
```

Abre <http://localhost:8090>. En producción el mismo servidor sirve la web y la API, la base
de datos es PostgreSQL y se configura con tres variables de entorno. La guía completa, con
los pasos en el alojamiento, está en [docs/despliegue.md](docs/despliegue.md).

## Tests

```bash
cd backend && ./mvnw test      # 40 tests: riesgo, avisos de dolor, contenido, API completa y servidor web
cd frontend && npm test        # 256 tests: reproductor, sincronización offline, ilustraciones y pantallas
cd frontend && npm run build   # comprobación de tipos + build de producción (PWA)
```

GitHub pasa todo esto en cada cambio a `main` y en cada pull request
([.github/workflows/ci.yml](.github/workflows/ci.yml)), repite los tests del backend contra
PostgreSQL y construye la imagen Docker.

Dos tests de contenido vigilan las reglas del producto cuando alguien edite las rutinas:
todas duran entre 8 y 12 minutos y cada zona tiene su programa de 4 semanas.

## Estructura

```
backend/src/main/java/com/prepadel/
  content/    zonas, ejercicios, rutinas y programas (solo lectura)   GET /api/content
  player/     cuestionario, token del móvil y estado del jugador      /api/players, /api/me
  risk/       perfil de riesgo orientativo
  pain/       registro de dolor y regla de "para y consulta"
  progress/   programa activo y rutinas completadas
  web/        en producción, sirve la web ya construida junto a la API
backend/src/main/resources/db/migration/
  V1__schema.sql          tablas
  V2__seed_content.sql    contenido inicial (borrador)

frontend/src/
  lib/            api, store offline (cola de envíos), reproductor, voz, recordatorio
  screens/        Onboarding, Home, RoutineScreen, Programs, ProgramDetail, Pain, Profile, Exercises
  components/     mascota, iconos, escala de dolor, anillo de cuenta atrás, ficha de ejercicio
  illustrations/  figura articulada que dibuja y anima cada ejercicio
```

## Ilustraciones de los ejercicios

Cada ejercicio se enseña con una figura esquemática animada: en el reproductor, en la lista
de cada rutina (miniatura), en la ficha "cómo se hace" y en la galería (Perfil → Ver todos
los ejercicios). No son imágenes: cada ejercicio se describe con unas pocas posturas clave en
[frontend/src/illustrations/catalog.ts](frontend/src/illustrations/catalog.ts) y el motor
([engine.ts](frontend/src/illustrations/engine.ts)) calcula el movimiento. Pesan poco y
funcionan sin cobertura.

- Están dibujadas a partir del texto de cada ejercicio y, como el resto del contenido, las
  tiene que revisar el fisioterapeuta.
- Cuando un ejercicio tenga `video_url`, la app enseña el vídeo en lugar del dibujo.
- Para añadir o corregir una: edita sus posturas en `catalog.ts` y míralas en
  <http://localhost:5173/dev/ilustraciones> (solo existe en desarrollo; admite `?animadas`,
  `?grande` y `?solo=texto`).
- Un test comprueba que todos los ejercicios del backend tienen ilustración, que ninguna se
  sale del lienzo y que el movimiento no da saltos.

## API

| Método y ruta | Qué hace |
| --- | --- |
| `GET /api/content` | Catálogo completo: zonas, rutinas con sus pasos, programas y regla de dolor |
| `POST /api/players` | Cuestionario inicial. Devuelve el token (una sola vez) y el estado del jugador |
| `GET /api/me` | Estado del jugador: perfil, riesgo, programa activo, rutinas hechas, dolor y avisos |
| `POST /api/me/enrollment` | Empezar un programa |
| `POST /api/me/completions` | Rutina terminada |
| `POST /api/me/pain` | Registro de dolor |
| `DELETE /api/me` | Borra al jugador y todos sus datos |

Todo lo que cuelga de `/api/me` lleva `Authorization: Bearer <token>`. El jugador es anónimo:
no se guarda nombre ni email, y del token solo se almacena el hash.

## Cambiar el contenido

Añade una migración nueva (`V3__lo_que_cambia.sql`) con los `insert` o `update`. No edites
`V1` ni `V2` una vez desplegadas: Flyway comprueba que no cambien. Los umbrales de la regla
de dolor están en `backend/src/main/resources/application.properties` (`prepadel.pain.*`).

## Si tu usuario de Windows tiene ñ o tildes

Java falla al abrir sockets cuando la carpeta de usuario tiene caracteres no ASCII
(`Unable to establish loopback connection`). El backend ya lo esquiva al arrancar
(`PrepadelApplication`). Si te pasa con otras herramientas Java, define la variable de
entorno `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\Windows\Temp`.

## Siguientes pasos

Qué falta para publicar, cómo llevarla a las tiendas de iOS y Android y en qué orden:
[docs/movil-y-siguientes-pasos.md](docs/movil-y-siguientes-pasos.md).
