import { useState, useEffect, useRef } from 'react'
import { Music, Video, Camera, LayoutGrid, Settings, Play, Pause, SkipForward, SkipBack, Search, LogOut, Folder, FolderSymlink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGoogleLogin, googleLogout } from '@react-oauth/google'
import { listDriveFiles, getMediaStreamUrl, findFolder, createFolder } from './services/GoogleDriveService'
import MediaExplorer from './components/MediaExplorer'
import CameraStreamer from './components/CameraStreamer'
import StreamViewer from './components/StreamViewer'

function App() {
  const [activeTab, setActiveTab] = useState('library')
  const [accessToken, setAccessToken] = useState(null)
  const [files, setFiles] = useState([])
  const [currentFile, setCurrentFile] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Folder logic
  const [baseFolder, setBaseFolder] = useState({ id: 'root', name: 'Meu Drive' })
  const [isInitializing, setIsInitializing] = useState(false)

  // Stream viewer logic
  const [streamId, setStreamId] = useState(null)

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
      // 1. Look for 'Styx' folder
      let styxFolder = await findFolder(accessToken, 'Styx')
      
      // 2. Create if not exists
      if (!styxFolder) {
        styxFolder = await createFolder(accessToken, 'Styx')
      }
      
      setBaseFolder(styxFolder)
      loadFiles(styxFolder.id)
    } catch (err) {
      console.error("Initialization error:", err)
      setError("Erro ao configurar pasta Styx. Verifique permissões.")
      loadFiles('root') // Fallback to root
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
      
      <aside className="sidebar">
        <div className="logo" onClick={() => window.location.href = window.location.origin} style={{ cursor: 'pointer' }}>
          <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '1rem' }}>STYX</h1>
        </div>

        <nav>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navItems.map((item) => (
              <li key={item.id}>
                <button 
                  className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
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
              <button 
                onClick={() => handleFolderClick({ id: 'root', name: 'Meu Drive' })}
                style={{ width: '100%', fontSize: '0.7rem', padding: '0.4rem', marginTop: '0.5rem' }}>
                <FolderSymlink size={12} /> Alterar
              </button>
              <button onClick={logout} style={{ width: '100%', justifyContent: 'flex-start', color: '#ff4444', background: 'none', border: 'none', marginTop: '1rem' }}>
                <LogOut size={16} /> <span style={{ fontSize: '0.75rem' }}>Sair da Conta</span>
              </button>
            </div>
          ) : (
            <button className="primary" onClick={() => login()} style={{ width: '100%' }}>
              Conectar Drive
            </button>
          )}
        </div>
      </aside>

      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            {baseFolder.id !== 'root' && (
              <button 
                onClick={() => handleFolderClick({ id: 'root', name: 'Meu Drive' })}
                style={{ background: 'none', border: 'none', opacity: 0.5, fontSize: '0.9rem', padding: 0 }}>
                &larr; Voltar para a Raiz
              </button>
            )}
            <h2 style={{ marginTop: '0.5rem' }}>{baseFolder.name}</h2>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
             <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} size={18} />
                <input type="text" placeholder="Buscar..." style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.5rem 1rem 0.5rem 3rem', color: 'white' }} />
             </div>
             {(loading || isInitializing) && <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>Processando...</p>}
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
                <MediaExplorer 
                  files={files} 
                  onFileClick={handleFileClick} 
                  onFolderClick={handleFolderClick} 
                />
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
        {/* ... Player controls same as before ... */}
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
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              style={{ background: 'white', color: 'black', width: '36px', height: '36px', borderRadius: '50%', padding: 0, justifyContent: 'center' }}
            >
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

export default App
