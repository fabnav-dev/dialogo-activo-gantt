/* === gantt.jsx — vista principal con tabla editable + timeline === */

const DAY_W_BY_VIEW = { day: 32, week: 22, month: 11 };
const ROW_H = 44;

function progressClass(p) {
  if (p >= 100) return 'done';
  if (p >= 70) return 'hi';
  if (p >= 30) return 'mid';
  if (p > 0) return 'lo';
  return 'none';
}

function dayIndexFrom(startISO, isoDate) {
  return diffDays(parseISO(startISO), parseISO(isoDate));
}

function TaskBar({ task, phaseIdx, startISO, totalDays, onPatch, color, soft, onEdit, dayW }) {
  const dragState = useRef(null);
  const [drag, setDrag] = useState(null);

  if (task.milestone) {
    const dx = dayIndexFrom(startISO, task.start);
    return (
      <>
        <div
          className="tl-milestone"
          style={{ left: dx * dayW + dayW/2 }}
          onClick={onEdit}
          title={`${task.title} · ${fmtFull(task.start)}`}
        />
        <div className="tl-milestone-label" style={{ left: dx * dayW + dayW/2 + 4 }}>
          {task.title}
        </div>
      </>
    );
  }

  const startI = dayIndexFrom(startISO, task.start);
  const endI   = dayIndexFrom(startISO, task.end);
  const days   = endI - startI + 1;

  const effectiveStart = drag?.start ?? startI;
  const effectiveDays  = drag?.days ?? days;

  const left = effectiveStart * dayW;
  const width = effectiveDays * dayW;

  const beginDrag = (mode) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragState.current = {
      mode,
      startX: e.clientX,
      origStart: startI,
      origDays: days,
    };
    const move = (ev) => {
      const ds = dragState.current;
      const deltaDays = Math.round((ev.clientX - ds.startX) / dayW);
      if (ds.mode === 'move') {
        setDrag({ start: Math.max(0, Math.min(totalDays - ds.origDays, ds.origStart + deltaDays)), days: ds.origDays });
      } else if (ds.mode === 'left') {
        const newStart = Math.max(0, Math.min(ds.origStart + ds.origDays - 1, ds.origStart + deltaDays));
        const newDays = ds.origStart + ds.origDays - newStart;
        setDrag({ start: newStart, days: newDays });
      } else if (ds.mode === 'right') {
        const newDays = Math.max(1, ds.origDays + deltaDays);
        setDrag({ start: ds.origStart, days: newDays });
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const final = dragState.current;
      if (drag) {
        const newStart = fmtISO(addDays(parseISO(startISO), drag.start));
        const newEnd   = fmtISO(addDays(parseISO(startISO), drag.start + drag.days - 1));
        if (newStart !== task.start || newEnd !== task.end) {
          onPatch({ start: newStart, end: newEnd });
        }
      }
      dragState.current = null;
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const pct = task.progress || 0;
  const barColor = pct >= 100 ? '#2EB77E' : color;

  return (
    <div
      className="tl-bar"
      style={{
        left,
        width,
        background: `linear-gradient(180deg, ${barColor} 0%, ${shadeColor(barColor, -12)} 100%)`,
      }}
      onPointerDown={beginDrag('move')}
      onClick={(e) => { if (!drag) onEdit && onEdit(); }}
      title={`${task.title} · ${fmtFull(task.start)} → ${fmtFull(task.end)}`}
    >
      <div className="resize-handle l" onPointerDown={beginDrag('left')} />
      <div className="fill" style={{ width: `${pct}%` }} />
      <span className="label">{task.title}</span>
      <span className="pct">{pct}%</span>
      <div className="resize-handle r" onPointerDown={beginDrag('right')} />
    </div>
  );
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#',''), 16);
  let r = (num >> 16) + Math.round(2.55 * percent);
  let g = ((num >> 8) & 0xff) + Math.round(2.55 * percent);
  let b = (num & 0xff) + Math.round(2.55 * percent);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
}

function PhaseBar({ phase, startISO, color, dayW }) {
  const tasks = phase.tasks.filter(t => !t.milestone);
  if (!tasks.length) return null;
  const starts = tasks.map(t => dayIndexFrom(startISO, t.start));
  const ends   = tasks.map(t => dayIndexFrom(startISO, t.end));
  const s = Math.min(...starts);
  const e = Math.max(...ends);
  const left = s * dayW;
  const width = (e - s + 1) * dayW;
  const avg = tasks.length ? Math.round(tasks.reduce((a,t)=>a+t.progress,0)/tasks.length) : 0;
  return (
    <div className="tl-bar phase" style={{ left, width }}>
      <div className="fill" style={{ width: `${avg}%` }} />
      <span className="label">{phase.title}</span>
      <span className="pct">{avg}%</span>
    </div>
  );
}

function ResponsiblePicker({ value, onChange, compact }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const ids = value || [];
  const members = ids.map(id => TEAM.find(t => t.id === id)).filter(Boolean);

  const openPop = () => {
    if (open) { setOpen(false); return; }
    const r = ref.current.getBoundingClientRect();
    const popH = Math.min(48 + TEAM.length * 42, 300);
    const below = window.innerHeight - r.bottom;
    const dropUp = below < popH + 12 && r.top > popH + 12;
    setPos({
      left: Math.min(r.left, window.innerWidth - 250),
      top: dropUp ? undefined : r.bottom + 4,
      bottom: dropUp ? (window.innerHeight - r.top + 4) : undefined,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest('.resp-pop')) setOpen(false); };
    const onScroll = (e) => { if (e.target && e.target.closest && e.target.closest('.resp-pop')) return; setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);

  const toggle = (id) => {
    const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
    onChange(next.length ? next : [id]);
  };

  const shown = members.slice(0, 3);
  const extra = members.length - shown.length;

  return (
    <div className="resp-picker" ref={ref}>
      <button type="button" className="resp-trigger" onClick={openPop} title={members.map(m => m.nm).join(', ')}>
        <span className="resp-avstack">
          {shown.map((m, i) => (
            <span key={m.id} className="av" style={{ background: m.color, zIndex: 10 - i }}>{m.init}</span>
          ))}
          {extra > 0 && <span className="av more">+{extra}</span>}
          {members.length === 0 && <span className="av" style={{ background: 'var(--text-3)' }}>?</span>}
        </span>
        {!compact && (
          <span className="resp-names">
            {members.length === 1 ? members[0].nm
              : members.length > 1 ? `${members.length} responsables`
              : 'Sin asignar'}
          </span>
        )}
        <svg className="resp-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && pos && ReactDOM.createPortal(
        <div className="resp-pop" style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom }} onMouseDown={(e) => e.stopPropagation()}>
          <div className="resp-pop-head">Responsables · {ids.length} seleccionados</div>
          <div className="resp-pop-list">
            {TEAM.map(m => {
              const checked = ids.includes(m.id);
              return (
                <button type="button" key={m.id} className={`resp-opt ${checked ? 'on' : ''}`} onClick={() => toggle(m.id)}>
                  <span className="resp-check">
                    {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </span>
                  <span className="av" style={{ background: m.color }}>{m.init}</span>
                  <span className="resp-opt-name">{m.nm}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function GanttView({ store, onOpenAi, onOpenExport }) {
  const { state, stats, updateTask, addTask, removeTask, addPhase, togglePhase, updatePhase, removePhase, updateProject } = store;
  const [view, setView] = useState('week'); // day | week | month
  const dayW = DAY_W_BY_VIEW[view];
  const [filter, setFilter] = useState('all');

  const calendar = useMemo(() => buildCalendar(state.startDate, PROJECT_WEEKS), [state.startDate]);
  const allDays = calendar.flat();
  const totalDays = allDays.length;
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayOffset = diffDays(parseISO(state.startDate), today);
  const todayVisible = todayOffset >= 0 && todayOffset < totalDays;

  // build column template for grids
  const colTemplate = `repeat(${totalDays}, ${dayW}px)`;

  // months span
  const monthBlocks = useMemo(() => {
    const blocks = [];
    let cur = null;
    allDays.forEach((d, i) => {
      const key = `${d.date.getFullYear()}-${d.date.getMonth()}`;
      if (!cur || cur.key !== key) {
        cur = { key, label: d.date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric'}), span: 0 };
        blocks.push(cur);
      }
      cur.span++;
    });
    return blocks;
  }, [allDays]);

  const phasesRendered = state.phases;

  // task editor modal
  const [editing, setEditing] = useState(null);

  return (
    <>
      <div className="gantt-card">
        {/* TOOLBAR */}
        <div className="gantt-toolbar">
          <div className="gantt-info">
            <div className="gantt-info-item">
              <label>Proyecto</label>
              <input
                value={state.projectTitle}
                onChange={(e) => updateProject({ projectTitle: e.target.value })}
              />
            </div>
            <div className="gantt-info-item">
              <label>Responsable</label>
              <div style={{marginTop: 2, minWidth: 200}}>
                <ResponsiblePicker
                  value={state.projectResp && state.projectResp.length ? state.projectResp : ['ep']}
                  onChange={(arr) => updateProject({
                    projectResp: arr,
                    responsible: arr.map(id => TEAM.find(t => t.id === id)?.nm).filter(Boolean).join(' · '),
                  })}
                />
              </div>
            </div>
            <div className="gantt-info-item">
              <label>Inicio</label>
              <span className="v" style={{padding:'4px 0', fontFamily:'JetBrains Mono', fontSize:13}}>{fmtFull(state.startDate)}</span>
            </div>
            <div className="gantt-info-item">
              <label>Duración</label>
              <span className="v" style={{padding:'4px 0'}}>{PROJECT_WEEKS} semanas</span>
            </div>
            <div className="gantt-info-item">
              <label>Avance global</label>
              <span className="v" style={{padding:'4px 0', color: '#2EB77E'}}>{stats.avgProgress}%</span>
            </div>
          </div>
          <div className="gantt-spacer" />
          <div className="seg">
            <button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>Días</button>
            <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Semanas</button>
            <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Meses</button>
          </div>
          <button className="btn gold" onClick={() => addPhase()}>
            <Icon.Plus size={14} />
            Nueva fase
          </button>
        </div>

        {/* BODY */}
        <div className="gantt-body">
          {/* LEFT: tabla editable */}
          <div className="gantt-left">
            <div className="gantt-header-left">
              <div></div>
              <div className="col-task">Tarea</div>
              <div>Responsable</div>
              <div>Inicio</div>
              <div>Término</div>
              <div>Días</div>
              <div>% Avance</div>
            </div>
            {phasesRendered.map((phase, pi) => {
              const palette = PHASE_PALETTE[pi % PHASE_PALETTE.length];
              return (
                <React.Fragment key={phase.id}>
                  <div className="gantt-row-left is-phase">
                    <div onClick={() => togglePhase(phase.id)} style={{cursor:'pointer'}}>
                      <Icon.Chevron open={phase.expanded} size={14} />
                    </div>
                    <div className="gantt-task-title is-phase">
                      <span className="phase-dot" style={{background: palette.bar}}/>
                      <input
                        value={phase.title}
                        onChange={(e) => updatePhase(phase.id, { title: e.target.value })}
                        placeholder="Nombre de la fase"
                      />
                    </div>
                    <div style={{fontSize:11, color:'var(--text-2)'}}>{phase.tasks.length} tareas</div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div>
                      <PhaseProgressChip phase={phase}/>
                    </div>
                    <button
                      className="row-del"
                      title="Eliminar fase y sus tareas"
                      onClick={(e) => { e.stopPropagation(); if (confirm(`¿Eliminar la fase "${phase.title}" y sus ${phase.tasks.length} tareas?`)) removePhase(phase.id); }}
                    >
                      <Icon.Trash size={14}/>
                    </button>
                  </div>
                  {phase.expanded && phase.tasks.map(task => (
                    <TaskRowLeft
                      key={task.id}
                      task={task}
                      phase={phase}
                      palette={palette}
                      onPatch={(patch) => updateTask(phase.id, task.id, patch)}
                      onRemove={() => removeTask(phase.id, task.id)}
                      onEdit={() => setEditing({ phaseId: phase.id, task })}
                    />
                  ))}
                  {phase.expanded && (
                    <div className="gantt-addrow" onClick={() => addTask(phase.id)}>
                      <div></div>
                      <div style={{display:'flex',alignItems:'center',gap:6, gridColumn:'2 / -1'}}>
                        <Icon.Plus size={13}/> Agregar tarea
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            <div className="gantt-addrow phase" onClick={() => addPhase()}>
              <div></div>
              <div style={{display:'flex',alignItems:'center',gap:7, gridColumn:'2 / -1'}}>
                <Icon.Plus size={14}/> Agregar fase
              </div>
            </div>
          </div>

          {/* RIGHT: timeline */}
          <div className="gantt-right">
            <div className="gantt-timeline" style={{ width: totalDays * dayW }}>
              {/* HEADER */}
              <div className="gantt-header-right">
                <div className="tl-phase-row" style={{ gridTemplateColumns: monthBlocks.map(b => `${b.span * dayW}px`).join(' ') }}>
                  {monthBlocks.map(b => <div key={b.key}>{b.label}</div>)}
                </div>
                <div className="tl-week-row" style={{ gridTemplateColumns: `repeat(${PROJECT_WEEKS}, ${7*dayW}px)` }}>
                  {Array.from({length: PROJECT_WEEKS}, (_,i) => <div key={i}>SEMANA {i+1}</div>)}
                </div>
                <div className="tl-day-row" style={{ gridTemplateColumns: colTemplate }}>
                  {allDays.map((d, i) => (
                    <div key={i} className={d.weekend ? 'weekend' : ''}>{d.label}</div>
                  ))}
                </div>
              </div>

              {/* ROWS */}
              <div className="tl-rows" style={{ position: 'relative' }}>
                {todayVisible && (
                  <div className="tl-today" style={{ left: todayOffset * dayW + dayW/2 }} />
                )}
                {phasesRendered.map((phase, pi) => {
                  const palette = PHASE_PALETTE[pi % PHASE_PALETTE.length];
                  return (
                    <React.Fragment key={phase.id}>
                      <div className="tl-row is-phase" style={{ gridTemplateColumns: colTemplate, position: 'relative' }}>
                        {allDays.map((d, i) => (
                          <div key={i} className={`cell ${d.weekend ? 'weekend':''} ${i===todayOffset?'today':''}`} />
                        ))}
                        <PhaseBar phase={phase} startISO={state.startDate} color={palette.bar} dayW={dayW}/>
                      </div>
                      {phase.expanded && phase.tasks.map(task => (
                        <div key={task.id} className="tl-row" style={{ gridTemplateColumns: colTemplate, position: 'relative' }}>
                          {allDays.map((d, i) => (
                            <div key={i} className={`cell ${d.weekend ? 'weekend':''} ${i===todayOffset?'today':''}`} />
                          ))}
                          <TaskBar
                            task={task}
                            phaseIdx={pi}
                            startISO={state.startDate}
                            totalDays={totalDays}
                            color={palette.bar}
                            soft={palette.soft}
                            onPatch={(patch) => updateTask(phase.id, task.id, patch)}
                            onEdit={() => setEditing({ phaseId: phase.id, task })}
                                      dayW={dayW}
                          />
                        </div>
                      ))}
                      {phase.expanded && (
                        <div className="tl-row" style={{ height: 40, gridTemplateColumns: colTemplate }}>
                          {allDays.map((d, i) => (
                            <div key={i} className={`cell ${d.weekend ? 'weekend':''} ${i===todayOffset?'today':''}`} />
                          ))}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* LEGEND */}
        <div className="gantt-legend">
          <span className="legend-item"><span className="legend-swatch" style={{background:'#1B3358'}}/>Fase</span>
          {PHASE_PALETTE.slice(0,3).map((p,i) => (
            <span key={i} className="legend-item">
              <span className="legend-swatch" style={{background: p.bar}}/>
              Tarea fase {i+1}
            </span>
          ))}
          <span className="legend-item"><span className="legend-swatch" style={{background:'#2EB77E'}}/>Completada</span>
          <span className="legend-item">
            <span className="legend-swatch" style={{background:'var(--yellow)', transform:'rotate(45deg)', width:10, height:10}}/>
            Hito
          </span>
          <span className="legend-item"><span className="legend-swatch" style={{background:'var(--red)', width: 2, height: 14}}/>Hoy</span>
          <div style={{flex:1}}/>
          <span style={{color:'var(--text-3)'}}>Tip: arrastra las barras para mover · arrastra los bordes para extender</span>
        </div>
      </div>

      {editing && (
        <TaskEditor
          task={editing.task}
          phaseId={editing.phaseId}
          onClose={() => setEditing(null)}
          onPatch={(patch) => updateTask(editing.phaseId, editing.task.id, patch)}
          onRemove={() => { removeTask(editing.phaseId, editing.task.id); setEditing(null); }}
        />
      )}
    </>
  );
}

function PhaseProgressChip({ phase }) {
  const tasks = phase.tasks.filter(t => !t.milestone);
  const avg = tasks.length ? Math.round(tasks.reduce((a,t)=>a+t.progress,0)/tasks.length) : 0;
  return <span className={`progress-chip ${progressClass(avg)}`}>{avg}%</span>;
}

function TaskRowLeft({ task, phase, palette, onPatch, onRemove, onEdit }) {
  const respIds = getResp(task);
  const member = TEAM.find(t => t.id === respIds[0]) || TEAM[0];
  const days = workdays(task.start, task.end);
  if (task.milestone) {
    return (
      <div className="gantt-row-left">
        <div></div>
        <div className="gantt-task-title">
          <span style={{display:'inline-block', width:10, height:10, background:'var(--yellow)', transform:'rotate(45deg)', border:'1.5px solid var(--navy)'}}/>
          <input
            value={task.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            placeholder="Hito"
          />
        </div>
        <div className="gantt-resp">
          <ResponsiblePicker compact value={respIds} onChange={(arr) => onPatch({ responsibles: arr, responsible: arr[0] })} />
        </div>
        <div className="gantt-date">
          <input type="date" value={task.start} onChange={(e) => onPatch({ start: e.target.value, end: e.target.value })}/>
        </div>
        <div className="gantt-date" style={{color:'var(--text-3)'}}>—</div>
        <div className="gantt-dur" title="Hito"><Icon.Flag size={12}/></div>
        <div><span className="progress-chip done">HITO</span></div>
        <button className="row-del" title={`Eliminar hito ${task.wbs}`} onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          <Icon.Trash size={14}/>
        </button>
      </div>
    );
  }
  return (
    <div className="gantt-row-left">
      <div style={{fontSize:11, color:'var(--text-3)', fontFamily:'JetBrains Mono'}}>{task.wbs}</div>
      <div className="gantt-task-title">
        <span className="phase-dot" style={{background: palette.bar, opacity: .8}}/>
        <input
          value={task.title}
          onChange={(e) => onPatch({ title: e.target.value })}
        />
      </div>
      <div className="gantt-resp">
        <ResponsiblePicker compact value={respIds} onChange={(arr) => onPatch({ responsibles: arr, responsible: arr[0] })} />
      </div>
      <div className="gantt-date">
        <input type="date" value={task.start} onChange={(e) => onPatch({ start: e.target.value })} />
      </div>
      <div className="gantt-date">
        <input type="date" value={task.end} onChange={(e) => onPatch({ end: e.target.value })} />
      </div>
      <div className="gantt-dur">{days}d</div>
      <div onClick={onEdit} style={{cursor:'pointer'}}>
        <span className={`progress-chip ${progressClass(task.progress)}`}>{task.progress}%</span>
      </div>
      <button className="row-del" title={`Eliminar tarea ${task.wbs}`} onClick={(e) => { e.stopPropagation(); onRemove(); }}>
        <Icon.Trash size={14}/>
      </button>
    </div>
  );
}

function TaskEditor({ task, phaseId, onClose, onPatch, onRemove }) {
  const [local, setLocal] = useState(task);
  useEffect(() => { setLocal(task); }, [task.id]);
  const save = () => {
    onPatch(local);
    onClose();
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <h3>{task.milestone ? 'Editar hito' : 'Editar tarea'}</h3>
              <p>EDT {task.wbs} · {task.milestone ? 'Marcador de avance' : 'Tarea programada'}</p>
            </div>
            <button className="btn-icon" onClick={onClose}><Icon.X /></button>
          </div>
        </header>
        <div className="modal-body">
          <div className="field">
            <label>Título</label>
            <input value={local.title} onChange={(e) => setLocal({...local, title: e.target.value})} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Responsables</label>
              <ResponsiblePicker
                value={getResp(local)}
                onChange={(arr) => setLocal({...local, responsibles: arr, responsible: arr[0]})}
              />
            </div>
            <div className="field">
              <label>Avance</label>
              <input type="range" min="0" max="100" step="5" value={local.progress}
                onChange={(e) => setLocal({...local, progress: Number(e.target.value)})}/>
              <div style={{fontFamily:'JetBrains Mono', fontSize:13, fontWeight:700, color:'var(--navy)', marginTop:4}}>{local.progress}%</div>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Inicio</label>
              <input type="date" value={local.start} onChange={(e) => setLocal({...local, start: e.target.value})} />
            </div>
            {!task.milestone && (
              <div className="field">
                <label>Término</label>
                <input type="date" value={local.end} onChange={(e) => setLocal({...local, end: e.target.value})} />
              </div>
            )}
          </div>
          <div className="field">
            <label>Notas</label>
            <textarea rows="3" placeholder="Observaciones, dependencias, acuerdos del equipo…"
              value={local.notes || ''} onChange={(e) => setLocal({...local, notes: e.target.value})}/>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn danger" onClick={onRemove}><Icon.Trash size={14}/> Eliminar</button>
          <div style={{flex:1}}/>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={save}><Icon.Save size={14}/> Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}

window.GanttView = GanttView;
window.TaskEditor = TaskEditor;
