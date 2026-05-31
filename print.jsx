/* === print.jsx — Informe imprimible (PDF prolijo, A4 apaisado) ===
   Se oculta en pantalla y solo aparece al imprimir. Muestra:
   portada con logos + metadatos, resumen de avance, un Gantt
   ajustado al ancho de página, y tablas detalladas por fase. */

function PrintReport({ store }) {
  const { state, stats } = store;

  // rango real del proyecto a partir de las tareas
  const range = React.useMemo(() => {
    const all = state.phases.flatMap(p => p.tasks);
    if (!all.length) return { start: parseISO(state.startDate), end: addDays(parseISO(state.startDate), 7), days: 7 };
    let min = parseISO(all[0].start), max = parseISO(all[0].end || all[0].start);
    all.forEach(t => {
      const s = parseISO(t.start), e = parseISO(t.end || t.start);
      if (s < min) min = s;
      if (e > max) max = e;
    });
    return { start: min, end: max, days: diffDays(min, max) + 1 };
  }, [state.phases, state.startDate]);

  const pct = (iso) => (diffDays(range.start, parseISO(iso)) / range.days) * 100;
  const widthPct = (a, b) => ((diffDays(parseISO(a), parseISO(b)) + 1) / range.days) * 100;

  // bloques de mes para el encabezado del gantt
  const monthBlocks = React.useMemo(() => {
    const blocks = [];
    let cur = null;
    for (let i = 0; i < range.days; i++) {
      const d = addDays(range.start, i);
      const key = d.getFullYear() + '-' + d.getMonth();
      if (!cur || cur.key !== key) {
        cur = { key, label: d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', ''), span: 0 };
        blocks.push(cur);
      }
      cur.span++;
    }
    return blocks;
  }, [range]);

  const respNames = (t) => getResp(t).map(id => TEAM.find(m => m.id === id)?.nm).filter(Boolean);
  const today = new Date(); today.setHours(0,0,0,0);
  const printedAt = new Date().toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' });

  return (
    <div className="print-report">
      {/* PORTADA / ENCABEZADO */}
      <header className="pr-head">
        <div className="pr-logos">
          <img src="assets/penalolen-white.png" alt="Colegio Mayor Peñalolén" />
          <span className="pr-logo-div" />
          <img src="assets/tobalaba-white.png" alt="Colegio Mayor Tobalaba" />
        </div>
        <div className="pr-titles">
          <h1>Diálogo activo · Carta Gantt</h1>
          <p>{state.projectTitle}</p>
        </div>
        <div className="pr-meta">
          <div><label>Responsable</label><span>{state.responsible}</span></div>
          <div><label>Período</label><span>{fmtFull(range.start)} — {fmtFull(range.end)}</span></div>
          <div><label>Emitido</label><span>{printedAt}</span></div>
        </div>
      </header>

      {/* RESUMEN */}
      <div className="pr-summary">
        <div className="pr-kpi"><div className="v">{stats.avgProgress}%</div><div className="l">Avance global</div></div>
        <div className="pr-kpi"><div className="v">{stats.total}</div><div className="l">Tareas</div></div>
        <div className="pr-kpi"><div className="v">{stats.done}</div><div className="l">Completadas</div></div>
        <div className="pr-kpi"><div className="v">{stats.inProgress}</div><div className="l">En curso</div></div>
        <div className="pr-kpi"><div className="v">{stats.milestonesDone}/{stats.milestones}</div><div className="l">Hitos</div></div>
        <div className="pr-kpi"><div className="v">{state.phases.length}</div><div className="l">Fases</div></div>
      </div>

      {/* GANTT AJUSTADO AL ANCHO */}
      <section className="pr-section">
        <h2 className="pr-h2">Vista de planificación</h2>
        <div className="pr-gantt">
          <div className="pr-gantt-months">
            {monthBlocks.map(b => (
              <div key={b.key} style={{ width: (b.span / range.days * 100) + '%' }}>{b.label}</div>
            ))}
          </div>
          {state.phases.map((phase, pi) => {
            const palette = PHASE_PALETTE[pi % PHASE_PALETTE.length];
            const tasks = phase.tasks;
            return (
              <div className="pr-gantt-phase" key={phase.id}>
                <div className="pr-gantt-phase-name" style={{ borderLeftColor: palette.bar }}>{phase.title}</div>
                {tasks.map(t => (
                  <div className="pr-gantt-row" key={t.id}>
                    <div className="pr-gantt-label">{t.wbs} · {t.title}</div>
                    <div className="pr-gantt-track">
                      {t.milestone ? (
                        <span className="pr-ms" style={{ left: pct(t.start) + '%' }} title={t.title} />
                      ) : (
                        <span className="pr-bar" style={{
                          left: pct(t.start) + '%',
                          width: widthPct(t.start, t.end) + '%',
                          background: t.progress >= 100 ? '#2EB77E' : palette.bar,
                        }}>
                          <span className="pr-bar-fill" style={{ width: (t.progress||0) + '%' }} />
                          <span className="pr-bar-pct">{t.progress}%</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      {/* TABLAS DETALLADAS POR FASE */}
      <section className="pr-section">
        <h2 className="pr-h2">Detalle de tareas</h2>
        {state.phases.map((phase, pi) => {
          const palette = PHASE_PALETTE[pi % PHASE_PALETTE.length];
          const realTasks = phase.tasks.filter(t => !t.milestone);
          const avg = realTasks.length ? Math.round(realTasks.reduce((a,t)=>a+t.progress,0)/realTasks.length) : 0;
          return (
            <div className="pr-phase-block" key={phase.id}>
              <div className="pr-phase-title">
                <span className="pr-dot" style={{ background: palette.bar }} />
                <strong>{phase.title}</strong>
                <span className="pr-phase-avg">{avg}% · {phase.tasks.length} tareas</span>
              </div>
              <table className="pr-table">
                <thead>
                  <tr>
                    <th className="c-wbs">EDT</th>
                    <th className="c-task">Tarea</th>
                    <th className="c-resp">Responsable(s)</th>
                    <th className="c-date">Inicio</th>
                    <th className="c-date">Término</th>
                    <th className="c-dur">Días</th>
                    <th className="c-prog">% Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {phase.tasks.map(t => (
                    <tr key={t.id} className={t.milestone ? 'is-ms' : ''}>
                      <td className="c-wbs">{t.wbs}</td>
                      <td className="c-task">{t.milestone ? '◆ ' : ''}{t.title}</td>
                      <td className="c-resp">{respNames(t).join(', ') || '—'}</td>
                      <td className="c-date">{fmtFull(t.start)}</td>
                      <td className="c-date">{t.milestone ? '—' : fmtFull(t.end)}</td>
                      <td className="c-dur">{t.milestone ? '—' : workdays(t.start, t.end) + 'd'}</td>
                      <td className="c-prog">
                        <span className="pr-mini"><span style={{ width: (t.progress||0)+'%', background: t.progress>=100?'#2EB77E':palette.bar }} /></span>
                        {t.progress}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </section>

      <footer className="pr-foot">
        Diálogo activo · Carta Gantt — Colegio Mayor Peñalolén & Tobalaba · Documento generado el {printedAt}
      </footer>
    </div>
  );
}

window.PrintReport = PrintReport;
