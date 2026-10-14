# Sistema Darkis v12

La entrada es **index.html**. Desde ahí se abre Darkita, Repartidor o Administrador.

| Área | Archivo | Acceso y uso |
| --- | --- | --- |
| Darkita | reloj-checador.html | Perfiles de personal, PIN individual, GPS, horas y PDF semanal |
| Repartidor | index.html | PIN 2024, ruta móvil, clientes, visitas, cambios y vencimientos |
| Darkisocio | darkisocio.html | Enlace pequeño al pie de Repartidor, perfiles Tania, Sofis y Juan Pablo, ventas propias |
| Administrador | administrador.html | PIN 1016, finanzas de escritorio, cortes y rutas recibidas |

Cada perfil Darkisocio guarda sus propios clientes e historial. Sus ventas se suman una vez al administrador y sus reportes; el repartidor conserva el balance entre cobrados, cambios y piezas dejadas. Cuando no se conoce el sabor realmente vendido en una visita de ruta, el administrador usa “Brownie sin especificar” para los cobrados y mantiene los cambios por sabor aparte. No asigna sabores vendidos a partir del surtido dejado.

## Cómo abrirlo

Abre **index.html** desde un servidor HTTPS y usa **Agregar a pantalla de inicio** para instalar la PWA. La primera carga requiere internet; después las pantallas y los cambios locales funcionan sin conexión. Este paquete contiene el histórico financiero completo dentro de `administrador.html`; **no lo publiques en un repositorio o sitio accesible al público** mientras uses el PIN visible en el HTML. Para publicarlo con privacidad real, hay que llevar ese histórico a una base protegida detrás de autenticación del servidor.

## Histórico de finanzas

Las **1,357 ventas, 166 gastos y 75 cortes históricos** están precargados en `administrador.html`; no hace falta importarlos. La primera apertura combina esos registros con cualquier dato administrativo anterior de este navegador mediante sus ID. El archivo **darkis-admin-private-seed.json** se entrega aparte como copia de seguridad y también puede importarse desde **Datos y respaldo** si necesitas restaurarlo. Guarda respaldos periódicos de los movimientos nuevos.

## Sincronización real entre equipos

El uso local y el puente entre pantallas del mismo navegador funcionan desde el primer momento. Para que las ventas y clientes nuevos de Repartidor y Darkisocio lleguen al administrador en otros equipos, despliega la Cloud Function y las reglas siguiendo [FIREBASE.md](FIREBASE.md). Hasta hacerlo, la app muestra modo local y deja las operaciones pendientes. El resto de movimientos financieros capturados directamente en Administrador continúa en el navegador y debe respaldarse en JSON.

Los PIN del HTML controlan la interfaz local. La protección de Firestore entre equipos depende de la función del servidor y sus reglas. Como el histórico está dentro del HTML, esas reglas **no protegen el archivo** si se pone en una web pública.

## Observaciones operativas

- La app del repartidor conserva los clientes existentes guardados en este navegador. No importa automáticamente ventas antiguas al administrador, para evitar duplicados con el histórico previo.
- Los cortes de caja existentes no se recalculan retrospectivamente. Las ventas nuevas entran a los reportes y al corte del día que corresponda.
- El reloj mantiene su almacenamiento y su PDF semanal; en Firebase usa la identidad anónima de cada dispositivo.
- El service worker guarda las tres pantallas y las fotos de perfil para uso offline. La sincronización y el primer inicio con PIN en Firebase necesitan conexión.
