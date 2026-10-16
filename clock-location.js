/* v17: lecturas recientes; tolerancia acotada para GPS en interiores. */
(() => {
  'use strict';
  const MAX_ACCURACY = 100, MAX_TOLERANCE = 35, MAX_AGE = 10000;
  function classify(distance, accuracy, radius = 50) {
    if (!Number.isFinite(distance) || distance < 0 || !Number.isFinite(accuracy) || accuracy <= 0 || !Number.isFinite(radius) || radius <= 0) return 'uncertain';
    if (accuracy > MAX_ACCURACY) return distance - accuracy > radius ? 'outside' : 'uncertain';
    if (distance <= radius) return 'inside';
    if (distance <= radius + Math.min(accuracy, MAX_TOLERANCE)) return 'approximate';
    return distance - accuracy > radius ? 'outside' : 'uncertain';
  }
  function read(geo = navigator.geolocation) {
    return new Promise((resolve, reject) => {
      if (!geo) return reject(Error('Este dispositivo no ofrece ubicación.'));
      let best = null, watch = null, settleTimer = null, done = false, samples = 0;
      const started = Date.now();
      const finish = error => {
        if (done) return;
        done = true;
        clearTimeout(deadline); clearTimeout(settleTimer);
        if (watch !== null) geo.clearWatch(watch);
        if (error) reject(error);
        else if (best) resolve(best);
        else reject(Error('No pudimos confirmar tu ubicación. Activa Ubicación precisa y vuelve a intentar.'));
      };
      const deadline = setTimeout(() => finish(), 16000);
      const receive = position => {
        if (done) return;
        const c = position.coords;
        if (!c || !Number.isFinite(c.latitude) || Math.abs(c.latitude) > 90 || !Number.isFinite(c.longitude) || Math.abs(c.longitude) > 180 || !Number.isFinite(c.accuracy) || c.accuracy <= 0) return;
        if (!Number.isFinite(position.timestamp) || position.timestamp < started - 2000 || Date.now() - position.timestamp > MAX_AGE || position.timestamp > Date.now() + 5000) return;
        if (!best || c.accuracy < best.accuracy || c.accuracy === best.accuracy && position.timestamp > best.timestamp) best = {latitude:c.latitude, longitude:c.longitude, altitude:c.altitude ?? null, accuracy:c.accuracy, altitudeAccuracy:c.altitudeAccuracy ?? null, timestamp:position.timestamp};
        samples++;
        if (samples >= 2 && Date.now() - started >= 3000 && c.accuracy <= 15) return finish();
        if (!settleTimer) settleTimer = setTimeout(() => finish(), 8000);
      };
      const fail = error => { if (error?.code === 1) finish(error); else if (best) finish(); /* Una falla transitoria permite reintentar hasta el límite. */ };
      try {
        watch = geo.watchPosition(receive, fail, {enableHighAccuracy:true, maximumAge:0, timeout:15000});
        if (done && watch !== null) geo.clearWatch(watch);
      } catch (error) { finish(error); }
    });
  }
  window.DarkisLocation = {classify, read};
})();
