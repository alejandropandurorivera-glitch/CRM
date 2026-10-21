/* Mensajes compartidos: el error real se conserva para poder diagnosticarlo. */
(() => {
  const messages = {
    'clock/owner-mismatch':'Este movimiento pertenece a otra identidad del reloj. Conserva los registros y comparte el diagnóstico con el administrador.',
    'permission-denied':'Firestore rechazó el permiso. Comprueba las reglas publicadas y el rol de esta cuenta.',
    'auth/operation-not-allowed':'Activa el proveedor de acceso correspondiente en Firebase Authentication.',
    'auth/admin-restricted-operation':'Activa el acceso anónimo de Darkita en Firebase Authentication.',
    'auth/unauthorized-domain':'Autoriza alejandropandurorivera-glitch.github.io en Firebase Authentication.',
    'auth/invalid-api-key':'La configuración de Firebase no corresponde a una clave válida.',
    'auth/network-request-failed':'No se pudo contactar con Firebase. Revisa la conexión y los bloqueadores.',
    'auth/web-storage-unsupported':'El navegador no permite guardar la sesión. Abre la app en Safari o Chrome con almacenamiento habilitado.',
    'auth/user-token-expired':'La sesión del reloj caducó o fue deshabilitada. Conserva sus datos y comparte el diagnóstico para revisar esa identidad.',
    'auth/user-disabled':'Firebase deshabilitó esta identidad. Conserva los registros locales y revisa Authentication.',
    'auth/invalid-user-token':'Firebase no pudo validar la sesión del reloj. Conserva sus datos y comparte el diagnóstico.',
    'auth/quota-exceeded':'Firebase alcanzó una cuota de autenticación. Los horarios permanecen guardados localmente.',
    'auth/too-many-requests':'Firebase limitó temporalmente los intentos. Espera un momento y reintenta.',
    'unavailable':'Firestore no respondió. Los cambios siguen en este dispositivo.',
    'resource-exhausted':'Se alcanzó una cuota de Firebase. Los cambios siguen pendientes en este dispositivo.',
    'timeout':'Firebase tardó demasiado. Los cambios siguen pendientes en este dispositivo.'
  };
  window.darkisFirebaseError = error => {
    const code = String(error?.code || (error?.message === 'timeout' ? 'timeout' : 'connection-error')).replace(/^firestore\//,'');
    const detail = messages[code] || 'No se pudo completar la conexión con Firebase. Tus datos locales se conservan.';
    return `${detail} (${code})`;
  };
})();
