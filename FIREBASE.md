# Firebase de Sistema Darkis

Este proyecto usa la función `darkisPinLogin` para comprobar el PIN en el servidor. El navegador recibe un token de Firebase con el rol correspondiente. Los PIN `1016` y `2024` aparecen en el HTML para abrir la interfaz local, así que **no son secretos**: la protección de los datos compartidos depende de los secretos del servidor, los tokens y las reglas. Antes de publicar datos sensibles, conviene cambiar estos PIN por credenciales privadas individuales y un control de acceso más fuerte.

## Preparación

1. Usa el proyecto Firebase `darkis-brownies`, con Authentication y Cloud Firestore habilitados. Las Cloud Functions de segunda generación y Secret Manager requieren el plan Blaze.
2. En la raíz de este directorio crea `firebase.json` si todavía no existe:

   ```json
   {
     "functions": { "source": "functions" },
     "firestore": { "rules": "firestore.rules" }
   }
   ```

3. Desde esta carpeta instala dependencias y registra tres secretos. La CLI pedirá los valores sin guardarlos en el HTML o en el repositorio:

   ```sh
   npm install --prefix functions
   firebase functions:secrets:set DARKIS_ADMIN_PIN --project darkis-brownies
   firebase functions:secrets:set DARKIS_ROUTE_PIN --project darkis-brownies
   firebase functions:secrets:set DARKIS_PIN_PEPPER --project darkis-brownies
   ```

   Configura los PIN acordados para administrador y repartidor y una cadena aleatoria de al menos 32 caracteres para `DARKIS_PIN_PEPPER` (por ejemplo, generada con `openssl rand -hex 32`). Evita escribir estos valores en archivos publicados.

4. Despliega desde la misma carpeta:

   ```sh
   firebase deploy --project darkis-brownies --only functions:darkisPinLogin,functions:darkisInstallPrompt,firestore:rules
   ```

Si la firma de tokens falla por permisos, concede `iam.serviceAccounts.signBlob` a la cuenta de servicio que ejecuta la función, según el mensaje de Firebase. La función usa `us-central1`; el frontend debe elegir esa misma región.

## Contrato del acceso

Llama a `httpsCallable(getFunctions(app, 'us-central1'), 'darkisPinLogin')` y después a `signInWithCustomToken(auth, result.data.token)`:

| Pantalla | Argumentos de la llamada | UID y rol resultantes |
| --- | --- | --- |
| Administrador | `{role: 'admin', pin}` | `darkis-admin`, `admin` |
| Repartidor | `{role: 'route', profileId: 'repartidor', pin}` | `darkis-route`, `route` |
| Darkisocio | `{role: 'route', profileId: 'tania' \| 'sofia' \| 'juan-pablo', pin}` | `darkis-socio-{profileId}`, `socio` |

La función responde `{token, uid, role, profileId}`. El PIN de repartidor abre cualquiera de los tres perfiles Darkisocio; si posteriormente cada persona necesita privacidad entre socios, configura credenciales individuales en el servidor. Cinco PIN incorrectos desde la misma dirección IP y rol bloquean nuevos intentos durante una ventana de quince minutos. El límite usa un HMAC de la IP en Firestore, dentro de `_pinAttempts`, inaccesible a los clientes. Puedes activar la política TTL de Firestore para el campo `expiresAt` y limpiar esos contadores automáticamente.

`darkisInstallPrompt` cuenta hasta tres apariciones automáticas del botón instalador por IP en `_installPromptCounts`. No guarda la IP en claro. Sin desplegar la función, la PWA usa un límite provisional de tres veces por dispositivo. Varias personas que comparten una IP comparten el límite; una IP que cambia puede recibir otro conjunto de apariciones.

Los ajustes de avisos se guardan en cada dispositivo. Las alertas de vencimiento, clientes pendientes y corte se revisan mientras la app está abierta. El botón «Validar permiso» solicita autorización del sistema y «Probar aviso» comprueba el resultado. Para avisos push **con la app cerrada** todavía se requiere registrar los dispositivos en Firebase Cloud Messaging, configurar su clave VAPID y programar el envío desde el servidor; esta versión no afirma que esos envíos ya estén activos.

## Formato de documentos

El repartidor escribe en `routeClients/{id}` y `routeContributions/{id}`. Cada socio escribe en `socioProfiles/{profileId}/clients/{id}`, `socioProfiles/{profileId}/sales/{id}` y también en `routeContributions/{id}` para incluir su venta en el corte común. Cada documento lleva `{ownerUid: auth.currentUser.uid, data: {...}, updatedAt: serverTimestamp()}`. En una contribución, `data.actorProfileId` debe ser `repartidor` para la ruta principal o coincidir con el socio autenticado. El administrador puede leer todas esas colecciones. Las reglas conservan `users/{uid}/clients|cuts|expenses|tasks` y el reloj checador anterior.

El UID administrativo nuevo es diferente del UID usado antes con correo y contraseña. Haz una migración explícita o carga la ruta del UID anterior antes de reemplazar datos: un primer inicio de sesión no debe subir un estado vacío sobre la información histórica. Las cuentas anteriores sólo pueden acceder a sus propios documentos y ya no reciben permisos administrativos generales.

La primera entrada por PIN requiere internet. Una sesión Firebase ya iniciada puede usar la caché offline; al cambiar PIN, cierra las sesiones anteriores y revoca los tokens de las identidades compartidas para impedir que sigan usando el acceso anterior. Esta versión incluye el histórico financiero precargado en `administrador.html` por petición del propietario. No publiques ese archivo en un sitio accesible al público: el PIN de la interfaz no cifra ni protege el contenido HTML. Para un despliegue público posterior, mueve el histórico a Firestore con lectura exclusiva del administrador y retira la copia del HTML.
