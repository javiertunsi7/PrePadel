# Desplegar PrePádel

## Qué se despliega

Dos piezas:

- **Una imagen Docker** ([Dockerfile](../Dockerfile)) con un único servidor que sirve la web
  y la API. No hay que alojar el frontend aparte.
- **Una base de datos PostgreSQL**, mejor gestionada por el propio alojamiento (copias de
  seguridad incluidas).

La imagen se configura con tres variables de entorno. Si falta alguna, la app no arranca:

| Variable | Ejemplo |
| --- | --- |
| `DATABASE_JDBC_URL` | `jdbc:postgresql://servidor:5432/prepadel` |
| `DATABASE_USER` | `prepadel` |
| `DATABASE_PASSWORD` | la que dé el alojamiento |
| `PREPADEL_ADMIN_PASSWORD` | opcional: contraseña larga y aleatoria para el panel de retención (`/api/admin/panel`; el usuario da igual). Sin ella el panel no existe |
| `PREPADEL_REVIEW_PASSWORD` | opcional: contraseña para la pantalla `/revision`, donde el fisio aprueba el contenido. Distinta de la del panel: es la que le das a él. Sin ella la revisión no existe |
| `PREPADEL_PUSH_PUBLIC_KEY`, `PREPADEL_PUSH_PRIVATE_KEY` | opcionales: claves del aviso del partido con la app cerrada. Se generan **una sola vez** con `cd backend && ./mvnw -q compile && java -cp target/classes com.prepadel.reminder.VapidKeyGenerator`. No se cambian después: cambiarlas deja sin aviso a quien ya se suscribió. La privada es secreta |
| `PREPADEL_PUSH_SUBJECT` | con las dos anteriores: tu contacto, `mailto:tu-correo` o `https://tu-dominio`. Lo ven Google, Apple y Mozilla si hay un problema con los envíos |

Muchos alojamientos dan la conexión en una sola dirección del tipo
`postgres://usuario:clave@servidor:5432/base`. Hay que partirla: la dirección pasa a ser
`jdbc:postgresql://servidor:5432/base`, y el usuario y la clave van en sus variables.

Otros datos que suele pedir el alojamiento:

- **Puerto:** 8080. Si el alojamiento define la variable `PORT`, la app la respeta.
- **Comprobación de salud:** `GET /actuator/health`. Responde `{"status":"UP"}` cuando la app
  y su base de datos funcionan.
- **Memoria:** probada con un límite de 512 MB: arranca en unos 12 segundos y ocupa unos
  270 MB. Sin límite sube hasta unos 500 MB. No está probada con muchos jugadores a la vez.

## Probarlo en tu equipo igual que en producción

Con Docker Desktop abierto:

```bash
docker compose up --build
```

Abre <http://localhost:8090>. Es la imagen real con un PostgreSQL propio; no toca el backend
de desarrollo ni sus datos. La primera vez tarda unos minutos en construirse.

Para pararla y borrar esa base de datos de prueba:

```bash
docker compose down --volumes
```

## Pasos en el alojamiento

Sirve cualquiera que construya una imagen desde un `Dockerfile` y ofrezca PostgreSQL.
Elige una región de la Unión Europea: el registro de dolor es un dato de salud.

1. Crea la base de datos PostgreSQL y apunta servidor, puerto, nombre, usuario y contraseña.
2. Crea el servicio web a partir de este repositorio de GitHub (el `Dockerfile` está en la raíz).
3. Define las tres variables de entorno de la tabla.
4. Indica `/actuator/health` como comprobación de salud.
5. Asigna el dominio. El HTTPS lo pone el alojamiento; la app instalable (PWA) no funciona sin él.
6. Comprueba que `https://tu-dominio/actuator/health` responde `UP` y abre la web.

La primera vez que arranca, la app crea sola las tablas y carga los ejercicios. En cada
actualización aplica las migraciones nuevas antes de atender peticiones.

## Actualizar

Cada cambio en `main` pasa por los tests automáticos de GitHub
([.github/workflows/ci.yml](../.github/workflows/ci.yml)): backend con H2 y con PostgreSQL,
frontend, y construcción de la imagen. Si el alojamiento está conectado al repositorio,
redespliega solo; conviene configurarlo para que espere a que esos tests pasen.

## Sin Docker

También se puede generar un único jar y ejecutarlo donde haya Java 25:

```bash
cd frontend && npm ci && npm run build
cd ../backend && ./mvnw -Pweb package
java -jar target/prepadel-backend-0.1.0-SNAPSHOT.jar --spring.profiles.active=prod
```

Las tres variables de entorno hacen falta igual.

## Antes de dar el enlace a los clubes

- [ ] Copias de seguridad de la base de datos activadas en el alojamiento.
- [ ] Política de privacidad publicada: se guardan datos de salud.
- [ ] Probado en un Android y un iPhone: instalar la app, hacer una rutina con voz y
      repetirla en modo avión.
- [ ] Decidido cómo se presenta el piloto mientras el contenido siga en borrador (la app ya
      lo avisa en Perfil y en la galería de ejercicios).

Sigue pendiente, y conviene antes de abrirla a más gente: un límite de altas por minuto en
`POST /api/players` y la cuenta recuperable. Está en
[movil-y-siguientes-pasos.md](movil-y-siguientes-pasos.md).
