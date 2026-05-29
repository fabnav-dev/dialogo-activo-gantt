/* === shell.jsx — header navy con logos + pestañas + autosave bar === */

function Header({ tab, setTab, saveStatus, savedAt, cloud, onlineUsers, currentUserId, onExport, onPrint, onShare }) {
  const tabs = [
    { id: 'panel',   label: 'Panel',     icon: <Icon.Panel /> },
    { id: 'gantt',   label: 'Gantt',     icon: <Icon.Gantt />, pill: 'EN VIVO' },
    { id: 'equipo',  label: 'Equipo',    icon: <Icon.Team /> },
    { id: 'bitacora',label: 'Bitácora',  icon: <Icon.Book /> },
  ];

  // En la nube: presencia real. En local: equipo simulado.
  const present = cloud
    ? (onlineUsers || []).map(u => TEAM.find(t => t.id === u.id) || u)
    : TEAM.filter(t => t.live);

  return (
    <header className="dh-header">
      <div className="dh-header-row">
        <div className="dh-logobox">
          <img src="assets/penalolen-white.png" alt="Colegio Mayor Peñalolén" style={{height: 52}} />
          <div className="dh-logo-divider" />
          <img src="assets/tobalaba-white.png" alt="Colegio Mayor Tobalaba" style={{height: 52}} />
        </div>
        <div className="dh-title-block">
          <h1 className="dh-title">
            Diálogo activo · Gantt
            <span className="dh-badge">Mayo – Diciembre 2026</span>
          </h1>
          <div className="dh-sub">
            Carta de planificación colaborativa · Colegio Mayor Peñalolén & Tobalaba
          </div>
        </div>
        <div className="dh-actions">
          <div className="dh-presence" title={cloud ? 'Equipo conectado ahora (en vivo)' : 'Equipo del proyecto'}>
            {present.map(t => (
              <div key={t.id} className="dh-avatar live" style={{ background: t.color }} title={t.nm + (t.id === currentUserId ? ' (tú)' : '')}>{t.init}</div>
            ))}
            {cloud && present.length === 0 && (
              <span style={{fontSize:12, color:'rgba(255,255,255,.7)', fontWeight:600}}>Conectando…</span>
            )}
          </div>
          <button className="dh-icon-btn" onClick={onShare} title="Compartir con el equipo">
            <Icon.Share size={18} />
          </button>
          <button className="dh-icon-btn" onClick={onPrint} title="Imprimir / PDF">
            <Icon.Print size={18} />
          </button>
          <button className="dh-icon-btn primary" onClick={onExport} title="Exportar">
            <Icon.Download size={18} />
          </button>
        </div>
      </div>
      <nav className="dh-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`dh-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon}
            {t.label}
            {t.pill && <span className="pill">{t.pill}</span>}
          </button>
        ))}
      </nav>
    </header>
  );
}

function SaveBar({ saveStatus, savedAt, cloud, onlineUsers }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const onlineCount = cloud ? (onlineUsers || []).length : 3;
  return (
    <div className="dh-savebar">
      <div className="dh-savebar-left">
        {saveStatus === 'saving' ? (
          <span className="sync-chip"><Icon.Save size={12}/> {cloud ? 'Sincronizando con la nube…' : 'Guardando…'}</span>
        ) : (
          <span className="dh-save-dot">{cloud ? 'Sincronizado en la nube' : 'Guardado automático (local)'}</span>
        )}
        <span className="dh-save-meta">Última sincronización · {relTime(savedAt)}</span>
        <span className="dh-save-meta">·</span>
        <span className="dh-save-meta">{TEAM.length} editores · {onlineCount} en línea</span>
      </div>
      <div className="dh-savebar-right">
        {cloud
          ? <span className="dh-cloud-badge on"><Icon.Share size={12}/> Modo nube · en vivo</span>
          : <span className="dh-cloud-badge off" title="Conecta Firebase en firebase-config.js para edición en línea">Modo local · solo este equipo</span>}
      </div>
    </div>
  );
}

function IdentityModal({ onPick }) {
  return (
    <div className="modal-back" style={{zIndex: 300}}>
      <div className="modal" style={{width: 460}} onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>¿Quién eres?</h3>
          <p>Selecciona tu nombre para registrar tus cambios y mostrar tu presencia al equipo. Quedará guardado en este equipo.</p>
        </header>
        <div className="modal-body">
          <div style={{display:'grid', gap:8}}>
            {TEAM.map(t => (
              <button key={t.id} type="button" className="identity-opt" onClick={() => onPick(t.id)}>
                <span className="av" style={{background: t.color}}>{t.init}</span>
                <span className="identity-nm">{t.nm}</span>
                <span className="identity-go">Soy yo →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.Header = Header;
window.SaveBar = SaveBar;
window.IdentityModal = IdentityModal;
