import { useState, useEffect, useRef } from 'react'
import { Music, Video, Camera, LayoutGrid, Settings, Play, Pause, SkipForward, SkipBack, Search, LogOut, Folder, FolderSymlink, Menu, X, Home } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGoogleLogin, googleLogout, GoogleOAuthProvider } from '@react-oauth/google'
import { listDriveFiles, getMediaStreamUrl, findFolder, createFolder } from './services/GoogleDriveService'
import MediaExplorer from './components/MediaExplorer'
import CameraStreamer from './components/CameraStreamer'
import StreamViewer from './components/StreamViewer'

/**
 * The main application logic and UI. 
 * This component is only rendered when the Google Client ID is present.
 */
function StyxAppContent() {
  const [activeTab, setActiveTab] = useState('library')
  const [accessToken, setAccessToken] = useState(null)
  const [files, setFiles] = useState([])
  const [currentFile, setCurrentFile] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [baseFolder, setBaseFolder] = useState({ id: 'root', name: 'Meu Drive' })
  const [isInitializing, setIsInitializing] = useState(false)
  const [streamId, setStreamId] = useState(null)
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => {
    if (window.innerWidth <= 768) setIsSidebarOpen(false)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('streamId')
    if (sid) {
      setStreamId(sid)
      setActiveTab('view-stream')
    }
  }, [])

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token)
      localStorage.setItem('gdrive_token', tokenResponse.access_token)
    },
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
    onError: (error) => console.log('Login Failed:', error)
  })

  const logout = () => {
    googleLogout()
    setAccessToken(null)
    setFiles([])
    setBaseFolder({ id: 'root', name: 'Meu Drive' })
    localStorage.removeItem('gdrive_token')
  }

  useEffect(() => {
    const savedToken = localStorage.getItem('gdrive_token')
    if (savedToken) setAccessToken(savedToken)
  }, [])

  useEffect(() => {
    if (accessToken) {
      initializeDrive()
    }
  }, [accessToken])

  const initializeDrive = async () => {
    setIsInitializing(true)
    try {
      let styxFolder = await findFolder(accessToken, 'Styx')
      if (!styxFolder) {
        styxFolder = await createFolder(accessToken, 'Styx')
      }
      setBaseFolder(styxFolder)
      loadFiles(styxFolder.id)
    } catch (err) {
      console.error("Initialization error:", err)
      setError("Erro ao configurar pasta Styx. Verifique permissões.")
      loadFiles('root')
    } finally {
      setIsInitializing(false)
    }
  }

  const loadFiles = async (folderId) => {
    setLoading(true)
    try {
      const driveFiles = await listDriveFiles(accessToken, folderId)
      setFiles(driveFiles)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileClick = async (file) => {
    const streamUrl = await getMediaStreamUrl(accessToken, file.id)
    setCurrentFile({ ...file, streamUrl })
    setIsPlaying(true)
    if (file.mimeType.startsWith('video/')) {
      setActiveTab('player')
    }
  }

  const handleFolderClick = (folder) => {
    setBaseFolder(folder)
    loadFiles(folder.id)
  }

  const navItems = [
    { id: 'library', icon: LayoutGrid, label: 'Biblioteca' },
    { id: 'camera', icon: Camera, label: 'Câmera Stream' },
  ]

  return (
    <div className="app-container">
      <div className="glow-background" />
      
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 900
          }}
        />
      )}

      {/* Sidebar Mobile Toggle (The "recoiled" STYX button) */}
      <button 
        className="mobile-sidebar-toggle"
        onClick={toggleSidebar}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 850,
          padding: '0.5rem 1rem',
          borderRadius: '12px',
          background: 'var(--accent-gradient)',
          border: 'none',
          boxShadow: 'var(--shadow-glow)',
          display: isSidebarOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span style={{ fontWeight: 800, letterSpacing: '2px', fontSize: '1rem' }}>STYX</span>
      </button>

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="logo" onClick={() => { window.location.href = window.location.origin; closeSidebar(); }} style={{ cursor: 'pointer' }}>
            <h1 className="gradient-text" style={{ fontSize: '2rem' }}>STYX</h1>
          </div>
          <button 
            onClick={toggleSidebar} 
            style={{ background: 'none', border: 'none', padding: '0.5rem', display: 'flex' }}
          >
            <X size={24} />
          </button>
        </div>

        <nav>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navItems.map((item) => (
              <li key={item.id}>
                <button 
                  className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => { setActiveTab(item.id); closeSidebar(); }}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    background: activeTab === item.id ? 'rgba(0, 242, 255, 0.1)' : 'transparent',
                    borderColor: activeTab === item.id ? 'var(--accent-primary)' : 'transparent',
                  }}
                >
                  <item.icon size={20} color={activeTab === item.id ? 'var(--accent-primary)' : 'white'} />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {accessToken ? (
            <div className="card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Folder size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Pasta Base:</span>
              </div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{baseFolder.name}</p>
              <button onClick={() => { handleFolderClick({ id: 'root', name: 'Meu Drive' }); closeSidebar(); }} style={{ width: '100%', fontSize: '0.7rem', padding: '0.4rem', marginTop: '0.5rem' }}>
                <FolderSymlink size={12} /> Alterar
              </button>
              <button onClick={() => { logout(); closeSidebar(); }} style={{ width: '100%', justifyContent: 'flex-start', color: '#ff4444', background: 'none', border: 'none', marginTop: '1rem' }}>
                <LogOut size={16} /> <span style={{ fontSize: '0.75rem' }}>Sair da Conta</span>
              </button>
            </div>
          ) : (
            <button className="primary" onClick={() => { login(); closeSidebar(); }} style={{ width: '100%' }}>
              Conectar Drive
            </button>
          )}
        </div>
      </aside>

      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="mobile-header-spacer" style={{ width: '80px', flexShrink: 0 }}></div>
            <div>
              <h2 style={{ fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{baseFolder.name}</h2>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
             <div className="desktop-only" style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} size={18} />
                <input type="text" placeholder="Buscar..." style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.5rem 1rem 0.5rem 3rem', color: 'white' }} />
             </div>
             
             {baseFolder.id !== 'root' && (
                <button 
                  onClick={() => handleFolderClick({ id: 'root', name: 'Meu Drive' })} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.6rem' }}
                  title="Voltar para Raiz"
                >
                  <Home size={20} color="var(--accent-primary)" />
                </button>
             )}
             
             {(loading || isInitializing) && <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>...</p>}
          </div>
        </header>

        {error && (
          <div className="card" style={{ border: '1px solid #ff4444', color: '#ff4444', marginBottom: '2rem' }}>
            <p>Erro: {error}</p>
            <button onClick={() => initializeDrive()} style={{ marginTop: '1rem', fontSize: '0.8rem' }}>Tentar novamente</button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'library' && (
              accessToken ? (
                <MediaExplorer files={files} onFileClick={handleFileClick} onFolderClick={handleFolderClick} />
              ) : (
                <div style={{ textAlign: 'center', padding: '8rem 0' }}>
                  <Music size={64} opacity={0.1} />
                  <h2 style={{ marginTop: '2rem' }}>Acesse seu Google Drive</h2>
                  <p style={{ opacity: 0.5, marginBottom: '2rem' }}>Os dados serão geridos na pasta <b>Styx</b>.</p>
                  <button className="primary" onClick={() => login()} style={{ margin: '0 auto' }}>Conectar agora</button>
                </div>
              )
            )}

            {activeTab === 'camera' && <CameraStreamer />}
            {activeTab === 'view-stream' && streamId && <StreamViewer streamId={streamId} />}

            {activeTab === 'player' && currentFile && (
              <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
                 <button onClick={() => setActiveTab('library')} style={{ marginBottom: '1rem' }}>&larr; Fechar Player</button>
                 <div style={{ width: '100%', background: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-glow)' }}>
                    {currentFile.mimeType.startsWith('video/') ? (
                      <video src={currentFile.streamUrl} controls autoPlay style={{ width: '100%', maxHeight: '70vh' }} />
                    ) : (
                      <div style={{ padding: '6rem', textAlign: 'center' }}>
                         <Music size={80} color="var(--accent-primary)" style={{ filter: 'drop-shadow(0 0 10px var(--accent-primary))' }} />
                         <h2 style={{ marginTop: '2.5rem' }}>{currentFile.name}</h2>
                         <audio src={currentFile.streamUrl} controls autoPlay style={{ width: '100%', marginTop: '3rem' }} />
                      </div>
                    )}
                 </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="player-bar">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {currentFile ? (currentFile.mimeType.startsWith('audio/') ? <Music size={20} /> : <Video size={20} />) : <LayoutGrid size={20} opacity={0.2} />}
          </div>
          <div style={{ maxWidth: '200px' }}>
            <h4 style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentFile ? currentFile.name : 'Nenhuma mídia'}</h4>
            <p style={{ fontSize: '0.7rem', opacity: 0.5 }}>{currentFile ? 'Google Drive' : '---'}</p>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <SkipBack size={18} style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: 'white', color: 'black', width: '36px', height: '36px', borderRadius: '50%', padding: 0, justifyContent: 'center' }}>
              {isPlaying ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" style={{ marginLeft: '2px' }} />}
            </button>
            <SkipForward size={18} style={{ opacity: 0.5, cursor: 'not-allowed' }} />
          </div>
          <div style={{ width: '100%', maxWidth: '350px', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
            <div style={{ height: '100%', width: isPlaying ? '35%' : '0%', background: 'var(--accent-primary)', borderRadius: '2px', transition: 'width 0.5s linear' }}></div>
          </div>
        </div>
        <div style={{ flex: 1 }}></div>
      </footer>
    </div>
  )
}

/**
 * Shell component that either renders the app or the config warning.
 */
function App({ clientId }) {
  if (!clientId) {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '500px', border: '1px solid #eab308', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>⚠️ Configuração Necessária</h2>
          <p style={{ marginTop: '1rem', color: 'white', opacity: 0.8 }}>
            O <b>VITE_GOOGLE_CLIENT_ID</b> não foi encontrado no ambiente.
          </p>
          <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
            <p style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>No Vercel:</p>
            <ol style={{ marginLeft: '1.2rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'white', opacity: 0.7, lineHeight: 1.6 }}>
              <li>Vá em <b>Settings &gt; Environment Variables</b>.</li>
              <li>Crie <code>VITE_GOOGLE_CLIENT_ID</code>.</li>
              <li>Faça um <b>Redeploy</b> (aba Deployments &gt; Redeploy).</li>
            </ol>
          </div>
          <button className="primary" onClick={() => window.location.reload()} style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}>
            Já configurei, recarregar
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
