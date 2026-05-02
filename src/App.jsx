import { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { Plus, X, LogOut, Cloud, Settings, Home, User, GripVertical } from 'lucide-react'
import { useGoogleLogin, googleLogout, GoogleOAuthProvider } from '@react-oauth/google'
import { CloudManager } from './services/CloudManager'
import { onAuthStateChanged, signOut, initializeUserDocument } from './services/AuthService'
import { FIREBASE_CONFIGURED } from './firebase'
import { useLang } from './i18n'
import FileManager from './components/FileManager'
import HomeView from './components/HomeView'
import ConnectModal from './components/ConnectModal'
import ProviderBadge, { PROVIDER_CONFIG } from './components/ProviderBadge'
import StorageBar from './components/StorageBar'
import LanguageSelector from './components/LanguageSelector'
import AuthScreen from './components/auth/AuthScreen'
import EmailVerifyScreen from './components/auth/EmailVerifyScreen'
import OAuthCallback from './components/auth/OAuthCallback'
import SettingsView from './components/SettingsView'
import LegalView from './components/LegalView'
import { db } from './firebase'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'

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

// ── Reorderable Account Item ──────────────────────────────────────────────────

function AccountReorderItem({ acc, activeAccountId, setActiveAccount, closeSidebar, disconnectAccount, setShowSettings }) {
  const controls = useDragControls()
  const cfg = PROVIDER_CONFIG[acc.providerId] || {}

  return (
    <Reorder.Item 
      value={acc}
      dragListener={false}
      dragControls={controls}
      style={{ position: 'relative', listStyle: 'none' }}
    >
      <div
        onClick={() => { setActiveAccount(acc.id); setShowSettings(false); closeSidebar() }}
        className={`account-item ${activeAccountId === acc.id ? 'active' : ''}`}
        style={{ borderColor: activeAccountId === acc.id ? `${cfg.color}66` : 'transparent' }}
      >
        <div 
          onPointerDown={(e) => controls.start(e)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            opacity: 0.3, 
            marginRight: '-0.2rem', 
            marginLeft: '-0.3rem', 
            cursor: 'grab',
            padding: '0.5rem 0.3rem',
            touchAction: 'none'
          }}
          title="Segure para reordenar"
        >
          <GripVertical size={14} />
        </div>
        {acc.photo
          ? <img src={acc.photo} alt="" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, pointerEvents: 'none' }} />
          : <ProviderBadge providerId={acc.providerId} />
        }
        <div style={{ flex: 1, minWidth: 0, pointerEvents: 'none' }}>
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
          onPointerDown={e => e.stopPropagation()}
        >
          <LogOut size={13} />
        </button>
      </div>
    </Reorder.Item>
  )
}

// ── Inner app (needs GoogleOAuthProvider above) ───────────────────────────────

function NeblinaAppContent({ currentUser }) {
  const { t } = useLang()
  const [accounts,        setAccounts]       = useState(() => CloudManager.accounts)
  const [activeAccountId, setActiveAccount]  = useState(null)
  const [showConnect,     setShowConnect]    = useState(false)
  const [isSidebarOpen,   setIsSidebarOpen]  = useState(false)
  const [showSettings,    setShowSettings]   = useState(false)
  const [showLegal,       setShowLegal]      = useState(false)
  const [showDrivePrompt, setShowDrivePrompt] = useState(false)
  const [drivePromptLoading, setDrivePromptLoading] = useState(false)
  const [userData, setUserData] = useState(null)
  const [planWarning, setPlanWarning] = useState(null)

  // Listen to User Data (Plan, etc.)
  useEffect(() => {
    if (!currentUser) return
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        
        // Verificação de Expiração de Plano
        if (data?.plan === 'pro' && !data?.isOwner && data?.expiryDate) {
          const now = new Date()
          const expiry = new Date(data.expiryDate)
          
          if (now > expiry) {
            console.log("Plano expirado. Voltando para o Free...")
            updateDoc(doc(db, 'users', currentUser.uid), { plan: 'free' })
            
            // Limpa as contas excedentes (mantém apenas 2)
            if (accounts.length > 2) {
              const toDisconnect = accounts.slice(2)
              toDisconnect.forEach(acc => CloudManager.disconnect(acc.id))
              alert("Seu plano Neblina Pro expirou. Como o limite do plano Gratuito é de 2 contas, as contas excedentes foram desconectadas.")
            }
            return
          }

          // Aviso de 48h antes de expirar
          const hoursLeft = (expiry - now) / (1000 * 60 * 60)
          if (hoursLeft > 0 && hoursLeft <= 48) {
            setPlanWarning(`Seu plano Neblina Pro expira em ${Math.round(hoursLeft)} horas. Após isso, apenas suas 2 primeiras nuvens permanecerão conectadas.`)
          } else {
            setPlanWarning(null)
          }
        }
        
        setUserData(data)
      }
    })
    return unsub
  }, [currentUser])

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
    const dismissed    = sessionStorage.getItem('neblina_drive_prompt_dismissed')
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
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      try {
        setDrivePromptLoading(true)
        const { exchangeGoogleCode } = await import('./services/providers/GoogleDriveProvider')
        const tokenData = await exchangeGoogleCode(codeResponse.code)
        
        const acc = await CloudManager.connectGoogleDrive(tokenData)
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

  const handleOpenConnect = () => {
    const isPro = userData?.plan === 'pro' || userData?.isOwner
    if (!isPro && accounts.length >= 2) {
      setShowSettings(true)
      setActiveAccount(null)
      setIsSidebarOpen(false)
      alert("Você atingiu o limite de 2 contas do plano Gratuito. Faça upgrade para o Neblina Pro para adicionar nuvens ilimitadas!")
      return
    }
    setShowConnect(true)
  }

  const handleConnectGoogle = (hint) => {
    googleLogin(hint ? { login_hint: hint } : undefined)
  }

  async function handleConnectMega(email, password) {
    const acc = await CloudManager.connectMega(email, password)
    setActiveAccount(acc.id)
  }

  async function handleConnectDropbox() {
    const { getDropboxAuthUrl } = await import('./services/providers/DropboxProvider')
    const url = await getDropboxAuthUrl()
    window.location.href = url
  }

  async function handleConnectOneDrive() {
    const { getOneDriveAuthUrl } = await import('./services/providers/OneDriveProvider')
    const url = await getOneDriveAuthUrl()
    window.location.href = url
  }

  function disconnectAccount(id) {
    if (!confirm('Desconectar esta conta?')) return
    if (id === 'googledrive') googleLogout()
    CloudManager.disconnect(id)
    if (activeAccountId === id) setActiveAccount(null)
  }


  const activeAccount = accounts.find(a => a.id === activeAccountId)

  // User display info
  const userName  = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuário'
  const userPhoto = currentUser?.photoURL

  return (
    <div className="app-container">
      {/* ── Plan Expiration Warning ────────────────────────────────────────── */}
      <AnimatePresence>
        {planWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
              zIndex: 1200, background: '#f59e0b', color: '#000',
              padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 700,
              fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
              boxShadow: '0 10px 30px rgba(245,158,11,0.3)', width: 'max-content', maxWidth: '90%'
            }}
          >
            <Zap size={16} fill="currentColor" />
            {planWarning}
            <button onClick={() => setPlanWarning(null)} style={{ background: 'none', border: 'none', padding: '0.2rem', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
                {t('drive.prompt.title')}
              </p>
              <p style={{ fontSize: '0.75rem', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t('drive.prompt.desc', { email: '' })}<strong style={{ opacity: 1, color: 'var(--accent-primary)' }}>{currentUser?.email}</strong>
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button
                onClick={() => {
                  sessionStorage.setItem('neblina_drive_prompt_dismissed', '1')
                  setShowDrivePrompt(false)
                }}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', padding: '0.45rem 0.85rem', fontSize: '0.78rem', opacity: 0.6 }}
              >
                {t('drive.prompt.no')}
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
                {t('drive.prompt.add')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LegalView 
        isOpen={showLegal} 
        onClose={() => setShowLegal(false)} 
      />

      {/* Overlay mobile */}
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 900 }}
        />
      )}

      {/* Mobile Neblina toggle */}
      <button
        className="mobile-sidebar-toggle"
        onClick={toggleSidebar}
        style={{ display: isSidebarOpen ? 'none' : undefined }}
      >
        <img src="/Neblina_logo2.png" alt="Neblina" style={{ height: 22 }} />
      </button>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <img src="/Neblina_logo2.png" alt="Neblina" style={{ height: 40 }} />
          <button onClick={toggleSidebar} className="sidebar-close-btn" style={{ background: 'none', border: 'none', padding: '0.4rem', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.72rem', opacity: 0.4, marginTop: '-0.25rem' }}>
          {t('subtitle')}
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
            title={t('sidebar.logout')}
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
          onClick={() => { handleOpenConnect(); closeSidebar() }}
          style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> {t('sidebar.add')}
        </motion.button>

        {/* Account list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {accounts.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.3, marginTop: '2rem' }}>
              <Cloud size={36} style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.8rem' }}>{t('sidebar.noAccounts')}</p>
            </div>
          ) : (
            <Reorder.Group 
              axis="y" 
              values={accounts} 
              onReorder={(newOrder) => CloudManager.reorderAccounts(newOrder)} 
              style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
            >
              {accounts.map(acc => (
                <AccountReorderItem 
                  key={acc.id}
                  acc={acc}
                  activeAccountId={activeAccountId}
                  setActiveAccount={setActiveAccount}
                  closeSidebar={closeSidebar}
                  disconnectAccount={disconnectAccount}
                  setShowSettings={setShowSettings}
                />
              ))}
            </Reorder.Group>
          )}
        </div>

        {/* Settings placeholder */}
        {/* Language selector */}
        <LanguageSelector />

        <button 
          onClick={() => { setShowSettings(true); setActiveAccount(null); closeSidebar() }}
          className="sidebar-footer-btn"
          style={{ 
            background: showSettings ? 'rgba(255,255,255,0.08)' : 'none', 
            border: '1px solid var(--border-color)', 
            width: '100%', 
            justifyContent: 'flex-start', 
            gap: '0.5rem', 
            fontSize: '0.8rem', 
            opacity: showSettings ? 1 : 0.5 
          }}
        >
          <Settings size={15} /> {t('sidebar.settings')}
        </button>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <main className="main-content">
        <header className="app-header" style={{ marginBottom: '1.5rem' }}>
          <div className="app-header-left">
            <div className="mobile-header-spacer" />
            {showSettings ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowSettings(false)}
                  title="Voltar"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: '10px' }}
                >
                  <Home size={16} />
                </button>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t('settings.title')}</h2>
              </div>
            ) : activeAccount ? (
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
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, opacity: 0.6 }}>{t('home.title')}</h2>
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
            {showSettings ? (
              <SettingsView 
                currentUser={currentUser} 
                userData={userData}
                onLogout={() => signOut()} 
                onShowLegal={() => setShowLegal(true)}
              />
            ) : activeAccountId ? (
              <FileManager 
                accountId={activeAccountId} 
                onReauthGoogle={handleConnectGoogle}
                onReauthMega={handleConnectMega}
                onReauthDropbox={handleConnectDropbox}
                onReauthOneDrive={handleConnectOneDrive}
              />
            ) : (
              <HomeView
                accounts={accounts}
                onOpenAccount={id => setActiveAccount(id)}
                onAddAccount={handleOpenConnect}
              />
            )}
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
        // Garante que o documento do usuário exista (plano, isOwner, etc)
        initializeUserDocument(user)
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
    return <AuthScreen onShowLegal={() => setShowLegal(true)} />
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

  // Intercept OAuth callback
  if (window.location.pathname.startsWith('/auth/')) {
    const provider = window.location.pathname.split('/')[2]
    return <OAuthCallback provider={provider} />
  }

  // Intercept Legal Pages (Public)
  if (window.location.pathname === '/terms' || window.location.pathname === '/privacy') {
    return (
      <div style={{ background: '#0e1016', minHeight: '100vh' }}>
        <LegalView isOpen={true} onClose={() => window.location.href = '/'} isStatic={true} />
      </div>
    )
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <NeblinaAppContent currentUser={currentUser} />
    </GoogleOAuthProvider>
  )
}

export default App
