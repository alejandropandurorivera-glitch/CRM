# Darkisistema V30

Actualización del CRM estático para publicar en el repositorio CRM y utilizar con el proyecto Firebase existente darkis-brownies. No es la aplicación documental SGC en Python.

## Instalación

1. Publica el contenido completo de `firestore.rules` en Firebase → Firestore Database → Reglas → Publicar.
2. Extrae este ZIP y sube todos sus archivos a la raíz del repositorio CRM, reemplazando los existentes. No subas el ZIP como un archivo de la página. Son menos de 100 archivos.
3. Espera a que termine GitHub Pages y vuelve a abrir la app. En Avisos debe aparecer V30. No borres datos del navegador: las capturas pendientes y los turnos abiertos se conservan con sus mismas claves.
4. Abre Administrador y Repartidor con Google y espera la conexión. La corrección de precios de ventas desde el 2 de noviembre se ejecuta al recibir datos del servidor; utiliza transacciones, mismos identificadores y conserva los importes originales en el historial de migración. Las reglas nuevas son necesarias.

Esta entrega no publica cambios automáticamente ni modifica directamente tus datos de Firebase.

## Precios e ingresos

Desde **2026-11-02**, calendario de México:

| Producto | Público | Para Darkis |
| --- | ---: | ---: |
| Brownie estándar | $25 | $21 |
| Mini brownie | $15 | $12 |

FT / Farmacia Tepa conserva el precio y el esquema anterior. Las galletas y productos especiales conservan sus precios. Antes de esa fecha se mantiene el histórico. Un precio manual explícito se conserva; los nuevos acuerdos llevan fecha de vigencia.

- **Repartidor → editar cliente → Precios:** acuerdo por cliente y fecha. En la visita también puedes modificar el precio sólo para esa venta.
- **Administrador → Catálogos → Precios por cliente:** buscador, modificación e historial. Puedes ajustar por separado el precio público y el aporte para Darkis.
- En **Ingresos** se usa el aporte para Darkis; Rutas recibidas conserva la referencia de lo cobrado al público.
- Las ventas personales realizadas con piezas ya retiradas se muestran para consulta. No vuelven a sumarse como ingreso financiero, porque el aporte se cobra mediante el descuento de nómina. Una venta directa desde fábrica sí genera su aporte en Ingresos.

## Mini brownies, producción e inventario

Se agregan cinco sabores mini al final del catálogo, conservando los siete índices antiguos. Los saldos de siete productos se amplían con ceros al primer movimiento, sin reiniciar existencias.

Cada charola nueva contiene 20 brownies completos. En **Darkita → Producción del día → Mini brownies empacados**, registra los minis por sabor: **2 minis consumen 1 completo** del mismo sabor. Si ya registraste la hornada, deja charolas en cero al empacar después. El sistema conserva las revisiones por fuente para no sumar la producción dos veces.

Materia prima del mini: 0.5 de la pieza clásica. Tiempo de empaque: 2 veces el clásico. No se supone que el costo total del mini sea la mitad: el catálogo conserva factores separados; un costo total debe configurarse si no se conocen sus componentes.

Los minis también se incluyen en fábrica, caja, mermas, seminario, basura y consumo para galletas. Administrador → Producción muestra los minis empacados por sabor. Las mermas siguen exigiendo motivo.

Los nuevos retiros personales desde el 2 de noviembre se descuentan a $21 por clásico y $12 por mini; las galletas conservan $19. Los retiros anteriores conservan sus $19. Cada retiro guarda su precio original, que también se usa para las devoluciones por sabor. En devoluciones sin retiro vinculado se puede indicar $19 o $21 como precio original del clásico; mini $12. Registra sólo devoluciones efectivas.

## Sammy, horas y saldo

Sammy aparece en Darkita con la foto proporcionada. Samantha y Sam se reconocen como el mismo nombre; un perfil local existente conserva su identificador y PIN. Un perfil nuevo tiene PIN inicial **1234**, modificable en ajustes.

No se inventó ninguna hora ni cantidad adeudada.

- Sammy puede agregar sus horarios manualmente, como las demás personas.
- **Administrador → Horas y pagos → Registrar horas anteriores sin pagar:** elige Sammy y captura cada entrada y salida real. Primero abre/sincroniza su perfil Darkita para que aparezca en el selector.
- **Darkita → Horas y pagos → Generar reporte:** selecciona los turnos pendientes y descarga la imagen. Se distingue saldo de reportes pendientes y horas aún sin reportar.
- **Liquidar** está disponible tanto en Darkita (recibí el pago) como en Administrador. La transacción registra un solo pago, aplica horas, descuentos y devoluciones, y genera un solo gasto de sueldo.
- La liquidación desde Darkita admite hasta 8 conceptos combinados (turnos + descuentos + devoluciones), por los límites de validación de Firestore. Administrador puede liquidar el reporte completo de hasta 20 turnos. La interfaz explica cuándo debe hacerlo administrador.

## Ventas y clientes desde Darkita

**Darkita → Mis ventas y clientes** reemplaza el acceso operativo a Darkisocio. Incluye buscador, lista de todos los clientes, Mis clientes, alta de cliente, venta anónima y selección del origen de las piezas.

Selecciona **Mis piezas retiradas** si ya salieron de fábrica con un retiro de nómina: no se descuenta inventario otra vez. Si eliges **En fábrica**, la venta descuenta los productos vendidos una sola vez.

**Repartidor → Venta especial → Atender** permite elegir cualquier cliente, crear uno, asignarlo a una Darkita o registrar una venta anónima. Los clientes personales y ocasionales quedan fuera de la agenda automática y no se pausan por antigüedad. Los históricos de Darkisocio se conservan para consulta.

## Verificación

Se probaron modelos de precios/vigencias/FT, producción y conversión a minis, inventario legado, nómina y liquidación concurrente, reportes de imagen y clientes especiales. Las reglas se compilaron y probaron contra el emulador Firestore, incluyendo retiros mixtos $21/$12, devoluciones al precio original, permisos y rechazo de pagos duplicados. Se comprobó la interfaz móvil con Chromium sin escribir datos reales.
