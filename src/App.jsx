import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, LogOut, Cloud, Settings, ChevronDown, ChevronRight, Home, User } from 'lucide-react'
import { useGoogleLogin, googleLogout, GoogleOAuthProvider } from '@react-oauth/google'
import { CloudManager } from './services/CloudManager'
import { onAuthStateChanged, signOut } from './services/AuthService'
import { FIREBASE_CONFIGURED } from './firebase'
import FileManager from './components/FileManager'
import HomeView from './components/HomeView'
import ConnectModal from './components/ConnectModal'
import ProviderBadge, { PROVIDER_CONFIG } from './components/ProviderBadge'
import StorageBar from './components/StorageBar'
import AuthScreen from './components/auth/AuthScreen'
import EmailVerifyScreen from './components/auth/EmailVerifyScreen'

// ── Firebase not configured banner ───────────────────────────────────────────

function FirebaseSetupBanner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: 520, border: '1px solid #eab308', background: 'rgba(234,179,8,0.08)', color: '#eab308' }}>
        <h2 style={{ fontSize: '1.1rem' }}>⚠️ Firebase não configurado</h2>
        <p style={{ marginTop: '1rem', color: 'white', opacity: 0.75, fontSize: '0.88rem', lineHeight: 1.7 }}>
          Para ativar o sistema de login, adicione as variáveis do Firebase no arquivo <code>.env</code>:
        </p>
        <pre style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '10px', fontSize: '0.78rem', overflowX: 'auto', lineHeight: 1.8, color: '#94a3b8' }}>
{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}
        </pre>
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.6, lineHeight: 1.7 }}>
          Crie um projeto em <strong style={{ color: '#eab308' }}>console.firebase.google.com</strong>, ative Authentication → Google + Email/Password, e copie as chaves do SDK.
        </p>
        <button className="primary" onClick={() => window.location.reload()} style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}>
          Recarregar após configurar
        </button>
      </div>
    </div>
  )
}

// ── Inner app (needs GoogleOAuthProvider above) ───────────────────────────────

function StyxAppContent({ currentUser }) {
  const [accounts,        setAccounts]       = useState(() => CloudManager.accounts)
  const [activeAccountId, setActiveAccount]  = useState(null)
  const [showConnect,     setShowConnect]    = useState(false)
  const [isSidebarOpen,   setIsSidebarOpen]  = useState(false)
  const [expandedGroups,  setExpandedGroups] = useState({})
  const [showDrivePrompt, setShowDrivePrompt] = useState(false)
  const [drivePromptLoading, setDrivePromptLoading] = useState(false)

  // Keep in sync with CloudManager
  useEffect(() => {
    return CloudManager.subscribe(updated => setAccounts([...updated]))
  }, [])

  // Detect: logged in with Google but no Drive account linked yet
  useEffect(() => {
    const isGoogleUser = currentUser?.providerData?.some(p => p.providerId === 'google.com')
    const hasDrive     = accounts.some(
      a => a.providerId === 'googledrive' && a.email === currentUser?.email
    )
    const dismissed    = sessionStorage.getItem('styx_drive_prompt_dismissed')
    if (isGoogleUser && !hasDrive && !dismissed) {
      // Small delay so the app settles before showing the prompt
      const t = setTimeout(() => setShowDrivePrompt(true), 800)
      return () => clearTimeout(t)
    } else {
      setShowDrivePrompt(false)
    }
  }, [currentUser, accounts])

  const goHome       = () => setActiveAccount(null)
  const toggleSidebar = () => setIsSidebarOpen(s => !s)
  const closeSidebar  = () => { if (window.innerWidth <= 768) setIsSidebarOpen(false) }

  // ── Google OAuth (for Drive cloud account connection) ──
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const acc = await CloudManager.connectGoogleDrive(tokenResponse.access_token)
        setActiveAccount(acc.id)
        setShowConnect(false)
        setShowDrivePrompt(false)
        setDrivePromptLoading(false)
      } catch (e) {
        console.error('Google Drive connect error:', e)
        setDrivePromptLoading(false)
      }
    },
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    onError: e => { console.error('Google login failed:', e); setDrivePromptLoading(false) }
  })

  async function handleConnectGoogle(hint) {
    googleLogin(hint ? { login_hint: hint } : undefined)
  }

  async function handleConnectMega(email, password) {
    const acc = await CloudManager.connectMega(email, password)
    setActiveAccount(acc.id)
  }

  async function handleConnectDropbox() {
    const { getDropboxAuthUrl } = await import('./services/providers/DropboxProvider')
    const url = await getDropboxAuthUrl()
    window.open(url, '_blank', 'width=600,height=700')
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
    if (activeAccountId === id) setActiveAccount(null)
  }

  // Group accounts by provider
  const grouped = accounts.reduce((acc, a) => {
    if (!acc[a.providerId]) acc[a.providerId] = []
    acc[a.providerId].push(a)
    return acc
  }, {})

  const activeAccount = accounts.find(a => a.id === activeAccountId)

  // User display info
  const userName  = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuário'
  const userPhoto = currentUser?.photoURL

  return (
    <div className="app-container">
      <div className="glow-background" />

      {/* ── Google Drive link prompt ──────────────────────────────────────── */}
      <AnimatePresence>
        {showDrivePrompt && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'fixed',
              top: '1.25rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1100,
              width: 'calc(100% - 2.5rem)',
              maxWidth: 520,
              background: 'rgba(14,16,22,0.96)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,242,255,0.2)',
              borderRadius: '16px',
              padding: '1rem 1.25rem',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,242,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            {/* Google Drive icon */}
            <div style={{
              width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
              background: 'rgba(0,242,255,0.08)',
              border: '1px solid rgba(0,242,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 87.3 78" fill="none">
                <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
                <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.5C.4 49.9 0 51.45 0 53h27.5z" fill="#00AC47"/>
                <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#EA4335"/>
                <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D"/>
                <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z" fill="#2684FC"/>
                <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/>
              </svg>
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.15rem' }}>
                Adicionar Google Drive?
              </p>
              <p style={{ fontSize: '0.75rem', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Conectar <strong style={{ opacity: 1, color: 'var(--accent-primary)' }}>{currentUser?.email}</strong> como nuvem
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button
                onClick={() => {
                  sessionStorage.setItem('styx_drive_prompt_dismissed', '1')
                  setShowDrivePrompt(false)
                }}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', padding: '0.45rem 0.85rem', fontSize: '0.78rem', opacity: 0.6 }}
              >
                Não
              </button>
              <button
                className="primary"
                disabled={drivePromptLoading}
                onClick={() => {
                  setDrivePromptLoading(true)
                  handleConnectGoogle(currentUser?.email)
                }}
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', gap: '0.4rem' }}
              >
                {drivePromptLoading ? <span className="spin-small" /> : null}
                Adicionar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
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

        {/* ── Logged-in user card ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.6rem 0.75rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
          }}
        >
          {userPhoto
            ? <img src={userPhoto} alt="" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
            : (
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={16} />
              </div>
            )
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName}
            </p>
            <p style={{ fontSize: '0.64rem', opacity: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser?.email}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            title="Sair da conta Styx"
            style={{ background: 'none', border: 'none', padding: '0.25rem', opacity: 0.35, flexShrink: 0 }}
          >
            <LogOut size={13} />
          </button>
        </div>

        {/* Add account button */}
        <motion.button
          className="primary"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { setShowConnect(true); closeSidebar() }}
          style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> Adicionar Nuvem
        </motion.button>

        {/* Account list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {accounts.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.3, marginTop: '2rem' }}>
              <Cloud size={36} style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.8rem' }}>Nenhuma nuvem conectada</p>
            </div>
          ) : (
            Object.entries(grouped).map(([providerId, provAccounts]) => {
              const cfg        = PROVIDER_CONFIG[providerId] || {}
              const isExpanded = expandedGroups[providerId] !== false
              return (
                <div key={providerId}>
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
                                <StorageBar used={acc.quota.used} total={acc.quota.total} color={cfg.color} />
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

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <main className="main-content">
        <header className="app-header" style={{ marginBottom: '1.5rem' }}>
          <div className="app-header-left">
            <div className="mobile-header-spacer" />
            {activeAccount ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={goHome}
                  title="Voltar ao início"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: '10px' }}
                >
                  <Home size={16} />
                </button>
                <ProviderBadge providerId={activeAccount.providerId} size="md" />
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{activeAccount.name}</h2>
                  <p style={{ fontSize: '0.72rem', opacity: 0.45 }}>{activeAccount.email}</p>
                </div>
              </div>
            ) : (
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, opacity: 0.6 }}>Minhas Nuvens</h2>
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

        <AnimatePresence mode="wait">
          <motion.div
            key={activeAccountId || 'home'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{ height: 'calc(100% - 80px)' }}
          >
            {activeAccountId
              ? <FileManager accountId={activeAccountId} />
              : <HomeView
                  accounts={accounts}
                  onOpenAccount={id => setActiveAccount(id)}
                  onAddAccount={() => setShowConnect(true)}
                />
            }
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Connect Modal */}
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

// ── Root ─────────────────────────────────────────────────────────────────────

function App({ clientId }) {
  const [authState, setAuthState] = useState('loading') // 'loading' | 'unauthenticated' | 'unverified' | 'authenticated'
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) {
      setAuthState('unconfigured')
      return
    }

    const unsubscribe = onAuthStateChanged(user => {
      if (!user) {
        setCurrentUser(null)
        setAuthState('unauthenticated')
        CloudManager.setUser(null)
      } else if (!user.emailVerified) {
        setCurrentUser(user)
        setAuthState('unverified')
        CloudManager.setUser(null)
      } else {
        setCurrentUser(user)
        CloudManager.setUser(user.uid)
        setAuthState('authenticated')
      }
    })

    return unsubscribe
  }, [])

  // Show loading spinner
  if (authState === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spin-small" style={{ width: 32, height: 32, margin: '0 auto 1rem', borderWidth: 3 }} />
          <p style={{ opacity: 0.4, fontSize: '0.85rem' }}>Carregando…</p>
        </div>
      </div>
    )
  }

  // Firebase not set up
  if (authState === 'unconfigured') {
    return <FirebaseSetupBanner />
  }

  // Not logged in
  if (authState === 'unauthenticated') {
    return <AuthScreen />
  }

  // Logged in but email not verified
  if (authState === 'unverified') {
    return <EmailVerifyScreen user={currentUser} />
  }

  // Fully authenticated
  if (!clientId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: 480, border: '1px solid #eab308', background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>
          <h2>⚠️ Configuração Necessária</h2>
          <p style={{ marginTop: '1rem', color: 'white', opacity: 0.8 }}>
            Variável <b>VITE_GOOGLE_CLIENT_ID</b> não encontrada.
          </p>
        </div>
      </div>
    )
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <StyxAppContent currentUser={currentUser} />
    </GoogleOAuthProvider>
  )
}

export default App
