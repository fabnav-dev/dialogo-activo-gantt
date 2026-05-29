/* ============================================================
   sync.js — Motor de sincronización en la nube (Firebase)
   ------------------------------------------------------------
   Expone window.GanttSync. Si FIREBASE_CONFIG no está completo,
   queda deshabilitado y la app usa solo localStorage.
   Guarda TODO el estado como una cadena JSON en un único
   documento (evita las limitaciones de arreglos anidados de
   Firestore) + una subcolección de "presencia" para saber
   quién está en línea.
   ============================================================ */
(function () {
  var cfg = window.FIREBASE_CONFIG || {};
  var configured = !!(cfg.apiKey && cfg.projectId);
  var Sync = { enabled: configured, ready: false };

  var db = null, docRef = null, presenceCol = null;

  Sync.init = function () {
    if (!configured) return false;
    if (typeof firebase === 'undefined' || !firebase.initializeApp) {
      console.warn('[GanttSync] SDK de Firebase no cargó.');
      Sync.enabled = false;
      return false;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      db = firebase.firestore();
      var id = window.FIREBASE_DOC_ID || 'main';
      docRef = db.collection('gantt').doc(id);
      presenceCol = docRef.collection('presence');
      Sync.ready = true;
      return true;
    } catch (e) {
      console.warn('[GanttSync] Error al iniciar Firebase:', e);
      Sync.enabled = false;
      return false;
    }
  };

  // Escucha cambios remotos. Ignora los ecos de nuestras propias escrituras.
  Sync.onState = function (cb) {
    if (!docRef) return function () {};
    return docRef.onSnapshot({ includeMetadataChanges: false }, function (snap) {
      if (snap.metadata && snap.metadata.hasPendingWrites) return; // nuestro propio cambio
      if (!snap.exists) return;
      var d = snap.data();
      if (d && d.payload) {
        try { cb(JSON.parse(d.payload)); } catch (e) {}
      }
    }, function (err) { console.warn('[GanttSync] onState', err); });
  };

  Sync.save = function (state) {
    if (!docRef) return;
    docRef.set({ payload: JSON.stringify(state), updatedAt: Date.now() })
      .catch(function (e) { console.warn('[GanttSync] save', e); });
  };

  // Siembra el documento solo si aún no existe en la nube.
  Sync.seedIfEmpty = function (state, done) {
    if (!docRef) { done && done(false); return; }
    docRef.get().then(function (snap) {
      if (!snap.exists) { Sync.save(state); done && done(false); }
      else { done && done(true); }
    }).catch(function (e) { console.warn('[GanttSync] seed', e); done && done(false); });
  };

  // ---- Presencia (quién está en línea) ----
  Sync.heartbeat = function (user) {
    if (!presenceCol || !user) return;
    presenceCol.doc(user.id).set({
      id: user.id, nm: user.nm, init: user.init, color: user.color, lastSeen: Date.now()
    }).catch(function () {});
  };

  Sync.onPresence = function (cb) {
    if (!presenceCol) return function () {};
    return presenceCol.onSnapshot(function (qs) {
      var now = Date.now(), arr = [];
      qs.forEach(function (doc) {
        var v = doc.data();
        if (v && (now - (v.lastSeen || 0) < 70000)) arr.push(v);
      });
      cb(arr);
    }, function (err) { console.warn('[GanttSync] onPresence', err); });
  };

  Sync.leave = function (userId) {
    if (presenceCol && userId) presenceCol.doc(userId).delete().catch(function () {});
  };

  window.GanttSync = Sync;
})();
