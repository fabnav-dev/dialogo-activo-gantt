/* ============================================================
   CONFIGURACIÓN DE FIREBASE  ·  Diálogo activo - Gantt
   ------------------------------------------------------------
   Pega aquí los datos que te entrega Firebase al crear tu
   proyecto (Configuración del proyecto → Tus apps → SDK).

   MIENTRAS ESTÉ EN BLANCO, la app guarda solo en este
   navegador (modo local). Apenas completes apiKey y projectId,
   la app pasa AUTOMÁTICAMENTE a modo nube en tiempo real para
   todo el equipo. No hay que tocar nada más.
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyA8MCuNLT4Lr1lXr0TZQEFQE75d1XFT6xY",
  authDomain: "dialogo-activogantt.firebaseapp.com",
  projectId: "dialogo-activogantt",
  storageBucket: "dialogo-activogantt.firebasestorage.app",
  messagingSenderId: "459595371549",
  appId: "1:459595371549:web:63d587d21bb8c59ff0a2f4",
  measurementId: "G-X6WMV770LX"
};

/* Identificador del documento compartido del proyecto.
   Si algún día quieres llevar DOS cartas Gantt separadas,
   cambia este nombre para la segunda. */
window.FIREBASE_DOC_ID = "dialogo-activo-2026";
