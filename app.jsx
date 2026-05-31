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
        onPrint={() => { setTimeout(() => window.print(), 100); }}
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

      {/* Informe imprimible — oculto en pantalla, visible solo al imprimir/PDF */}
      <PrintReport store={store} />

      {toast && (
        <div className="toast">
          <Icon.Save size={14}/> {toast}
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
