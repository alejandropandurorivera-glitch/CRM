# Sistema Darkis v11

Aplicación móvil unificada enfocada por ahora en dos áreas operativas:

- **Darkita:** reloj checador, horas semanales, GPS y reporte PDF.
- **Repartidor:** clientes, rutas, visitas, ventas, cambios, vencimientos y pendientes.
- **Administrador:** reservado y desactivado en esta versión.

## Publicación

Sube todos los archivos juntos a la raíz de GitHub Pages o Firebase Hosting. La entrada principal es `index.html` y el reloj es `reloj-checador.html`.

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
- PIN inicial: `1234`.
