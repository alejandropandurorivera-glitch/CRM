# Sistema Darkis v13 · perfiles e íconos de gatitos

La portada `index.html` contiene enlaces directos: **Darkita** abre `reloj-checador.html` y **Repartidor** abre `repartidor.html`. Los enlaces funcionan sin JavaScript. La interfaz de repartidor incluye los formularios de clientes, visitas e historial que faltaban en el archivo anterior.

Las fichas de **Sofia** y **Tania** muestran sus fotos respectivas, recortadas en círculo, tanto en la selección de usuario como en el encabezado del reloj. El gatito con brownie del logotipo se usa sin el aro ni las letras como ícono de la aplicación y sustituye al gato anterior en la portada, el reloj y los cortes del repartidor.

## Cambios de esta revisión

- La sincronización principal inicia al autenticarse y concilia cambios locales con la última versión conocida de Firebase.
- Los clientes nuevos usan identificadores únicos entre dispositivos.
- Los enlaces de mapas sólo aceptan direcciones HTTPS de Google Maps.
- Los cortes semanales del reloj se recalculan al corregir horarios o cambiar la semana laboral; los cortes antiguos se eliminan de Firebase al sincronizar.
- Los PIN del reloj permanecen en el dispositivo y ya no se envían en las nuevas sincronizaciones. Cambia el PIN inicial de cada empleado antes de usar el reloj.
- Las reglas de Firestore sólo consideran administradora a una cuenta con el custom claim `admin: true`. El tipo de inicio de sesión ya no concede acceso administrativo.

Antes de publicar, despliega `firestore.rules` en el proyecto Firebase. El custom claim `admin: true` debe asignarse desde un entorno confiable con el Admin SDK, nunca desde esta aplicación. Si no hay cuentas administrativas configuradas, nadie podrá leer los registros del reloj de otros dispositivos.

**Límite de seguridad:** esta PWA sigue recibiendo GPS y horarios del navegador. Una aplicación sólo de cliente no puede comprobar de forma confiable la presencia física ni impedir que un usuario manipule esos datos. No uses los registros como única base para pagar sueldos hasta incorporar un servicio de servidor con auditoría y validaciones independientes.

Los documentos de perfiles guardados por versiones anteriores pueden conservar PIN antiguos en Firebase hasta que cada dispositivo sincronice con esta versión. Si necesitas eliminarlos de inmediato, realiza una migración administrativa de esos documentos.

Aplicación móvil unificada enfocada por ahora en dos áreas operativas:

- **Darkita:** reloj checador, horas semanales, GPS y reporte PDF.
- **Repartidor:** clientes, rutas, visitas, ventas, cambios, vencimientos y pendientes.
- **Administrador:** reservado y desactivado en esta versión.

## Publicación

Sube **todos los archivos descomprimidos**, incluidos `cat-icon.png`, `icon-192.png`, `icon-512.png`, `sofia.jpg` y `tania.jpg`, juntos a la raíz de GitHub Pages o Firebase Hosting. La entrada principal es `index.html`. Tras reemplazar una versión anterior, recarga la página para que el service worker actualice su caché.

## PWA

Incluye manifest, iconos y service worker. El aviso de instalación aparece como máximo 3 veces por navegador/dispositivo y deja de mostrarse al instalar. Para limitarlo realmente por IP se necesita una función/endpoint de servidor que registre el contador; el navegador por sí solo no puede garantizar identidad por IP.

## Notificaciones

En Configuración se puede elegir: todo encendido, sólo una al día, sólo ventana dentro del sistema o apagadas. También se puede solicitar permiso y lanzar una alerta de prueba.

La versión frontend puede emitir la alerta de cierre de las 20:30 mientras la PWA está activa: cuenta los clientes creados ese día y no muestra nada cuando el conteo es cero. Para que llegue de forma fiable con la app cerrada se requiere Firebase Cloud Messaging (FCM), una clave VAPID y una Cloud Function/Scheduler a las 20:30 America/Mexico_City. Esa parte no se simula en cliente.

## Reloj checador

- Ubicación autorizada: `20.814514, -102.775042`.
- Radio de entrada: 10 metros.
- Precisión máxima admitida para entrada: 30 metros.
- Sueldo de cálculo del PDF: $50 MXN por hora.
- Sofia y Tania están precargadas con PIN inicial `1234`. Los perfiles existentes del dispositivo se conservan.
