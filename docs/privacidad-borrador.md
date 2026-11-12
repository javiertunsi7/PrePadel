# Política de privacidad de PrePádel · BORRADOR

> **Borrador sin validar.** Lo ha redactado Claude a partir de lo que hace el código, no un
> abogado ni un delegado de protección de datos. No se publica hasta que lo revise un
> profesional. Lo que va entre corchetes está por decidir o rellenar.

Última actualización: [fecha de publicación]

## Quién es el responsable

[Nombre y apellidos o razón social], NIF [número], [dirección postal].
Contacto para privacidad: [email].

## Qué datos tratamos

PrePádel funciona sin cuenta: no pedimos nombre, email ni teléfono. Al terminar el cuestionario
inicial, tu móvil guarda una clave aleatoria que te identifica. En el servidor solo queda una
huella de esa clave, con la que no se puede reconstruir.

| Dato | Para qué |
|---|---|
| Edad, horas de juego a la semana y nivel | Calcular tu perfil de riesgo por zona |
| Molestias y dolor de 0 a 10 en codo, hombro y rodilla, con su fecha (**dato de salud**) | Perfil de riesgo, evolución y aviso de "para y consulta" |
| Programa que sigues y rutinas que terminas, con su fecha | Llevar tu progreso |
| Rutinas que dejas a medias con el botón "Salir" y en qué ejercicio | Saber qué ejercicios hay que mejorar |
| Fecha y versión del consentimiento que aceptaste | Poder demostrar que lo diste |
| Hora de tu próximo partido y la dirección de notificaciones de tu móvil, solo si aceptas los avisos | Avisarte 30 minutos antes aunque tengas la app cerrada |

En tu móvil, y solo ahí, se guarda además si quieres la voz activada.

**Avisos del partido.** Si das permiso de notificaciones, tu navegador crea una dirección de
avisos para tu móvil y la app la envía al servidor junto con la hora del partido. Cuando
llega la hora, el servidor manda el aviso al servicio de notificaciones de tu navegador
(Google si usas Chrome o Android, Apple si usas iPhone, Mozilla si usas Firefox), que lo
entrega en tu móvil. El aviso va cifrado: ese servicio no puede leer el texto, que además no
lleva ningún dato tuyo ni de dolor. La hora del partido y la dirección se borran del servidor
24 horas después del partido, al quitar el partido en la app o al borrar tu cuenta. Si
marcas que juegas todas las semanas, se guardan también la zona horaria de tu móvil (para
mantener la hora al cambiar el horario de verano) y se conservan hasta que dejes de pedir el
aviso o borres tu cuenta.

Tu dirección IP se usa unos instantes para evitar abusos (un máximo de altas por conexión y
hora). Se mantiene en la memoria del servidor como mucho una hora y no se guarda en la base de
datos. [El proveedor de alojamiento puede anotarla en sus registros técnicos durante X días.]

No usamos cookies, publicidad ni herramientas de analítica de terceros. Las estadísticas de uso
son totales calculados en nuestro propio servidor; no permiten identificarte.

## Con qué base legal

- **Datos de salud (dolor y molestias):** tu consentimiento explícito, que das al final del
  cuestionario (art. 9.2.a del RGPD). Sin él no se crea tu plan.
- **Resto de datos de tu plan:** son necesarios para prestarte el servicio que pides
  (art. 6.1.b). [Confirmar con el revisor si se prefiere el consentimiento, art. 6.1.a.]
- **Seguridad y estadísticas agregadas:** nuestro interés legítimo en proteger el servicio y
  mejorarlo (art. 6.1.f).

## Con quién se comparten

Con nadie, salvo:

- El proveedor que aloja el servidor y la base de datos, que actúa como encargado del
  tratamiento: [proveedor], con servidores en [país de la UE]. [Confirmar al elegir proveedor.]
- Si aceptas los avisos del partido, el servicio de notificaciones de tu navegador (Google,
  Apple o Mozilla) recibe la dirección de avisos de tu móvil y un mensaje cifrado a la hora
  del aviso. Estos servicios pueden estar fuera del Espacio Económico Europeo.
  [Revisar con el abogado la base de la transferencia y cómo describirlo.]

Tus datos de dolor no se envían a ningún otro servicio.

## Cuánto tiempo se guardan

Hasta que borres tu cuenta. [Decidir un plazo de borrado por inactividad, por ejemplo 24 meses
sin abrir la app. Hoy no está implementado.]

## Tus derechos

- **Borrar todo y retirar el consentimiento:** en la app, Perfil → borrar mis datos. Se elimina
  al momento del servidor y de tu móvil, sin pasos intermedios.
- **Acceso y portabilidad:** la app te muestra tu perfil, tu historial de dolor y tu
  progreso, y en Perfil → Descargar mis datos te llevas una copia de todo lo que guardamos de
  ti en un fichero JSON.
- **Rectificación, oposición y limitación:** escribe a [email].

Como no sabemos quién eres, no podemos localizar tus datos a partir de tu nombre o tu email
(art. 11 del RGPD). Por eso los derechos se ejercen desde la propia app, que es la que guarda tu
clave. Si cambias de móvil o borras los datos del navegador sin haber borrado la cuenta, no
podremos recuperarla ni identificarla. [Cambiará cuando exista la cuenta recuperable por email:
habrá que añadir el email a esta política.]

También puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).

## Menores

PrePádel está pensada para adultos. [Fijar la edad mínima; en España el consentimiento propio
vale a partir de los 14 años. Hoy el cuestionario no la comprueba.]

## Seguridad

La conexión va cifrada (HTTPS), de tu clave solo guardamos una huella y el acceso a la base de
datos está restringido. [Añadir el cifrado en reposo cuando se contrate el alojamiento.]

## Aviso sobre el contenido

PrePádel no es un producto sanitario ni sustituye a un profesional. [Enlazar al aviso legal.]

---

## Pendiente antes de publicar (no forma parte de la política)

1. Revisión por un abogado o delegado de protección de datos.
2. Rellenar responsable, contacto y proveedor de alojamiento.
3. Valorar si hace falta una evaluación de impacto (EIPD) por tratar datos de salud.
4. Enlazar esta política desde el cuestionario, junto a la casilla de consentimiento, y desde
   Perfil. Hoy la app no la enlaza.
5. Revisar si el texto de consentimiento de la app debe mencionar el registro de rutinas
   abandonadas. Si cambia, hay que subir la versión del consentimiento en `PlayerService`.
6. Decidir el plazo de borrado por inactividad y la edad mínima.
7. Firmar el contrato de encargado con el alojamiento y activar el cifrado en reposo.
