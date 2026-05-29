/* === panel.jsx — Dashboard general (KPIs, anillo, próximas tareas) === */

function Ring({ value, size=140, stroke=14, color='#2EB77E' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value/100) * c;
  return (
    <div className="ring" style={{width:size, height:size}}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#E1E6EE" strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.2,.9,.3,1)'}}/>
      </svg>
      <div className="ring-center">
        <div className="v">{value}%</div>
        <div className="l">Avance global</div>
      </div>
    </div>
  );
}

function PanelView({ store, onGoGantt }) {
  const { state, stats } = store;

  // próximas tareas
  const upcoming = useMemo(() => {
    const all = state.phases.flatMap((p, pi) =>
      p.tasks.map(t => ({ ...t, phase: p, phaseIdx: pi }))
    );
    const today = new Date(); today.setHours(0,0,0,0);
    return all
      .filter(t => t.progress < 100)
      .map(t => ({ ...t, startDate: parseISO(t.start) }))
      .sort((a,b) => a.startDate - b.startDate)
      .slice(0, 6);
  }, [state.phases]);

  // riesgo: atrasadas
  const atrasadas = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return state.phases.flatMap(p => p.tasks).filter(t => !t.milestone && parseISO(t.end) < today && t.progress < 100).length;
  }, [state.phases]);

  return (
    <div>
      {/* KPIs */}
      <div className="panel-grid">
        <Kpi label="Tareas totales" value={stats.total} foot={<>{stats.done} completadas · {stats.inProgress} en curso</>} ribbon="b2"/>
        <Kpi label="Avance promedio" value={`${stats.avgProgress}%`} foot={<span className="kpi-accent">+{Math.max(2, Math.round(stats.avgProgress/8))}% esta semana</span>} ribbon="b3"/>
        <Kpi label="Hitos del ciclo" value={`${stats.milestonesDone}/${stats.milestones}`} foot="Próximo: Cierre 1er ciclo · 05 jun" ribbon="b1"/>
        <Kpi label="Riesgos" value={atrasadas} foot={atrasadas > 0 ? <span style={{color:'var(--red)', fontWeight:700}}>Tareas atrasadas</span> : 'Sin atrasos'} ribbon="b4"/>
      </div>

      <div className="ring-card" style={{marginBottom:16}}>
        <Ring value={stats.avgProgress} color="#2EB77E" />
        <div>
          <div style={{fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:14}}>Avance por fase</div>
          <div className="phase-stats">
            {state.phases.map((p, pi) => {
              const palette = PHASE_PALETTE[pi % PHASE_PALETTE.length];
              const tasks = p.tasks.filter(t => !t.milestone);
              const avg = tasks.length ? Math.round(tasks.reduce((a,t)=>a+t.progress,0)/tasks.length) : 0;
              const doneN = tasks.filter(t => t.progress >= 100).length;
              return (
                <div key={p.id}>
                  <div className="phase-stat-row">
                    <span className="phase-dot" style={{background: palette.bar, width:12, height:12}}/>
                    <div>
                      <div className="name">{p.title}</div>
                      <div className="meta">{doneN} de {tasks.length} tareas listas · {fmtFull(tasks[0]?.start || p.tasks[0]?.start || state.startDate)}</div>
                    </div>
                    <div style={{fontFamily:'JetBrains Mono', fontWeight:700, color:'var(--navy)', fontSize:14}}>{avg}%</div>
                  </div>
                  <div className="phase-stat-bar">
                    <div style={{width: `${avg}%`, background: palette.bar}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel-split">
        {/* Próximas tareas */}
        <div className="card-block">
          <header>
            <h3>Próximas tareas · 14 días</h3>
            <button className="btn ghost" onClick={onGoGantt}>Ver Gantt →</button>
          </header>
          <div className="card-block-body" style={{padding:'4px 18px 14px'}}>
            {upcoming.length === 0 && <div className="empty-state"><h3>Todo al día</h3><p>No hay tareas próximas en este horizonte.</p></div>}
            {upcoming.map(t => {
              const palette = PHASE_PALETTE[t.phaseIdx % PHASE_PALETTE.length];
              const respNames = getResp(t).map(id => TEAM.find(m => m.id === id)?.nm).filter(Boolean);
              const respLabel = respNames.length > 1 ? `${respNames[0]} +${respNames.length-1}` : (respNames[0] || 'Sin asignar');
              return (
                <div className="up-task" key={t.id}>
                  <span className="dot" style={{background: palette.bar}}/>
                  <div>
                    <div className="tname">{t.title}</div>
                    <div className="tmeta">{t.phase.title.split('·')[0].trim()} · {respLabel} · {t.progress}%</div>
                  </div>
                  <div className="twhen">
                    <strong>{fmtDM(t.start)}</strong>
                    {!t.milestone && <>→ {fmtDM(t.end)}</>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="card-block">
          <header>
            <h3>Actividad del equipo</h3>
            <span style={{fontSize:11, color:'var(--text-2)'}}>EN VIVO</span>
          </header>
          <div className="card-block-body" style={{padding:'4px 18px 14px'}}>
            {store.state.log.slice(0, 5).map(entry => {
              const user = TEAM.find(t => t.id === entry.user);
              return (
                <div className="log-item" key={entry.id}>
                  <span className="av" style={{background: user?.color || '#999'}}>{user?.init}</span>
                  <div className="txt">
                    <strong>{user?.nm?.split(' ')[0]}</strong> {ACTION_LABELS[entry.action]} {entry.target && <span className="tag">EDT {entry.target}</span>}
                    <div style={{color:'var(--text-2)', fontSize:12, marginTop:2}}>{entry.detail}</div>
                  </div>
                  <div className="when">{relTime(entry.when)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, foot, ribbon }) {
  return (
    <div className="kpi">
      <div className={`kpi-ribbon ${ribbon}`}/>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">{foot}</div>
    </div>
  );
}

function TeamView({ store }) {
  const { state } = store;
  // Presencia real: en modo nube usa onlineUsers; en local cae a t.live (demo).
  const onlineSet = React.useMemo(() => {
    if (store.cloud) return new Set((store.onlineUsers || []).map(u => u.id));
    return new Set(TEAM.filter(t => t.live).map(t => t.id));
  }, [store.cloud, store.onlineUsers]);
  const isOnline = (id) => onlineSet.has(id);
  const counts = useMemo(() => {
    const map = {};
    state.phases.flatMap(p => p.tasks).forEach(t => {
      getResp(t).forEach(rid => {
        if (!map[rid]) map[rid] = { total: 0, done: 0, prog: 0 };
        map[rid].total++;
        if (t.progress >= 100) map[rid].done++;
        map[rid].prog += t.progress;
      });
    });
    return map;
  }, [state.phases]);
  return (
    <div>
      <div className="dh-section-title">
        <span className="pre">Equipo</span>
        <h2>Diálogo activo</h2>
        <div className="dh-section-underline"/>
        <div style={{marginLeft:'auto'}}>
          <button className="btn">
            <Icon.Plus size={14}/>
            Invitar colaborador
          </button>
        </div>
      </div>
      <div className="team-grid">
        {TEAM.map(t => {
          const c = counts[t.id] || { total:0, done:0, prog:0 };
          const avg = c.total ? Math.round(c.prog/c.total) : 0;
          return (
            <div className="team-card" key={t.id}>
              <div className={`av ${isOnline(t.id) ? 'live':''}`} style={{background: t.color}}>{t.init}</div>
              <div style={{flex:1}}>
                <div className="nm">{t.nm}</div>
                <div className="stats">{c.total} tareas · {c.done} listas · {avg}% promedio</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{marginTop:24}}>
        <div className="card-block">
          <header><h3>Permisos del proyecto</h3></header>
          <div className="card-block-body">
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
              <thead>
                <tr style={{textAlign:'left', color:'var(--text-2)', fontSize:11, textTransform:'uppercase', letterSpacing:'.06em'}}>
                  <th style={{padding:'10px 8px', borderBottom:'1px solid var(--border)'}}>Persona</th>
                  <th style={{padding:'10px 8px', borderBottom:'1px solid var(--border)'}}>Permiso</th>
                  <th style={{padding:'10px 8px', borderBottom:'1px solid var(--border)'}}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {TEAM.map(t => (
                  <tr key={t.id}>
                    <td style={{padding:'12px 8px', borderBottom:'1px dashed var(--border)'}}>
                      <div style={{display:'flex', alignItems:'center', gap:10}}>
                        <span className="av" style={{background: t.color, width:28, height:28, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:11, fontWeight:700}}>{t.init}</span>
                        <span style={{fontWeight:600}}>{t.nm}</span>
                      </div>
                    </td>
                    <td style={{padding:'12px 8px', borderBottom:'1px dashed var(--border)'}}>
                      <select style={{border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px', fontSize:12.5, background:'white'}} defaultValue={t.id === 'ep' ? 'admin' : 'editor'}>
                        <option value="admin">Administrador</option>
                        <option value="editor">Editor</option>
                        <option value="lector">Solo lectura</option>
                      </select>
                    </td>
                    <td style={{padding:'12px 8px', borderBottom:'1px dashed var(--border)'}}>
                      <span style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color: isOnline(t.id) ? 'var(--green)' : 'var(--text-3)'}}>
                        <span style={{width:8, height:8, borderRadius:'50%', background: isOnline(t.id) ? 'var(--green)' : 'var(--text-3)'}}/>
                        {isOnline(t.id) ? 'En línea' : 'Desconectado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

window.PanelView = PanelView;
window.TeamView = TeamView;
window.Ring = Ring;
