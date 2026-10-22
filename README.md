# Darkisistema v27

Lee **LEEME-v27.txt** antes de publicar. Incluye inventario por sabor de fábrica y carro, traslados, producción, mermas con motivo, historial, retiros Darkita a $19 y otros descuentos, nómina parcial y PDF con logo transparente.

Publica `firestore.rules` y después el contenido de este paquete en la raíz del repositorio CRM. El primer inventario debe ser un conteo real; no se reconstruye con movimientos antiguos. Conserva los datos de los dispositivos.

Entradas: `index.html`, `reloj-checador.html`, `administrador.html`, `darkisocio.html`. Las claves y roles existentes permanecen. El inventario es compartido mediante operaciones atómicas de Firestore; los pendientes offline conservan su área y cuenta de origen. No usa Cloud Functions.

No se ha desplegado automáticamente. La guía completa explica los saldos pendientes de nómina, correcciones, límites y publicación.
