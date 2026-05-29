/* === app.jsx — orquesta Header + vistas + modales === */

function App() {
  const store = useStore();
  const [tab, setTab] = useState('gantt');
  const [aiOpen, setAiOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  // simulación de actividad SOLO en modo local (sin nube). En la nube, la
  // actividad es real y proviene de los demás editores.
  useEffect(() => {
    if (store.cloud) return;
    const sims = [
      { user: 'cl', action: 'updated_progress', target: '2.1', detail: 'subió de 55% a 60%' },
      { user: 'mr', action: 'commented', target: '3.1', detail: '"Necesito acceso al panel de métricas RE 2026"' },
      { user: 'ct', action: 'edited_task', target: '2.4', detail: 'ajustó fecha de término al 04/05' },
      { user: 'nc', action: 'updated_progress', target: '1.5', detail: 'subió de 60% a 70%' },
    ];
    let i = 0;
    const t = setInterval(() => {
      store.addLog(sims[i % sims.length]);
      i++;
    }, 32000);
    return () => clearInterval(t);
  }, [store.cloud]);

  return (
    <>
      <Header
        tab={tab}
        setTab={setTab}
        saveStatus={store.saveStatus}
        savedAt={store.state.savedAt}
        cloud={store.cloud}
        onlineUsers={store.onlineUsers}
        currentUserId={store.currentUserId}
        onExport={() => setExportOpen(true)}
        onPrint={() => window.print()}
        onShare={() => setShareOpen(true)}
      />
      <SaveBar saveStatus={store.saveStatus} savedAt={store.state.savedAt} cloud={store.cloud} onlineUsers={store.onlineUsers} />

      <main className="dh-main">
        {tab === 'panel' && (
          <>
            <div className="dh-section-title">
              <span className="pre">Panel</span>
              <h2>Diálogo activo · Mayo – Diciembre 2026</h2>
              <div className="dh-section-underline"/>
              <div style={{marginLeft:'auto', display:'flex', gap:8}}>
                <button className="btn" onClick={() => setExportOpen(true)}>
                  <Icon.Download size={14}/> Exportar
                </button>
                <button className="btn gold" onClick={() => setTab('gantt')}>
                  <Icon.Gantt size={14}/> Ir al Gantt
                </button>
              </div>
            </div>
            <PanelView store={store} onGoGantt={() => setTab('gantt')} />
          </>
        )}

        {tab === 'gantt' && (
          <>
            <div className="dh-section-title">
              <span className="pre">Gantt</span>
              <h2>Planificación 2026</h2>
              <div className="dh-section-underline"/>
              <p>Carta interactiva · arrastra barras, edita celdas, guarda automáticamente para todo el equipo</p>
            </div>
            <GanttView store={store} onOpenAi={() => setAiOpen(true)} onOpenExport={() => setExportOpen(true)} />
          </>
        )}

        {tab === 'equipo' && <TeamView store={store} />}
        {tab === 'bitacora' && <BitacoraView store={store} />}
      </main>

      {aiOpen && <AiSuggestModal onClose={() => setAiOpen(false)} store={store} />}
      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} store={store} showToast={showToast} />}
      {shareOpen && <ShareModal onClose={() => setShareOpen(false)} showToast={showToast} cloud={store.cloud} />}
      {store.needIdentity && <IdentityModal onPick={store.setIdentity} />}

      {toast && (
        <div className="toast">
          <Icon.Save size={14}/> {toast}
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
