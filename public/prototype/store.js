/* Apollo — store compartido (worklist + datos de empresa).
   Singleton global: Técnico (Apollo PACS) y Recepción leen/escriben la MISMA lista.
   En el software real, esto lo reemplaza la conexión al PACS/ERP (Codex). */
(function () {
  if (window.ApolloStore) return;

  var listeners = new Set();
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); }

  var store = {
    // enEquipo=true  -> visible en el equipo/modalidad (worklist activa)
    // enEquipo=false -> retirado del equipo pero conservado en la WL (histórico)
    worklist: [
      { id: 'MRN-024518', pac: 'GONZÁLEZ RUIZ, MARÍA',   edad: '39', tel: '638 111 2233', mod: 'RX', est: 'RX Tórax PA',      hora: '09:12', s: 'enviado',   enEquipo: false },
      { id: 'MRN-024519', pac: 'MARTÍNEZ LÓPEZ, JUAN',    edad: '54', tel: '638 222 4455', mod: 'US', est: 'US Abdomen',       hora: '09:34', s: 'pendiente', enEquipo: true  },
      { id: 'MRN-024520', pac: 'HERNÁNDEZ SOTO, CARMEN',  edad: '61', tel: '638 333 6677', mod: 'CT', est: 'CT Cráneo simple', hora: '10:02', s: 'recibido',  enEquipo: true  },
      { id: 'MRN-024521', pac: 'RAMÍREZ DÍAZ, PEDRO',     edad: '47', tel: '638 444 8899', mod: 'MR', est: 'MR Rodilla',       hora: '10:21', s: 'error',     enEquipo: true  },
      { id: 'MRN-024522', pac: 'FLORES VEGA, ANA',        edad: '33', tel: '638 555 1010', mod: 'RX', est: 'RX Tórax PA',      hora: '10:48', s: 'enviado',   enEquipo: false }
    ],

    // Datos de la empresa que aparecen en tickets (multi-empresa: editable).
    empresa: {
      nombre: 'RADIODIAGNÓSTICO',
      giro: 'Centro de imagen y diagnóstico',
      direccion: 'Blvd. Benito Juárez 123, Col. Centro',
      tel: '638 383 0000',
      rfc: 'RAD200101AAA',
      logo: '' // dataURL opcional
    },

    getWorklist: function () { return store.worklist; },
    setWorklist: function (wl) { store.worklist = wl; emit(); },
    updateStudy: function (id, patch) {
      store.worklist = store.worklist.map(function (w) { return w.id === id ? Object.assign({}, w, patch) : w; });
      emit();
    },
    removeStudy: function (id) {
      store.worklist = store.worklist.filter(function (w) { return w.id !== id; });
      emit();
    },

    getEmpresa: function () { return store.empresa; },
    setEmpresa: function (e) { store.empresa = Object.assign({}, store.empresa, e); emit(); },

    subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; }
  };

  window.ApolloStore = store;
})();
