import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Music, Video, Camera, LayoutGrid, Play, Pause,
  LogOut, Folder, FolderSymlink, X, Home, Radio,
  Volume2, VolumeX, Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGoogleLogin, googleLogout, GoogleOAuthProvider } from '@react-oauth/google'
import { listDriveFiles, getMediaStreamUrl, findFolder, createFolder } from './services/GoogleDriveService'
import MediaExplorer from './components/MediaExplorer'
import CameraStreamer from './components/CameraStreamer'
import StreamViewer from './components/StreamViewer'
import RadioTuner from './components/RadioTuner'

function StyxAppContent() {
  const [activeTab, setActiveTab]         = useState('library')
  const [accessToken, setAccessToken]     = useState(null)
  const [files, setFiles]                 = useState([])
  const [currentFile, setCurrentFile]     = useState(null)
  const [isPlaying, setIsPlaying]         = useState(false)
  const [loading, setLoading]             = useState(false)
  const [audioLoading, setAudioLoading]   = useState(false)
  const [error, setError]                 = useState(null)
  const [baseFolder, setBaseFolder]       = useState({ id: 'root', name: 'Meu Drive' })
  const [isInitializing, setIsInitializing] = useState(false)
  const [streamId, setStreamId]           = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentTime, setCurrentTime]     = useState(0)
  const [duration, setDuration]           = useState(0)
  const [volume, setVolume]               = useState(1)
  const [muted, setMuted]                 = useState(false)

  const audioRef = useRef(null)

  // ── Sidebar helpers ──
  const toggleSidebar = () => setIsSidebarOpen(s => !s)
  const closeSidebar  = () => { if (window.innerWidth <= 768) setIsSidebarOpen(false) }

  // ── Deep link: stream viewer ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('streamId')
    if (sid) { setStreamId(sid); setActiveTab('view-stream') }
  }, [])

  // ── Google login ──
  const login = useGoogleLogin({
    onSuccess: t => { setAccessToken(t.access_token); localStorage.setItem('gdrive_token', t.access_token) },
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
    onError: e => console.log('Login Failed:', e)
  })

  const logout = () => {
    googleLogout()
    setAccessToken(null); setFiles([]); setBaseFolder({ id: 'root', name: 'Meu Drive' })
    localStorage.removeItem('gdrive_token')
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    setCurrentFile(null); setIsPlaying(false)
  }

  useEffect(() => {
    const t = localStorage.getItem('gdrive_token')
    if (t) setAccessToken(t)
  }, [])

  useEffect(() => { if (accessToken) initializeDrive() }, [accessToken])

  // ── Core PLAY function – MUST be called synchronously from a user gesture ──
  const playUrl = useCallback((url, fileInfo) => {
    const audio = audioRef.current
    if (!audio || !url) return

    setAudioLoading(true)
    audio.pause()
    audio.src = url
    audio.load()
    audio.volume = volume

    const tryPlay = audio.play()
    if (tryPlay !== undefined) {
      tryPlay
        .then(() => { setIsPlaying(true); setCurrentFile(fileInfo) })
        .catch(err => {
          console.warn('play() blocked:', err)
          // Still show the track – user can press play manually
          setCurrentFile(fileInfo)
          setIsPlaying(false)
        })
        .finally(() => setAudioLoading(false))
    } else {
      setCurrentFile(fileInfo)
      setAudioLoading(false)
    }
  }, [volume])

  // ── Drive ──
  const initializeDrive = async () => {
    setIsInitializing(true)
    try {
      let folder = await findFolder(accessToken, 'Styx')
      if (!folder) folder = await createFolder(accessToken, 'Styx')
      setBaseFolder(folder)
      loadFiles(folder.id)
    } catch {
      setError('Erro ao configurar pasta Styx.')
      loadFiles('root')
    } finally { setIsInitializing(false) }
  }

  const loadFiles = async (folderId) => {
    setLoading(true)
    try {
      const f = await listDriveFiles(accessToken, folderId)
      setFiles(f); setError(null)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // Called DIRECTLY from click – synchronous play() stays in gesture context
  const handleFileClick = (file) => {
    const url = getMediaStreamUrl(accessToken, file.id)
    playUrl(url, { ...file, streamUrl: url })
    if (file.mimeType.startsWith('video/')) setActiveTab('player')
  }

  const handleFolderClick = (folder) => { setBaseFolder(folder); loadFiles(folder.id) }

  // Called from radio card / globe click
  const handleStationClick = (station) => {
    playUrl(station.url_resolved, {
      id: station.stationuuid,
      name: station.name,
      mimeType: 'audio/mpeg',
      streamUrl: station.url_resolved,
      favicon: station.favicon,
      country: station.country,
      isRadio: true,
    })
  }

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause() } else { audio.play().catch(console.warn) }
  }

  const seek = (e) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const fmt = (s) => isNaN(s) ? '0:00' : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`

  const navItems = [
    { id: 'library', icon: LayoutGrid, label: 'Biblioteca' },
    { id: 'radio',   icon: Radio,       label: 'Rádio Online' },
    { id: 'camera',  icon: Camera,      label: 'Câmera Stream' },
  ]

  return (
    <div className="app-container">
      {/* ── Real hidden audio element ── */}
      <audio
        ref={audioRef}
        onTimeUpdate={()      => setCurrentTime(audioRef.current?.currentTime || 0)}
        onDurationChange={()  => setDuration(audioRef.current?.duration || 0)}
        onEnded={()           => setIsPlaying(false)}
        onPlay={()            => setIsPlaying(true)}
        onPause={()           => setIsPlaying(false)}
        onWaiting={()         => setAudioLoading(true)}
        onPlaying={()         => setAudioLoading(false)}
        onError={()           => { setAudioLoading(false); setIsPlaying(false) }}
      />

      <div className="glow-background" />

      {/* Overlay */}
      {isSidebarOpen && (
        <div onClick={closeSidebar} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', zIndex:900 }} />
      )}

      {/* Mobile STYX button */}
      <button className="mobile-sidebar-toggle" onClick={toggleSidebar} style={{ display: isSidebarOpen ? 'none' : undefined }}>
        <span>STYX</span>
      </button>

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div className="logo" onClick={() => { window.location.href = window.location.origin; closeSidebar() }} style={{ cursor:'pointer' }}>
            <h1 className="gradient-text" style={{ fontSize:'2rem' }}>STYX</h1>
          </div>
          <button onClick={toggleSidebar} style={{ background:'none', border:'none', padding:'0.5rem', display:'flex' }}>
            <X size={24} />
          </button>
        </div>

        <nav>
          <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => { setActiveTab(item.id); closeSidebar() }}
                  style={{ width:'100%', justifyContent:'flex-start',
                    background: activeTab === item.id ? 'rgba(0,242,255,0.1)' : 'transparent',
                    borderColor: activeTab === item.id ? 'var(--accent-primary)' : 'transparent' }}
                >
                  <item.icon size={20} color={activeTab === item.id ? 'var(--accent-primary)' : 'white'} />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:'1rem' }}>
          {accessToken ? (
            <div className="card" style={{ padding:'0.75rem', background:'rgba(255,255,255,0.03)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.5rem' }}>
                <Folder size={16} color="var(--accent-primary)" />
                <span style={{ fontSize:'0.7rem', opacity:0.6 }}>Pasta Base:</span>
              </div>
              <p style={{ fontSize:'0.8rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis' }}>{baseFolder.name}</p>
              <button onClick={() => { handleFolderClick({ id:'root', name:'Meu Drive' }); closeSidebar() }}
                style={{ width:'100%', fontSize:'0.7rem', padding:'0.4rem', marginTop:'0.5rem' }}>
                <FolderSymlink size={12} /> Alterar
              </button>
              <button onClick={() => { logout(); closeSidebar() }}
                style={{ width:'100%', justifyContent:'flex-start', color:'#ff4444', background:'none', border:'none', marginTop:'1rem' }}>
                <LogOut size={16} /> <span style={{ fontSize:'0.75rem' }}>Sair da Conta</span>
              </button>
            </div>
          ) : (
            <button className="primary" onClick={() => { login(); closeSidebar() }} style={{ width:'100%' }}>
              Conectar Drive
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        <header className="app-header">
          <div className="app-header-left">
            <div className="mobile-header-spacer" />
            {(baseFolder.name !== 'Styx' && baseFolder.id !== 'root') && (
              <h2 style={{ fontSize:'1.1rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'140px' }}>
                {baseFolder.name}
              </h2>
            )}
          </div>
          <div className="app-header-right">
            {baseFolder.id !== 'root' && (
              <button onClick={() => handleFolderClick({ id:'root', name:'Meu Drive' })}
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid var(--border-color)', padding:'0.5rem' }}
                title="Raiz">
                <Home size={18} color="var(--accent-primary)" />
              </button>
            )}
            {(loading || isInitializing) && <Loader2 size={18} style={{ opacity:0.4, flexShrink:0 }} />}
          </div>
        </header>

        {error && (
          <div className="card" style={{ border:'1px solid #ff4444', color:'#ff4444', marginBottom:'1.5rem' }}>
            <p>{error}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-8 }} transition={{ duration:0.15 }}>

            {activeTab === 'library' && (
              accessToken ? (
                <MediaExplorer
                  files={files}
                  onFileClick={handleFileClick}
                  onFolderClick={handleFolderClick}
                  currentFileId={currentFile?.id}
                  isPlaying={isPlaying}
                />
              ) : (
                <div style={{ textAlign:'center', padding:'6rem 0' }}>
                  <Music size={64} opacity={0.1} />
                  <h2 style={{ marginTop:'2rem' }}>Acesse seu Google Drive</h2>
                  <p style={{ opacity:0.5, margin:'1rem 0 2rem' }}>Os arquivos serão gerenciados na pasta <b>Styx</b>.</p>
                  <button className="primary" onClick={() => login()} style={{ margin:'0 auto' }}>Conectar agora</button>
                </div>
              )
            )}

            {activeTab === 'radio' && <RadioTuner onStationClick={handleStationClick} />}
            {activeTab === 'camera' && <CameraStreamer />}
            {activeTab === 'view-stream' && streamId && <StreamViewer streamId={streamId} />}

            {activeTab === 'player' && currentFile && (
              <div className="card" style={{ maxWidth:'900px', margin:'0 auto' }}>
                <button onClick={() => setActiveTab('library')} style={{ marginBottom:'1rem' }}>&larr; Fechar</button>
                <video
                  src={currentFile.streamUrl}
                  controls autoPlay
                  style={{ width:'100%', maxHeight:'70vh', borderRadius:'12px' }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Player Bar ── */}
      <footer className="player-bar">
        {/* Album art + info */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flex:'0 1 220px', minWidth:0 }}>
          <div style={{
            width:'48px', height:'48px', borderRadius:'10px', flexShrink:0, overflow:'hidden',
            background:'rgba(255,255,255,0.04)',
            display:'flex', alignItems:'center', justifyContent:'center',
            border: currentFile ? '1px solid var(--border-color)' : 'none',
            boxShadow: isPlaying ? 'var(--shadow-glow)' : 'none',
            transition: 'box-shadow 0.3s'
          }}>
            {currentFile?.favicon
              ? <img src={currentFile.favicon} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} />
              : currentFile?.mimeType?.startsWith('audio/')
                ? <Music size={22} color="var(--accent-primary)" />
                : currentFile?.mimeType?.startsWith('video/')
                  ? <Video size={22} color="#06b6d4" />
                  : <LayoutGrid size={20} opacity={0.2} />
            }
          </div>
          <div style={{ minWidth:0 }}>
            <h4 style={{ fontSize:'0.82rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {currentFile?.name ?? 'Nenhuma mídia'}
            </h4>
            <p style={{ fontSize:'0.68rem', opacity:0.45 }}>
              {currentFile?.country ?? (currentFile ? 'Google Drive' : '—')}
            </p>
          </div>
        </div>

        {/* Controls + progress */}
        <div style={{ flex:'1 1 auto', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.35rem', padding:'0 1rem' }}>
          <button
            onClick={togglePlayPause}
            style={{ background:'white', color:'black', width:'40px', height:'40px', borderRadius:'50%',
              padding:0, justifyContent:'center', flexShrink:0, boxShadow: isPlaying ? '0 0 12px rgba(0,242,255,0.4)' : 'none' }}
          >
            {audioLoading
              ? <Loader2 size={18} style={{ animation:'spin 1s linear infinite' }} />
              : isPlaying
                ? <Pause size={18} fill="black" />
                : <Play size={18} fill="black" style={{ marginLeft:'2px' }} />
            }
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', width:'100%', maxWidth:'400px' }}>
            <span style={{ fontSize:'0.65rem', opacity:0.5, flexShrink:0 }}>{fmt(currentTime)}</span>
            <div
              onClick={seek}
              style={{ flex:1, height:'4px', background:'rgba(255,255,255,0.12)', borderRadius:'2px', cursor:'pointer', position:'relative' }}
            >
              <div style={{ height:'100%', width:`${progress}%`, background:'var(--accent-primary)', borderRadius:'2px', transition:'width 0.3s linear' }} />
            </div>
            <span style={{ fontSize:'0.65rem', opacity:0.5, flexShrink:0 }}>{fmt(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flex:'0 1 120px', justifyContent:'flex-end' }} className="desktop-only">
          <button onClick={() => { setMuted(m => !m); if (audioRef.current) audioRef.current.muted = !muted }}
            style={{ background:'none', border:'none', padding:'0.25rem' }}>
            {muted ? <VolumeX size={16} opacity={0.5} /> : <Volume2 size={16} />}
          </button>
          <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
            onChange={e => { const v = parseFloat(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; setMuted(v === 0) }}
            style={{ width:'70px', accentColor:'var(--accent-primary)' }}
          />
        </div>
      </footer>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function App({ clientId }) {
  if (!clientId) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:'2rem' }}>
        <div className="card" style={{ maxWidth:'480px', border:'1px solid #eab308', background:'rgba(234,179,8,0.1)', color:'#eab308' }}>
          <h2>⚠️ Configuração Necessária</h2>
          <p style={{ marginTop:'1rem', color:'white', opacity:0.8 }}>
            Variável <b>VITE_GOOGLE_CLIENT_ID</b> não encontrada.
          </p>
          <ol style={{ marginLeft:'1.2rem', marginTop:'1rem', fontSize:'0.85rem', color:'white', opacity:0.7, lineHeight:1.7 }}>
            <li>Vercel → <b>Settings › Environment Variables</b></li>
            <li>Adicione <code>VITE_GOOGLE_CLIENT_ID</code></li>
            <li>Faça <b>Redeploy</b></li>
          </ol>
          <button className="primary" onClick={() => window.location.reload()} style={{ marginTop:'1.5rem', width:'100%', justifyContent:'center' }}>
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
