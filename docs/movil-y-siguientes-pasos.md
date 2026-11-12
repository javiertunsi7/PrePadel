# Guía: llevar PrePádel al móvil y qué falta para publicarla

## 1. De web a móvil en tres escalones

### Escalón 1 · PWA instalable (ya está)

El frontend ya es una PWA: tiene manifiesto, iconos y un service worker que guarda la
aplicación en el móvil. En cuanto esté publicada en un dominio con HTTPS:

- **Android (Chrome):** menú → "Añadir a pantalla de inicio".
- **iPhone (Safari):** Compartir → "Añadir a pantalla de inicio".

Se abre a pantalla completa, con su icono, y funciona sin cobertura después de la primera
visita. Es la forma más barata de repartirla en dos o tres clubes y medir si vuelven, que es
la validación que pide el documento de producto.

Límites de la PWA que conviene conocer:

- El recordatorio del partido con la app cerrada lo manda el servidor por Web Push (claves
  `PREPADEL_PUSH_*`, ver [despliegue.md](despliegue.md)). Sin esas claves, solo avisa con la
  app abierta. En Android funciona en Chrome; en iPhone solo si la app está instalada en la
  pantalla de inicio (iOS 16.4 o posterior). Falta probarlo en un móvil real.
- La voz depende de las voces que traiga cada móvil. Hay que probarla en móviles reales,
  sobre todo en iPhone.
- No aparece en App Store ni Google Play.

### Escalón 2 · Tiendas con Capacitor (mismo código React)

[Capacitor](https://capacitorjs.com) envuelve la web en una app nativa. No hay que
reescribir nada: se reutiliza `frontend/` tal cual.

```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init PrePadel com.prepadel.app --web-dir dist
npm run build
npx cap add android
npx cap sync
npx cap open android     # abre Android Studio para probar y generar el instalable
```

Cambios que hay que hacer en ese momento:

| Qué | Por qué | Cómo |
| --- | --- | --- |
| URL de la API | En la app nativa no hay proxy de Vite | Variable `VITE_API_URL` con la URL pública del backend (ya la lee `src/lib/api.ts`) |
| CORS en el backend | La app llama desde otro origen | Permitir `https://localhost` (Android) y `capacitor://localhost` (iOS) |
| Recordatorio fiable | Que avise con la app cerrada | Plugin `@capacitor/local-notifications`; la hora ya la calcula `src/lib/reminder.ts` |
| Voz | El WebView de Android no siempre trae síntesis de voz | Plugin `@capacitor-community/text-to-speech` detrás de `src/lib/voice.ts` |
| Token del jugador | Mejor que `localStorage` | Almacenamiento seguro del sistema (plugin de secure storage) |

Costes y requisitos: Google Play cobra 25 USD una vez; Apple, 99 USD al año, y para compilar
la versión de iOS hace falta un Mac con Xcode. Empieza por Android.

### Escalón 3 · React Native o Flutter

Solo si algún día hace falta algo que el WebView no dé bien (análisis de vídeo, integración
profunda con relojes). Ambas cosas están fuera del MVP, así que no es una decisión de ahora.
El backend no cambiaría: la API ya está separada.

## 2. Qué falta para publicar, por orden

1. **Contenido validado.** Un fisioterapeuta revisa ejercicios, dosis, ilustraciones y los
   umbrales de la regla de dolor (`prepadel.pain.*`) y de riesgo (`RiskProfileService`).
   La galería de la app (Perfil → Ver todos los ejercicios) le enseña cada ejercicio con su
   dibujo y su texto. Después se rellena la tabla `content_review` con su nombre y la app lo
   muestra. Sin esto no se publica.
2. **Vídeos.** Hoy cada ejercicio se enseña con una ilustración esquemática animada, que
   sirve para lanzar la validación con clubes. Los vídeos con el fisio siguen siendo lo que
   da credibilidad: se graban, se suben a Cloudflare Stream o Mux y basta con rellenar
   `exercise.video_url` para que sustituyan al dibujo en el reproductor y en la ficha.
3. **Producción.** La parte técnica está lista: imagen Docker con un solo servidor (web y
   API), PostgreSQL probado con las mismas migraciones y tests automáticos en GitHub. Falta
   lo que depende de una cuenta tuya: elegir alojamiento en la UE, crear la base de datos,
   poner el dominio y activar las copias de seguridad. Los pasos están en
   [despliegue.md](despliegue.md).
4. **Cuenta recuperable.** El jugador se identifica con un token guardado en su móvil. Si
   cambia de móvil o borra los datos del navegador, pierde su historial. Antes de cobrar hay
   que ofrecer "guarda tu cuenta" con email (enlace mágico), sin obligar a registrarse al
   principio.
5. **RGPD.** El dolor es dato de salud. Ya hay consentimiento explícito, datos sin nombre ni
   email y borrado completo desde Perfil. Hay borradores de la política de privacidad
   ([privacidad-borrador.md](privacidad-borrador.md)) y del registro de actividades
   ([registro-actividades-borrador.md](registro-actividades-borrador.md)), sin revisar por un
   profesional; la lista de lo que falta está al final del primero. Sigue pendiente: esa
   revisión, enlazar la política desde la app, cifrado de la base de datos en reposo y
   contrato de encargado con el proveedor de alojamiento.
6. **Protección de la API (hecho).** `POST /api/players` admite 20 jugadores nuevos por
   conexión y hora (`prepadel.rate-limit.registrations-per-hour`) y después responde 429.
   Todas las respuestas llevan cabeceras de seguridad, entre ellas una política de contenido
   que solo deja cargar lo que sirve la propia app. La cuenta vive en memoria: si algún día
   hay más de un servidor, habrá que llevarla a la base de datos o al proxy.
7. **Pagos.** El modelo freemium (calentamiento gratis, programas y seguimiento de pago)
   necesita RevenueCat cuando exista la app nativa. Hoy todo está abierto.
8. **Analítica (hecho, sin servicios externos).** Panel propio en `/api/admin/panel`, con la
   contraseña de `PREPADEL_ADMIN_PASSWORD`: jugadores activos, cuántos vuelven en su segunda
   semana y en qué ejercicio se sale de las rutinas. El abandono se anota cuando el jugador
   pulsa "Salir" en mitad de una rutina; cerrar la app sin más no se registra.
9. **Editor de contenido.** Hoy las rutinas se cambian con migraciones SQL. Un panel de
   administración permitiría al fisio editarlas sin tocar código.

## 3. Qué hace potente a esta app

- **El uso diario es la rutina, no la app.** Todo lo demás existe para que el jugador pulse
  "Empezar" antes del partido. Cuida ese camino por encima de cualquier función nueva.
- **Mide antes de construir.** El dato que importa es cuánta gente sigue usándola pasada una
  semana. Si no vuelven con el calentamiento y el programa de codo, más funciones no lo
  arreglan.
- **El contenido es el producto.** La diferencia con un PDF está en los vídeos del fisio, la
  progresión semanal y el registro de dolor que demuestra la mejora.
- **Rápida y sin cobertura.** Hoy el código pesa unos 100 kB comprimido (más unos 70 kB de
  fuentes) y funciona offline. Conviene vigilar que siga así cuando lleguen los vídeos, que
  se cargan aparte y nunca dentro de la app.
- **Letra grande y botones grandes.** El público tiene 35 a 55 años y la usa en la pista, de
  pie y con sol.
