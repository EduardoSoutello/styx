import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, LogOut, Cloud, Settings, ChevronDown, ChevronRight } from 'lucide-react'
import { useGoogleLogin, googleLogout, GoogleOAuthProvider } from '@react-oauth/google'
import { CloudManager } from './services/CloudManager'
import FileManager from './components/FileManager'
import ConnectModal from './components/ConnectModal'
import ProviderBadge, { PROVIDER_CONFIG } from './components/ProviderBadge'
import StorageBar from './components/StorageBar'

// ── Inner app (needs GoogleOAuthProvider above) ───────────────────────────────

function StyxAppContent() {
  const [accounts,       setAccounts]       = useState(() => CloudManager.accounts)
  const [activeAccountId, setActiveAccount] = useState(null)
  const [showConnect,    setShowConnect]    = useState(false)
  const [isSidebarOpen,  setIsSidebarOpen]  = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({})

  // Keep in sync with CloudManager
  useEffect(() => {
    return CloudManager.subscribe(updated => setAccounts([...updated]))
  }, [])

  // Auto-select first account
  useEffect(() => {
    if (!activeAccountId && accounts.length > 0) {
      setActiveAccount(accounts[0].id)
    }
  }, [accounts, activeAccountId])

  const toggleSidebar = () => setIsSidebarOpen(s => !s)
  const closeSidebar  = () => { if (window.innerWidth <= 768) setIsSidebarOpen(false) }

  // ── Google OAuth ──
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const acc = await CloudManager.connectGoogleDrive(tokenResponse.access_token)
        setActiveAccount(acc.id)
        setShowConnect(false)
      } catch (e) {
        console.error('Google Drive connect error:', e)
      }
    },
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    onError: e => console.error('Google login failed:', e)
  })

  // ── Connect handlers ──
  async function handleConnectGoogle() {
    googleLogin()
    // ConnectModal will close itself via the onSuccess above
  }

  async function handleConnectMega(email, password) {
    const acc = await CloudManager.connectMega(email, password)
    setActiveAccount(acc.id)
  }

  async function handleConnectDropbox() {
    const { getDropboxAuthUrl } = await import('./services/providers/DropboxProvider')
    const url = await getDropboxAuthUrl()
    window.open(url, '_blank', 'width=600,height=700')
    // Actual token exchange happens in a redirect handler (future)
    alert('Complete a autorização no popup e aguarde. (Callback handler a implementar)')
  }

  async function handleConnectOneDrive() {
    const { getOneDriveAuthUrl } = await import('./services/providers/OneDriveProvider')
    const url = await getOneDriveAuthUrl()
    window.open(url, '_blank', 'width=600,height=700')
    alert('Complete a autorização no popup e aguarde. (Callback handler a implementar)')
  }

  function disconnectAccount(id) {
    if (!confirm('Desconectar esta conta?')) return
    if (id === 'googledrive') googleLogout()
    CloudManager.disconnect(id)
    if (activeAccountId === id) {
      const remaining = CloudManager.accounts
      setActiveAccount(remaining[0]?.id || null)
    }
  }

  // Group accounts by provider for sidebar rendering
  const grouped = accounts.reduce((acc, a) => {
    if (!acc[a.providerId]) acc[a.providerId] = []
    acc[a.providerId].push(a)
    return acc
  }, {})

  const activeAccount = accounts.find(a => a.id === activeAccountId)

  return (
    <div className="app-container">
      <div className="glow-background" />

      {/* Overlay mobile */}
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 900 }}
        />
      )}

      {/* Mobile STYX toggle */}
      <button
        className="mobile-sidebar-toggle"
        onClick={toggleSidebar}
        style={{ display: isSidebarOpen ? 'none' : undefined }}
      >
        <span>STYX</span>
      </button>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="gradient-text" style={{ fontSize: '2rem', letterSpacing: '-0.04em' }}>STYX</h1>
          <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', padding: '0.4rem', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.72rem', opacity: 0.4, marginTop: '-0.5rem' }}>
          Gerenciador Multi-Cloud
        </p>

        {/* Add account button */}
        <motion.button
          className="primary"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { setShowConnect(true); closeSidebar() }}
          style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> Adicionar Conta
        </motion.button>

        {/* Account list grouped by provider */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {accounts.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.3, marginTop: '2rem' }}>
              <Cloud size={36} style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.8rem' }}>Nenhuma conta conectada</p>
            </div>
          ) : (
            Object.entries(grouped).map(([providerId, provAccounts]) => {
              const cfg = PROVIDER_CONFIG[providerId] || {}
              const isExpanded = expandedGroups[providerId] !== false
              return (
                <div key={providerId}>
                  {/* Group header */}
                  <button
                    onClick={() => setExpandedGroups(prev => ({ ...prev, [providerId]: !isExpanded }))}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {cfg.label || providerId}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isExpanded && provAccounts.map(acc => (
                      <motion.div
                        key={acc.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div
                          onClick={() => { setActiveAccount(acc.id); closeSidebar() }}
                          className={`account-item ${activeAccountId === acc.id ? 'active' : ''}`}
                          style={{ borderColor: activeAccountId === acc.id ? `${cfg.color}66` : 'transparent' }}
                        >
                          {/* Avatar or provider badge */}
                          {acc.photo
                            ? <img src={acc.photo} alt="" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                            : <ProviderBadge providerId={acc.providerId} />
                          }

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {acc.name}
                            </p>
                            <p style={{ fontSize: '0.65rem', opacity: 0.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {acc.email}
                            </p>
                            {acc.quota?.total > 0 && (
                              <div style={{ marginTop: '0.35rem' }}>
                                <StorageBar
                                  used={acc.quota.used}
                                  total={acc.quota.total}
                                  color={cfg.color}
                                />
                              </div>
                            )}
                          </div>

                          <button
                            onClick={e => { e.stopPropagation(); disconnectAccount(acc.id) }}
                            title="Desconectar"
                            style={{ background: 'none', border: 'none', padding: '0.25rem', opacity: 0.3, flexShrink: 0 }}
                            className="disconnect-btn"
                          >
                            <LogOut size={13} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )
            })
          )}
        </div>

        {/* Settings placeholder */}
        <button style={{ background: 'none', border: '1px solid var(--border-color)', width: '100%', justifyContent: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', opacity: 0.5 }}>
          <Settings size={15} /> Configurações
        </button>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="main-content">
        {/* Header */}
        <header className="app-header" style={{ marginBottom: '1.5rem' }}>
          <div className="app-header-left">
            <div className="mobile-header-spacer" />
            {activeAccount && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ProviderBadge providerId={activeAccount.providerId} size="md" />
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{activeAccount.name}</h2>
                  <p style={{ fontSize: '0.72rem', opacity: 0.45 }}>{activeAccount.email}</p>
                </div>
              </div>
            )}
          </div>

          <div className="app-header-right">
            {accounts.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {accounts.slice(0, 5).map(a => (
                  <motion.div
                    key={a.id}
                    whileHover={{ scale: 1.15 }}
                    onClick={() => setActiveAccount(a.id)}
                    style={{
                      cursor: 'pointer',
                      outline: activeAccountId === a.id ? `2px solid var(--accent-primary)` : '2px solid transparent',
                      outlineOffset: 2,
                      borderRadius: '50%'
                    }}
                    title={`${a.name} (${a.email})`}
                  >
                    {a.photo
                      ? <img src={a.photo} alt="" style={{ width: 30, height: 30, borderRadius: '50%' }} />
                      : <ProviderBadge providerId={a.providerId} size="sm" />
                    }
                  </motion.div>
                ))}
                {accounts.length > 5 && (
                  <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>+{accounts.length - 5}</span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* File Manager */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeAccountId || 'empty'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{ height: 'calc(100% - 80px)' }}
          >
            <FileManager accountId={activeAccountId} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Connect Modal ─────────────────────────────────────────────────────── */}
      {showConnect && (
        <ConnectModal
          onClose={() => setShowConnect(false)}
          onConnectGoogle={handleConnectGoogle}
          onConnectMega={handleConnectMega}
          onConnectDropbox={handleConnectDropbox}
          onConnectOneDrive={handleConnectOneDrive}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

// ── Root (provides GoogleOAuthProvider) ─────────────────────────────────────

function App({ clientId }) {
  if (!clientId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: 480, border: '1px solid #eab308', background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>
          <h2>⚠️ Configuração Necessária</h2>
          <p style={{ marginTop: '1rem', color: 'white', opacity: 0.8 }}>
            Variável <b>VITE_GOOGLE_CLIENT_ID</b> não encontrada.
          </p>
          <ol style={{ marginLeft: '1.2rem', marginTop: '1rem', fontSize: '0.85rem', color: 'white', opacity: 0.7, lineHeight: 1.7 }}>
            <li>Adicione <code>VITE_GOOGLE_CLIENT_ID</code> no arquivo <code>.env</code></li>
            <li>Reinicie o servidor de desenvolvimento</li>
          </ol>
          <button className="primary" onClick={() => window.location.reload()} style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}>
            Recarregar
          </button>
        </div>
      </div>
    )
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <StyxAppContent />
    </GoogleOAuthProvider>
  )
}

export default App
