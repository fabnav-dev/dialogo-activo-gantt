/* === bitacora.jsx — historial, modales de IA y export === */

function BitacoraView({ store }) {
  const { state } = store;
  const [filter, setFilter] = useState('all');
  const filtered = state.log.filter(e => filter === 'all' || e.action === filter);
  return (
    <div>
      <div className="dh-section-title">
        <span className="pre">Bitácora</span>
        <h2>Historial completo</h2>
        <div className="dh-section-underline"/>
        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
          <select className="btn" style={{padding:'8px 10px'}} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Todas las acciones</option>
            <option value="updated_progress">Avances</option>
            <option value="edited_task">Ediciones</option>
            <option value="added_task">Tareas nuevas</option>
            <option value="commented">Comentarios</option>
            <option value="created_phase">Fases</option>
          </select>
        </div>
      </div>

      <div className="card-block">
        <div className="card-block-body" style={{padding:'4px 24px'}}>
          {filtered.length === 0 && <div className="empty-state"><h3>Sin movimientos</h3><p>No hay actividad para este filtro.</p></div>}
          {filtered.map(entry => {
            const user = TEAM.find(t => t.id === entry.user) || TEAM[0];
            return (
              <div className="log-item" key={entry.id}>
                <span className="av" style={{background: user.color}}>{user.init}</span>
                <div className="txt">
                  <strong>{user.nm}</strong> {ACTION_LABELS[entry.action]} {entry.target && <span className="tag">EDT {entry.target}</span>}
                  <div style={{color:'var(--text-2)', fontSize:12.5, marginTop:3}}>{entry.detail}</div>
                </div>
                <div className="when">{relTime(entry.when)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// === IA Sugerencias ===
function AiSuggestModal({ onClose, store, onAddTasks }) {
  const [phase, setPhase] = useState(store.state.phases[0]?.title || '');
  const [context, setContext] = useState('Acompañamiento socioemocional de estudiantes de Tercer Ciclo (1° a 4° medio) en el marco del Plan Diálogo activo.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const ask = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const prompt = `Eres asistente de planificación de proyectos educativos en Chile. Sugiere entre 4 y 6 tareas concretas y accionables para la fase "${phase}" de un proyecto escolar. Contexto: ${context}.
Responde EXCLUSIVAMENTE con JSON válido sin texto adicional, con esta forma:
{"tasks":[{"title":"...","days":N,"responsible":"UTP|Orientación|Convivencia|Tutor|TIC"}]}
- "days" es la duración estimada en días hábiles (entre 2 y 10).
- "title" debe ser corto (máx 7 palabras) y específico al contexto escolar chileno.`;
      const txt = await window.claude.complete(prompt);
      const match = txt.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Respuesta sin JSON');
      const json = JSON.parse(match[0]);
      setResult(json);
    } catch (e) {
      setError(e.message || 'No se pudo generar.');
    } finally {
      setLoading(false);
    }
  };

  const addAll = () => {
    if (!result?.tasks) return;
    const targetPhase = store.state.phases.find(p => p.title === phase);
    if (!targetPhase) return;
    // we'll add tasks one by one with computed dates
    let cursor = targetPhase.tasks.length ? parseISO(targetPhase.tasks[targetPhase.tasks.length-1].end) : parseISO(store.state.startDate);
    const respMap = {
      'UTP': 'ep', 'Orientación': 'cl', 'Convivencia': 'nc', 'Tutor': 'ct', 'TIC': 'mr'
    };
    result.tasks.forEach((t, i) => {
      const start = addDays(cursor, 1);
      const end = addDays(start, Math.max(1, (t.days || 5)) - 1);
      cursor = end;
      store.setState(s => ({
        ...s,
        phases: s.phases.map(p => p.id === targetPhase.id ? {
          ...p,
          tasks: [...p.tasks, {
            id: 't' + Math.random().toString(36).slice(2,8),
            wbs: `${p.wbs}.${p.tasks.length + i + 1}`,
            title: t.title,
            responsible: respMap[t.responsible] || 'ep',
            start: fmtISO(start),
            end: fmtISO(end),
            progress: 0,
          }]
        } : p),
        log: [{id:'l'+Math.random().toString(36).slice(2,7), when:Date.now(), user:'ep', action:'added_task', target:`${p.wbs}.${p.tasks.length + i + 1}`.replace('p', 'IA'), detail:`IA agregó "${t.title}"`}, ...s.log].slice(0,80),
      }));
    });
    onClose();
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <h3 style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{color:'var(--yellow-2)'}}><Icon.Sparkles/></span>
                Asistente IA · Sugerir tareas
              </h3>
              <p>Genera tareas concretas para una fase a partir del contexto del proyecto.</p>
            </div>
            <button className="btn-icon" onClick={onClose}><Icon.X /></button>
          </div>
        </header>
        <div className="modal-body">
          <div className="field">
            <label>Fase a poblar</label>
            <select value={phase} onChange={(e) => setPhase(e.target.value)}>
              {store.state.phases.map(p => <option key={p.id} value={p.title}>{p.title}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Contexto del proyecto</label>
            <textarea rows="3" value={context} onChange={(e) => setContext(e.target.value)} />
          </div>
          {!result && !loading && (
            <div className="ai-suggest">
              <h4><span className="spark"><Icon.Sparkles size={14}/></span> ¿Qué hace este asistente?</h4>
              <p style={{margin:'6px 0 0', fontSize:12.5, color:'var(--text-2)'}}>Propone entre 4 y 6 tareas con duraciones estimadas y responsable sugerido del equipo. Tú decides cuáles agregar.</p>
            </div>
          )}
          {loading && (
            <div className="ai-suggest">
              <h4><span className="spark"><Icon.Sparkles size={14}/></span> Generando sugerencias…</h4>
              <p style={{margin:'6px 0 0', fontSize:12.5, color:'var(--text-2)'}}>La IA está pensando tareas alineadas a la fase seleccionada.</p>
            </div>
          )}
          {error && (
            <div className="ai-suggest" style={{background:'var(--red-soft)', borderColor:'#E5B0B0'}}>
              <h4 style={{color:'var(--red)'}}>No se pudo generar</h4>
              <p style={{margin:'6px 0 0', fontSize:12.5}}>{error}</p>
            </div>
          )}
          {result && (
            <div className="ai-suggest">
              <h4><span className="spark"><Icon.Sparkles size={14}/></span> {result.tasks?.length || 0} tareas sugeridas</h4>
              <ul>
                {result.tasks?.map((t, i) => (
                  <li key={i}><strong>{t.title}</strong> — {t.days} días · {t.responsible}</li>
                ))}
              </ul>
              <div className="actions">
                <button className="btn ghost" onClick={ask}>↻ Regenerar</button>
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          {!result
            ? <button className="btn primary" onClick={ask} disabled={loading}>
                <Icon.Sparkles size={14}/> {loading ? 'Generando…' : 'Generar sugerencias'}
              </button>
            : <button className="btn gold" onClick={addAll}>
                <Icon.Plus size={14}/> Agregar {result.tasks?.length} tareas
              </button>
          }
        </div>
      </div>
    </div>
  );
}

// === Export ===
function ExportModal({ onClose, store, showToast }) {
  const csv = () => {
    const rows = [['EDT', 'Tarea', 'Responsable(s)', 'Inicio', 'Término', 'Días', '% Peñalolén', '% Tobalaba', 'Fechas por sede', 'Fase']];
    store.state.phases.forEach(p => {
      p.tasks.forEach(t => {
        const names = getResp(t).map(id => TEAM.find(x => x.id === id)?.nm).filter(Boolean).join(' / ');
        const pr = getProg(t);
        const env = getEnvelope(t);
        const detalle = t.splitDates
          ? `Peñalolén ${getDates(t,'pen').start}→${getDates(t,'pen').end} · Tobalaba ${getDates(t,'tob').start}→${getDates(t,'tob').end}`
          : '';
        rows.push([t.wbs, t.title, names, env.start, env.end, workdays(env.start, env.end), pr.pen, pr.tob, detalle, p.title]);
      });
    });
    const out = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + out], { type: 'text/csv;charset=utf-8' });
    download(blob, `dialogo-activo-gantt-${fmtISO(new Date())}.csv`);
    showToast('CSV exportado');
    onClose();
  };
  const json = () => {
    const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' });
    download(blob, `dialogo-activo-gantt-${fmtISO(new Date())}.json`);
    showToast('Respaldo JSON guardado');
    onClose();
  };
  const print = () => {
    onClose();
    // espera a que el modal se desmonte antes de abrir el diálogo de impresión
    setTimeout(() => window.print(), 250);
  };
  const fileRef = useRef(null);
  const importJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.phases || !Array.isArray(data.phases)) throw new Error('formato');
        store.importState({ ...data, savedAt: Date.now() });
        showToast('Respaldo importado correctamente');
        onClose();
      } catch {
        showToast('Archivo no válido');
      }
    };
    reader.readAsText(file);
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{width: 480}}>
        <header>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <h3>Exportar e importar</h3>
              <p>Comparte, respalda o restaura el estado del proyecto.</p>
            </div>
            <button className="btn-icon" onClick={onClose}><Icon.X /></button>
          </div>
        </header>
        <div className="modal-body">
          <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--text-3)', margin:'2px 0 10px'}}>Exportar</div>
          <ExportOption icon={<Icon.Download/>} title="Planilla CSV" desc="Compatible con Excel y Google Sheets" onClick={csv}/>
          <ExportOption icon={<Icon.Save/>} title="Respaldo JSON" desc="Estado completo · re-importable" onClick={json}/>
          <ExportOption icon={<Icon.Print/>} title="Imprimir o PDF" desc="Vista lista para imprimir / guardar como PDF" onClick={print}/>
          <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--text-3)', margin:'16px 0 10px'}}>Importar</div>
          <ExportOption icon={<Icon.Save/>} title="Restaurar desde respaldo JSON" desc="Carga un archivo .json y reemplaza el estado actual" onClick={() => fileRef.current?.click()}/>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{display:'none'}} onChange={importJson} />
          <p style={{fontSize:11.5, color:'var(--text-2)', margin:'4px 2px 0', lineHeight:1.5}}>
            Tip: una persona exporta el respaldo JSON, lo comparte por correo o Drive, y el resto lo importa aquí. Es el flujo manual mientras la edición en la nube no esté conectada.
          </p>
        </div>
      </div>
    </div>
  );
}

function ExportOption({ icon, title, desc, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', display:'flex', alignItems:'center', gap:14,
      padding:'14px 16px', borderRadius:12, border:'1px solid var(--border)',
      background:'white', textAlign:'left', cursor:'pointer', marginBottom:10,
      transition: 'all .15s'
    }}
    onMouseEnter={e => { e.currentTarget.style.background='var(--bg)'; e.currentTarget.style.borderColor='var(--border-2)'; }}
    onMouseLeave={e => { e.currentTarget.style.background='white'; e.currentTarget.style.borderColor='var(--border)'; }}>
      <span style={{width:40, height:40, borderRadius:10, background:'var(--bg)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--navy)'}}>{icon}</span>
      <div style={{flex:1}}>
        <div style={{fontWeight:700, fontSize:14}}>{title}</div>
        <div style={{fontSize:12, color:'var(--text-2)', marginTop:2}}>{desc}</div>
      </div>
      <span style={{color:'var(--text-3)'}}>→</span>
    </button>
  );
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// === Share ===
function ShareModal({ onClose, showToast }) {
  const link = window.location.href;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{width: 480}}>
        <header>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <h3>Compartir con el equipo</h3>
              <p>Cualquier persona del Colegio Mayor con el enlace puede ver y editar.</p>
            </div>
            <button className="btn-icon" onClick={onClose}><Icon.X /></button>
          </div>
        </header>
        <div className="modal-body">
          <div className="field">
            <label>Enlace del proyecto</label>
            <div style={{display:'flex', gap:8}}>
              <input value={link} readOnly />
              <button className="btn primary" onClick={() => {
                navigator.clipboard.writeText(link);
                showToast('Enlace copiado');
              }}>Copiar</button>
            </div>
          </div>
          <div className="ai-suggest" style={{background: 'var(--bg-2)', borderColor: 'var(--border)'}}>
            <h4 style={{color:'var(--navy)'}}>Permiso predeterminado</h4>
            <p style={{margin:'6px 0 0', fontSize:12.5, color:'var(--text-2)'}}>
              <strong>Editor</strong> · todo el equipo de UTP, Orientación y Convivencia puede modificar tareas, fechas y avances. Los cambios se sincronizan automáticamente y quedan en la bitácora.
            </p>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

window.BitacoraView = BitacoraView;
window.AiSuggestModal = AiSuggestModal;
window.ExportModal = ExportModal;
window.ShareModal = ShareModal;
