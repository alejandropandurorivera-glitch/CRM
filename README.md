# Sistema Darkis v17 — Firebase Spark

Consulta **ACTUALIZACION-V17.txt** para GPS, horarios manuales, PDF con membrete y recuperación de accesos antiguos.

La entrada sigue siendo **index.html**. Esta versión reemplaza el acceso de nube que dependía de Functions por Google y permisos de Firestore. No necesita activar Blaze; se sujeta a las cuotas del plan Spark.

| Área | Archivo | Uso |
| --- | --- | --- |
| Darkita | reloj-checador.html | PIN individual, GPS, horas y reporte PDF; conserva su sesión anónima |
| Repartidor | index.html | PIN 2024, clientes, visitas, ventas, cambios y vencimientos |
| Darkisocio | darkisocio.html | Enlace en la pantalla del PIN de Repartidor, antes de entrar; datos propios de Tania, Sofi y Juan Pablo |
| Administrador | administrador.html | PIN 1016, finanzas, reportes, cortes y autorización de cuentas Google |

## Primer uso con Firebase

Publica las reglas **nuevas** de `firestore.rules`. Abre la app desde una dirección HTTPS autorizada en Firebase. En Administrador, conecta tu cuenta Google, copia el UID que aparece y crea una sola vez su permiso `accessRoles/{UID}` en la consola, con `role: admin`, `profileId: ""` y `enabled: true`. Sigue [FIREBASE.md](FIREBASE.md) para los pasos exactos y tipos de campo.

Después, las otras personas conectan Google y solicitan acceso. Desde el engrane → **Cuenta Google y permisos → Administrar accesos**, les asignas Repartidor o su perfil Darkisocio. Google queda recordado en el dispositivo; el PIN sigue abriendo la interfaz. El PIN por sí solo no autoriza datos en Firestore. No se abre ninguna cuenta ni se concede el rol administrador automáticamente.

## Datos

Se conservan las claves de almacenamiento de versiones anteriores. El administrador incluye **1,357 ventas, 166 gastos y 75 cortes históricos**, además de movimientos de caja, tickets y catálogos. Los registros nuevos se combinan por ID sin duplicar el histórico. El respaldo original separado permite restaurarlo.

Las ventas nuevas de Repartidor y Darkisocio llegan al administrador cuando las cuentas están autorizadas y conectadas. Los movimientos financieros capturados directamente en Administrador permanecen en ese navegador: descarga respaldos JSON periódicos. Para un sabor vendido desconocido en una visita de ruta se usa «Brownie sin especificar», sin inventarlo a partir del surtido dejado.

El archivo `administrador.html` contiene el histórico financiero completo por petición del propietario. **No lo publiques en un sitio o repositorio abierto** si necesitas privacidad: Google protege Firestore, pero no el contenido del HTML. Hace falta migrar ese histórico a Firestore y retirar su copia pública antes de un despliegue público protegido.

## Instalación, imágenes y avisos

- Logo transparente completo e ilustraciones de los tres accesos; gatos entregados por el usuario como avatares.
- Foquito verde cuando Firestore responde, amarillo al conectar y rojo si sólo hay datos locales.
- Ventana de instalación hasta tres veces **por dispositivo**. Spark no usa el contador por IP de la versión anterior.
- Ajustes de avisos: todos, uno diario, sólo ventana o apagados, con botones de validar permiso y probar.
- Se revisan alertas de caducidad y visitas de ruta, turnos abiertos de más de ocho horas en Darkita y cortes de ruta después de las 22:00 en Administrador, mientras la app esté abierta.
- Para notificaciones nuevas con la app cerrada todavía se necesita configurar un servicio de envío push.
- La PWA almacena las pantallas y sus imágenes para uso offline. Los cambios quedan pendientes hasta comprobar los permisos y sincronizar; no es necesario repetir Google si la sesión del navegador sigue guardada.
