/* === state.jsx — datos, helpers de fechas, store con localStorage === */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

// === paleta para fases ===
const PHASE_PALETTE = [
  { bar: '#5E8BC3', soft: '#DCE7F4' },  // azul logo
  { bar: '#1B3358', soft: '#D2DAEA' },  // navy
  { bar: '#E89A3C', soft: '#FBE5C7' },  // ámbar (complementario)
  { bar: '#2EB77E', soft: '#D8F0E4' },  // verde
  { bar: '#8E5BB2', soft: '#E8DAF0' },  // morado suave
];

// === miembros del equipo ===
const TEAM = [
  { id: 'ep', nm: 'Camila Hernández',     color: '#1B3358', live: true,  init: 'CH' },
  { id: 'cl', nm: 'Carlos Ortiz',         color: '#5E8BC3', live: true,  init: 'CO' },
  { id: 'nc', nm: 'Nicole Silva',         color: '#E89A3C', live: false, init: 'NS' },
  { id: 'ct', nm: 'Macarena Salas',       color: '#2EB77E', live: true,  init: 'MS' },
  { id: 'ia', nm: 'Alejandra Rosales',    color: '#8E5BB2', live: false, init: 'AR' },
  { id: 'mr', nm: 'Patricio Iturrieta',   color: '#DA5C5C', live: true,  init: 'PI' },
  { id: 'fp', nm: 'Fabián Pérez',         color: '#3D8B8B', live: false, init: 'FP' },
];

// === fechas (ISO yyyy-mm-dd) ===
const PROJECT_START = '2026-05-25'; // última semana de mayo (lunes)
const PROJECT_WEEKS = 31;          // hasta fines de diciembre

function parseISO(s) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function fmtISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function fmtDM(d) {
  if (typeof d === 'string') d = parseISO(d);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}
function fmtFull(d) {
  if (typeof d === 'string') d = parseISO(d);
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${meses[d.getMonth()]}`;
}
function addDays(d, n) {
  if (typeof d === 'string') d = parseISO(d);
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function diffDays(a, b) {
  if (typeof a === 'string') a = parseISO(a);
  if (typeof b === 'string') b = parseISO(b);
  return Math.round((b - a) / 86400000);
}
function workdays(start, end) {
  // días lunes-viernes inclusive
  let s = typeof start === 'string' ? parseISO(start) : new Date(start);
  let e = typeof end === 'string' ? parseISO(end) : new Date(end);
  if (e < s) return 0;
  let n = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}
function isWeekend(d) {
  if (typeof d === 'string') d = parseISO(d);
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

// genera los días del proyecto (incluye fines de semana para el grid)
function buildCalendar(startISO, weeks) {
  const days = [];
  const start = parseISO(startISO);
  for (let w = 0; w < weeks; w++) {
    const weekDays = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w*7 + d);
      weekDays.push({
        date,
        iso: fmtISO(date),
        dow: date.getDay(), // 0=dom..6=sab
        weekend: date.getDay() === 0 || date.getDay() === 6,
        label: ['D','L','M','X','J','V','S'][date.getDay()],
      });
    }
    days.push(weekDays);
  }
  return days;
}

const DAY_LABELS = ['D','L','M','X','J','V','S'];

// === datos sembrados ===
const SEED_PHASES = [
  {
    id: 'f1', wbs: '1', title: 'Fase Uno · Diseño y Diagnóstico', expanded: true,
    tasks: [
      { id: 't101', wbs: '1.1', title: 'Diseño protocolo de entrevistas',   responsible: 'cl', start: '2026-05-25', end: '2026-06-05', progress: 35 },
      { id: 't102', wbs: '1.2', title: 'Revisión equipo directivo',         responsible: 'ep', start: '2026-06-01', end: '2026-06-05', progress: 20 },
      { id: 't103', wbs: '1.3', title: 'Capacitación profesores tutores',   responsible: 'cl', start: '2026-06-08', end: '2026-06-12', progress: 10 },
      { id: 't104', wbs: '1.4', title: 'Configuración plataforma RE 2026',  responsible: 'mr', start: '2026-06-01', end: '2026-06-12', progress: 15 },
      { id: 't105', wbs: '1.5', title: 'Comunicación a apoderados',         responsible: 'nc', start: '2026-06-15', end: '2026-06-19', progress: 0 },
      { id: 't106', wbs: '1.6', title: 'Kick-off ciclo Diálogo activo',     responsible: 'ep', start: '2026-06-22', end: '2026-06-22', progress: 0, milestone: true },
    ],
  },
  {
    id: 'f2', wbs: '2', title: 'Fase Dos · Implementación Tercer Ciclo', expanded: true,
    tasks: [
      { id: 't201', wbs: '2.1', title: 'Entrevistas Primero Medio',         responsible: 'ct', start: '2026-06-22', end: '2026-07-17', progress: 0 },
      { id: 't202', wbs: '2.2', title: 'Entrevistas Segundo Medio',         responsible: 'ia', start: '2026-07-06', end: '2026-07-31', progress: 0 },
      { id: 't203', wbs: '2.3', title: 'Entrevistas Tercero Medio',         responsible: 'cl', start: '2026-07-20', end: '2026-08-14', progress: 0 },
      { id: 't204', wbs: '2.4', title: 'Entrevistas Cuarto Medio',          responsible: 'nc', start: '2026-08-03', end: '2026-08-28', progress: 0 },
      { id: 't205', wbs: '2.5', title: 'Hito · 50% de cobertura',           responsible: 'ep', start: '2026-08-14', end: '2026-08-14', progress: 0, milestone: true },
      { id: 't206', wbs: '2.6', title: 'Reunión intermedia psicosocial',    responsible: 'cl', start: '2026-09-07', end: '2026-09-11', progress: 0 },
      { id: 't207', wbs: '2.7', title: 'Sistematización de hallazgos',      responsible: 'ep', start: '2026-08-17', end: '2026-09-11', progress: 0 },
      { id: 't208', wbs: '2.8', title: 'Hito · 100% cobertura',             responsible: 'ep', start: '2026-09-18', end: '2026-09-18', progress: 0, milestone: true },
    ],
  },
  {
    id: 'f3', wbs: '3', title: 'Fase Tres · Análisis y Seguimiento', expanded: true,
    tasks: [
      { id: 't301', wbs: '3.1', title: 'Métricas y avance por curso',       responsible: 'mr', start: '2026-09-21', end: '2026-10-02', progress: 0 },
      { id: 't302', wbs: '3.2', title: 'Reunión equipo psicosocial',        responsible: 'cl', start: '2026-10-05', end: '2026-10-09', progress: 0 },
      { id: 't303', wbs: '3.3', title: 'Plan de acompañamiento individual', responsible: 'ia', start: '2026-10-12', end: '2026-10-30', progress: 0 },
      { id: 't304', wbs: '3.4', title: 'Seguimiento casos prioritarios',     responsible: 'nc', start: '2026-10-19', end: '2026-11-13', progress: 0 },
      { id: 't305', wbs: '3.5', title: 'Informe trimestral · UTP',           responsible: 'ep', start: '2026-11-02', end: '2026-11-13', progress: 0 },
    ],
  },
  {
    id: 'f4', wbs: '4', title: 'Fase Cuatro · Cierre y Plan 2027', expanded: true,
    tasks: [
      { id: 't401', wbs: '4.1', title: 'Evaluación de impacto del ciclo',   responsible: 'ep', start: '2026-11-16', end: '2026-11-27', progress: 0 },
      { id: 't402', wbs: '4.2', title: 'Reunión cierre con apoderados',     responsible: 'nc', start: '2026-11-30', end: '2026-12-04', progress: 0 },
      { id: 't403', wbs: '4.3', title: 'Consolidación informe anual',       responsible: 'mr', start: '2026-11-23', end: '2026-12-11', progress: 0 },
      { id: 't404', wbs: '4.4', title: 'Diseño Plan Diálogo activo 2027',   responsible: 'cl', start: '2026-12-07', end: '2026-12-18', progress: 0 },
      { id: 't405', wbs: '4.5', title: 'Hito · Cierre año escolar',         responsible: 'ep', start: '2026-12-18', end: '2026-12-18', progress: 0, milestone: true },
    ],
  },
];

const SEED_LOG = [];

const ACTION_LABELS = {
  updated_progress: 'actualizó el avance de',
  edited_task: 'editó la tarea',
  added_task: 'agregó la tarea',
  commented: 'comentó en',
  created_phase: 'creó',
  removed_task: 'eliminó la tarea',
};

// === store con persistencia ===
const STORAGE_KEY = 'cm-dialogo-activo-gantt-v2';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function saveToStorage(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

// Reasigna los códigos EDT (1, 1.1, 1.2…) según la posición actual,
// para que no queden huecos al agregar o eliminar tareas/fases.
function renumberPhases(phases) {
  return phases.map((p, pi) => {
    const wbs = String(pi + 1);
    return {
      ...p,
      wbs,
      tasks: p.tasks.map((t, ti) => ({ ...t, wbs: `${wbs}.${ti + 1}` })),
    };
  });
}

function useStore() {
  const initial = loadFromStorage();
  const [state, setState] = useState(initial || {
    projectTitle: 'Diálogo activo · Segundo Semestre 2026',
    responsible: 'Camila Hernández',
    projectResp: ['ep'],
    startDate: PROJECT_START,
    phases: SEED_PHASES,
    log: SEED_LOG,
    savedAt: Date.now(),
  });
  const [saveStatus, setSaveStatus] = useState('saved'); // saved | saving
  const timer = useRef();
  const cloudTimer = useRef();

  // ====== MODO NUBE (Firebase) ======
  const Sync = (typeof window !== 'undefined' && window.GanttSync) || { enabled: false };
  const cloud = !!Sync.enabled;
  const skipNextCloudSave = useRef(false);

  // identidad del editor (quién soy)
  const [currentUserId, setCurrentUserId] = useState(() => {
    try { return localStorage.getItem('cm-identity-v1') || null; } catch { return null; }
  });
  const userIdRef = useRef(currentUserId || 'ep');
  useEffect(() => { userIdRef.current = currentUserId || 'ep'; }, [currentUserId]);
  const needIdentity = cloud && !currentUserId;
  const setIdentity = useCallback((id) => {
    try { localStorage.setItem('cm-identity-v1', id); } catch {}
    setCurrentUserId(id);
  }, []);

  const [onlineUsers, setOnlineUsers] = useState([]);

  // inicializa Firebase, siembra, y suscribe a cambios remotos
  useEffect(() => {
    if (!cloud) return;
    if (!Sync.init()) return;
    // siembra el doc compartido la primera vez
    Sync.seedIfEmpty(state, () => {});
    // escucha cambios de otros editores
    const unsub = Sync.onState((remote) => {
      skipNextCloudSave.current = true;     // evita reenviar lo que acabamos de recibir
      setState(remote);
    });
    return () => { try { unsub && unsub(); } catch {} };
    // eslint-disable-next-line
  }, [cloud]);

  // presencia: latido + lista de conectados
  useEffect(() => {
    if (!cloud || !currentUserId) return;
    const me = TEAM.find(t => t.id === currentUserId);
    if (!me) return;
    Sync.heartbeat(me);
    const beat = setInterval(() => Sync.heartbeat(me), 20000);
    const unsub = Sync.onPresence(setOnlineUsers);
    const onLeave = () => Sync.leave(currentUserId);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      clearInterval(beat);
      try { unsub && unsub(); } catch {}
      window.removeEventListener('beforeunload', onLeave);
      Sync.leave(currentUserId);
    };
  }, [cloud, currentUserId]);

  // autosave: localStorage siempre (caché offline) + nube si está activa
  useEffect(() => {
    setSaveStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveToStorage({ ...state, savedAt: Date.now() });
      setSaveStatus('saved');
    }, 600);

    if (cloud) {
      if (skipNextCloudSave.current) {
        skipNextCloudSave.current = false; // este cambio vino de la nube; no reenviar
      } else {
        clearTimeout(cloudTimer.current);
        cloudTimer.current = setTimeout(() => Sync.save(state), 700);
      }
    }
  }, [state]);

  // métricas globales
  const stats = useMemo(() => {
    const allTasks = state.phases.flatMap(p => p.tasks.filter(t => !t.milestone));
    const total = allTasks.length;
    const progs = allTasks.map(getProg);
    const done = progs.filter(p => p.avg >= 100).length;
    const inProgress = progs.filter(p => p.avg > 0 && p.avg < 100).length;
    const pending = progs.filter(p => p.avg === 0).length;
    const avgPen = total ? Math.round(progs.reduce((a,p) => a + p.pen, 0) / total) : 0;
    const avgTob = total ? Math.round(progs.reduce((a,p) => a + p.tob, 0) / total) : 0;
    const avgProgress = Math.round((avgPen + avgTob) / 2);
    const milestones = state.phases.flatMap(p => p.tasks.filter(t => t.milestone));
    const milestonesDone = milestones.filter(m => getProg(m).avg >= 100).length;
    return { total, done, inProgress, pending, avgProgress, avgPen, avgTob, milestones: milestones.length, milestonesDone };
  }, [state.phases]);

  // === acciones ===
  const updateTask = useCallback((phaseId, taskId, patch) => {
    setState(s => ({
      ...s,
      phases: s.phases.map(p => p.id === phaseId ? {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...patch } : t)
      } : p)
    }));
  }, []);

  const addLog = useCallback((entry) => {
    setState(s => ({ ...s, log: [{ id: 'l'+Math.random().toString(36).slice(2,7), when: Date.now(), ...entry }, ...s.log].slice(0,80) }));
  }, []);

  const addTask = useCallback((phaseId) => {
    setState(s => {
      const phase = s.phases.find(p => p.id === phaseId);
      const nextN = phase.tasks.filter(t => !t.milestone).length + 1;
      const lastTask = phase.tasks[phase.tasks.length-1];
      const startISO = lastTask ? lastTask.end : s.startDate;
      const start = addDays(parseISO(startISO), 1);
      const end = addDays(start, 4);
      const newTask = {
        id: 't' + Math.random().toString(36).slice(2,8),
        wbs: `${phase.wbs}.${nextN}`,
        title: 'Nueva tarea',
        responsible: TEAM[0].id,
        start: fmtISO(start),
        end: fmtISO(end),
        progress: 0,
      };
      return {
        ...s,
        phases: renumberPhases(s.phases.map(p => p.id === phaseId ? { ...p, tasks: [...p.tasks, newTask] } : p)),
        log: [{id:'l'+Math.random().toString(36).slice(2,7), when:Date.now(), user:userIdRef.current, action:'added_task', target:newTask.wbs, detail:`agregó "${newTask.title}"`}, ...s.log].slice(0,80),
      };
    });
  }, []);

  const removeTask = useCallback((phaseId, taskId) => {
    setState(s => {
      const phase = s.phases.find(p => p.id === phaseId);
      const task = phase.tasks.find(t => t.id === taskId);
      return {
        ...s,
        phases: renumberPhases(s.phases.map(p => p.id === phaseId ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) } : p)),
        log: [{id:'l'+Math.random().toString(36).slice(2,7), when:Date.now(), user:userIdRef.current, action:'removed_task', target:task?.wbs, detail:`eliminó "${task?.title}"`}, ...s.log].slice(0,80),
      };
    });
  }, []);

  const addPhase = useCallback(() => {
    setState(s => {
      const nextN = s.phases.length + 1;
      const newPhase = {
        id: 'f' + Math.random().toString(36).slice(2,7),
        wbs: String(nextN),
        title: `Fase ${['Uno','Dos','Tres','Cuatro','Cinco','Seis'][nextN-1] || nextN} · Nueva fase`,
        expanded: true,
        tasks: [],
      };
      return {
        ...s,
        phases: renumberPhases([...s.phases, newPhase]),
        log: [{id:'l'+Math.random().toString(36).slice(2,7), when:Date.now(), user:userIdRef.current, action:'created_phase', target:newPhase.wbs, detail:`creó "${newPhase.title}"`}, ...s.log].slice(0,80),
      };
    });
  }, []);

  const togglePhase = useCallback((phaseId) => {
    setState(s => ({ ...s, phases: s.phases.map(p => p.id === phaseId ? { ...p, expanded: !p.expanded } : p) }));
  }, []);

  const updatePhase = useCallback((phaseId, patch) => {
    setState(s => ({ ...s, phases: s.phases.map(p => p.id === phaseId ? { ...p, ...patch } : p) }));
  }, []);

  const removePhase = useCallback((phaseId) => {
    setState(s => {
      const phase = s.phases.find(p => p.id === phaseId);
      return {
        ...s,
        phases: renumberPhases(s.phases.filter(p => p.id !== phaseId)),
        log: [{id:'l'+Math.random().toString(36).slice(2,7), when:Date.now(), user:userIdRef.current, action:'removed_task', target:phase?.wbs, detail:`eliminó la fase "${phase?.title}"`}, ...s.log].slice(0,80),
      };
    });
  }, []);

  const updateProject = useCallback((patch) => {
    setState(s => ({ ...s, ...patch }));
  }, []);

  const importState = useCallback((next) => {
    setState(next);
  }, []);

  return {
    state, setState, saveStatus, stats,
    updateTask, addTask, removeTask, addPhase, togglePhase, updatePhase, removePhase, updateProject, addLog, importState,
    cloud, onlineUsers, currentUserId, setIdentity, needIdentity,
  };
}

// === responsables (multi, con compatibilidad hacia atrás) ===
function getResp(task) {
  if (Array.isArray(task.responsibles) && task.responsibles.length) return task.responsibles;
  if (task.responsible) return [task.responsible];
  return [];
}

// === sedes (colegios) ===
const SEDES = [
  { id: 'pen', nm: 'Peñalolén', short: 'PEÑ', color: '#2A6FB5' },
  { id: 'tob', nm: 'Tobalaba',  short: 'TOB', color: '#E0992E' },
];

// avance diferenciado por sede (con compatibilidad: si solo existe
// "progress", ambas sedes parten con ese valor)
function getProg(task) {
  const base = typeof task.progress === 'number' ? task.progress : 0;
  const pen = typeof task.progPen === 'number' ? task.progPen : base;
  const tob = typeof task.progTob === 'number' ? task.progTob : base;
  return { pen, tob, avg: Math.round((pen + tob) / 2) };
}

// fechas por sede (con compatibilidad: si no hay fechas separadas usa las compartidas)
function getDates(task, sede) {
  if (task.splitDates) {
    if (sede === 'pen') return { start: task.startPen || task.start, end: task.endPen || task.end };
    if (sede === 'tob') return { start: task.startTob || task.start, end: task.endTob || task.end };
  }
  return { start: task.start, end: task.end };
}

// rango envolvente (la fecha más temprana y la más tardía entre ambas sedes)
function getEnvelope(task) {
  if (!task.splitDates) return { start: task.start, end: task.end };
  const p = getDates(task, 'pen'), t = getDates(task, 'tob');
  const start = (parseISO(p.start) <= parseISO(t.start)) ? p.start : t.start;
  const end = (parseISO(p.end) >= parseISO(t.end)) ? p.end : t.end;
  return { start, end };
}

// === relative time ===
function relTime(ts) {
  const diff = Math.round((Date.now() - ts) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)} h`;
  return `hace ${Math.floor(diff/86400)} d`;
}

// === ICONOS (SVG inline pequeños) ===
const Icon = {
  Panel: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  Gantt: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="14" y2="6"/><line x1="7" y1="12" x2="19" y2="12"/><line x1="10" y1="18" x2="17" y2="18"/></svg>,
  Team: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Metrics: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Book: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Download: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Plus: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>,
  Chevron: ({open, size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s'}}><polyline points="9 18 15 12 9 6"/></svg>,
  Sparkles: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.7L20 11l-6.1 1.3L12 19l-1.9-6.7L4 11l6.1-2.3L12 3z"/></svg>,
  Filter: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Calendar: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Save: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  X: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Print: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  Share: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Flag: ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
};

window.Icon = Icon;
window.PHASE_PALETTE = PHASE_PALETTE;
window.TEAM = TEAM;
window.PROJECT_START = PROJECT_START;
window.PROJECT_WEEKS = PROJECT_WEEKS;
window.DAY_LABELS = DAY_LABELS;
window.ACTION_LABELS = ACTION_LABELS;
window.parseISO = parseISO;
window.fmtISO = fmtISO;
window.fmtDM = fmtDM;
window.fmtFull = fmtFull;
window.addDays = addDays;
window.diffDays = diffDays;
window.workdays = workdays;
window.isWeekend = isWeekend;
window.buildCalendar = buildCalendar;
window.useStore = useStore;
window.relTime = relTime;
window.getResp = getResp;
window.SEDES = SEDES;
window.getProg = getProg;
window.getDates = getDates;
window.getEnvelope = getEnvelope;
