# Firebase Spark — Sistema Darkis v14

Esta versión funciona con Authentication (Google) y Firestore en Spark, dentro de sus cuotas gratuitas. No usa Cloud Functions, Secret Manager ni facturación Blaze. Google comprueba la cuenta; los permisos se leen de documentos protegidos en Firestore. Los PIN 1016 y 2024 abren la interfaz local y no conceden permisos de nube.

## 1. Publicar las reglas nuevas

En el proyecto **darkis-brownies**, abre **Firestore Database → Reglas**, sustituye todo por `firestore.rules` de esta versión y pulsa **Publicar**. Son distintas de las reglas de v13: ya no esperan tokens emitidos por Functions.

## 2. Dominio y proveedor Google

Google ya debe estar habilitado en **Authentication → Método de acceso**. Conserva también **Anónimo** para Darkita.

En **Authentication → Configuración → Dominios autorizados**, añade el dominio desde el que abrirás la app si no está en la lista. Usa una dirección HTTPS; abrir el HTML como archivo local o dentro de una vista previa ajena no sirve para comprobar Google. Puedes alojar la app con Firebase Hosting o en el alojamiento web que ya uses. Este paso no debe publicar el histórico financiero en un sitio de acceso público sin resolver primero la nota de privacidad al final.

## 3. Autorizar la primera cuenta administradora (una sola vez)

1. Abre Administrador, entra con el PIN 1016 y pulsa **Continuar con Google**.
2. La app mostrará **Cuenta pendiente de autorización**. Copia **mi ID** (UID).
3. En **Firestore → Datos → Iniciar colección**, crea la colección `accessRoles`.
4. Usa ese UID completo como **ID del documento**. No uses ID automático ni correo como ID.
5. Agrega exactamente estos campos y guarda:

   | Campo | Tipo | Valor |
   | --- | --- | --- |
   | `role` | string | `admin` |
   | `profileId` | string | cadena vacía |
   | `enabled` | boolean | `true` |

6. Vuelve a la app y pulsa **Ya me autorizaron**. El foquito se pondrá verde cuando Firestore responda.

Sólo una persona con acceso a la consola del proyecto puede crear este primer permiso. La app no puede nombrarse administradora a sí misma. El ejemplo anterior no cambia credenciales de Google ni necesita una contraseña nueva.

## 4. Autorizar las otras cuentas desde la app

Cada persona abre su área, entra con su PIN, conecta su Google y pulsa **Solicitar acceso**. Desde tu cuenta administradora abre el engrane → **Cuenta Google y permisos → Administrar accesos**. Selecciona el área y pulsa **Autorizar**:

| Acceso | `role` | `profileId` |
| --- | --- | --- |
| Administrador | `admin` | vacío |
| Repartidor | `route` | vacío |
| Tania | `socio` | `tania` |
| Sofi | `socio` | `sofia` |
| Juan Pablo | `socio` | `juan-pablo` |

La cuenta administradora puede usar todas las áreas. Una cuenta de repartidor consulta la ruta; un socio, sólo su perfil. Conocer el PIN de otro perfil no permite leer sus datos de Firebase. Desde el mismo panel se puede desactivar una cuenta, excepto la administradora que estás usando. Los permisos pueden modificarse directamente en la consola si necesitas recuperar el acceso.

Google queda recordado en ese navegador/dispositivo hasta cerrar su sesión o borrar los datos del navegador. Al cambiar de perfil, la app no cierra Google automáticamente; para otra persona en un dispositivo compartido usa **Cambiar Google**. Un permiso revocado bloquea nuevas lecturas/escrituras online; no borra copias que ya existan offline.

## Datos y continuidad

- Se conservan los clientes, ventas, gastos y cortes locales de versiones anteriores. Las operaciones pendientes se envían con IDs estables cuando la cuenta queda autorizada.
- La ruta se comparte entre cuentas autorizadas como Repartidor y Administrador. Cada Darkisocio comparte sus propios datos entre sus dispositivos autorizados.
- Los movimientos de Repartidor y Darkisocio alimentan al Administrador; el resto de la base financiera del Administrador sigue guardándose localmente y requiere respaldos JSON.
- Darkita conserva su identificación anónima por dispositivo, perfiles PIN, GPS y PDF. No se necesita Google para checar el turno. El administrador autorizado puede leer el reloj en Firestore.
- Las colecciones `accessRequests` contienen solicitudes; nunca otorgan acceso. Sólo `accessRoles` tiene permisos efectivos y sólo el administrador o la consola pueden escribirla.

## Instalación y avisos

En Spark esta versión ofrece la instalación automática hasta **tres veces por dispositivo**, no por IP. Siempre se puede instalar manualmente desde Ajustes. Se retiraron las llamadas a las funciones de v13.

Los avisos y su prueba funcionan con la app abierta, de acuerdo con el permiso del navegador y el modo elegido. Para avisos nuevos con la app cerrada todavía se requiere un servicio de envío push y su configuración. No se prometen recordatorios en segundo plano desde un simple temporizador de una página cerrada.

## Privacidad del histórico precargado

Por solicitud del propietario, `administrador.html` incluye todo el histórico financiero. Google y las reglas protegen las colecciones de Firebase, pero no cifran los datos incluidos en ese HTML ni los guardados localmente. No publiques ese archivo en un repositorio o sitio accesible al público si necesitas mantener privado el histórico. Para un despliegue público con privacidad real hay que retirar el histórico del HTML y migrarlo a documentos exclusivos del administrador.
