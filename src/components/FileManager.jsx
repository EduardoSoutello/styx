import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, List, Upload, FolderPlus, ChevronRight,
  Home, Loader2, RefreshCw, Search, CloudOff, X, Download
} from 'lucide-react'
import { CloudManager } from '../services/CloudManager'
import FileCard from './FileCard'
import TransferModal from './TransferModal'

// ── Image Lightbox ────────────────────────────────────────────────────────────

function ImageLightbox({ preview, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!preview) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.88)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        {/* Controls */}
        <div
          style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}
          onClick={e => e.stopPropagation()}
        >
          <a
            href={preview.url}
            download={preview.name}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 0.9rem', borderRadius: '10px',
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'white', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
            }}
          >
            <Download size={14} /> Download
          </a>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '0.5rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Image */}
        <motion.img
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1,    opacity: 1 }}
          transition={{ duration: 0.25 }}
          src={preview.url}
          alt={preview.name}
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: '90vw', maxHeight: '85vh',
            objectFit: 'contain',
            borderRadius: '12px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          }}
          onError={e => { e.target.style.display = 'none' }}
        />

        {/* File name */}
        <p style={{
          position: 'absolute', bottom: '1.25rem', left: '50%', transform: 'translateX(-50%)',
          fontSize: '0.8rem', opacity: 0.5, whiteSpace: 'nowrap', maxWidth: '80vw',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {preview.name}
        </p>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Reauth Screen ───────────────────────────────────────────────────────────────

function ReauthScreen({ account }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(true) // Start loading for silent auth
  const [error, setError]       = useState('')
  const [showForm, setShowForm] = useState(false)

  // Try silent login on mount
  useEffect(() => {
    let isMounted = true
    async function trySilentLogin() {
      try {
        const { decryptPassword } = await import('../services/CloudManager')
        // We use the account's unique id part (email) or the global UID from CloudManager.
        // Actually we just import the current CloudManager's UID instance but we can't easily.
        // Let's just try to decrypt using CloudManager's current internal logic:
        const { CloudManager } = await import('../services/CloudManager')
        const uid = CloudManager._uid
        
        const decrypted = await decryptPassword(uid, account._encryptedMegaPassword)
        if (decrypted && isMounted) {
          await CloudManager.connectMega(account.email, decrypted)
          // If successful, CloudManager updates the account and this screen unmounts naturally
        } else {
          if (isMounted) {
            setLoading(false)
            setShowForm(true)
          }
        }
      } catch (err) {
        if (isMounted) {
          setLoading(false)
          setShowForm(true)
        }
      }
    }
    
    if (account._encryptedMegaPassword) {
      trySilentLogin()
    } else {
      setLoading(false)
      setShowForm(true)
    }
    return () => { isMounted = false }
  }, [account])

  async function handleReauth(e) {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const { CloudManager } = await import('../services/CloudManager')
      await CloudManager.connectMega(account.email, password)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}
      >
        <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(217,39,46,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          {loading && !showForm ? (
            <Loader2 size={24} color="#D9272E" style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#D9272E"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.836 17.52h-2.52V10.15l-3.3 5.48h-.033l-3.3-5.48v7.37H6.164V6.48h2.693l3.143 5.358 3.143-5.358h2.693v11.04z"/></svg>
          )}
        </div>
        
        {loading && !showForm ? (
          <>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Restaurando sessão...</h3>
            <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.5rem' }}>Conectando ao MEGA de forma segura.</p>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Sessão Expirada</h3>
            <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Por segurança, o MEGA não permite salvar a sessão permanentemente. Digite a senha para <strong>{account.email}</strong> para continuar.
            </p>

            <form onSubmit={handleReauth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <input
                  type="password"
                  placeholder="Senha do MEGA"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              {error && <p style={{ color: '#ff4444', fontSize: '0.8rem', textAlign: 'left' }}>{error}</p>}
              <button className="primary" type="submit" disabled={!password || loading} style={{ justifyContent: 'center', padding: '0.75rem' }}>
                {loading ? <span className="spin-small" /> : 'Reconectar'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}

// ── FileManager ───────────────────────────────────────────────────────────────

export default function FileManager({ accountId }) {
  const [files,       setFiles]       = useState([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [viewMode,    setViewMode]    = useState('grid')  // 'grid' | 'list'
  const [search,      setSearch]      = useState('')
  const [breadcrumb,  setBreadcrumb]  = useState([])      // [{id, name}, ...]
  const [uploading,   setUploading]   = useState(false)
  const [uploadPct,   setUploadPct]   = useState(0)
  const [imagePreview, setImagePreview] = useState(null) // { url, name }
  const [transferFile, setTransferFile] = useState(null) // file object to transfer

  const account  = CloudManager.accounts.find(a => a.id === accountId)
  const provider = account ? CloudManager.getProvider(accountId) : null

  const currentFolderId = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].id : null

  const loadFiles = useCallback(async (folderId = null) => {
    if (!accountId || !account) return
    setLoading(true)
    setError(null)
    try {
      const result = await CloudManager.listFiles(accountId, folderId)
      setFiles(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [accountId, account])

  useEffect(() => {
    if (accountId && !account?.needsReauth) {
      setBreadcrumb([])
      loadFiles(null)
    }
  }, [accountId, loadFiles, account?.needsReauth])

  function openFolder(folder) {
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }])
    loadFiles(folder.id)
  }

  function navigateTo(index) {
    if (index === -1) {
      setBreadcrumb([])
      loadFiles(null)
    } else {
      const crumb = breadcrumb[index]
      setBreadcrumb(prev => prev.slice(0, index + 1))
      loadFiles(crumb.id)
    }
  }

  async function handleFileOpen(file) {
    if (file.type === 'folder') { openFolder(file); return }
    if (!provider || !account || !provider.getDownloadUrl) return

    const authParam = account.session || account.token
    try {
      // Always await — MEGA and OneDrive return async URLs
      const result = await Promise.resolve(provider.getDownloadUrl(authParam, file.id || file.path, file))
      if (!result) return

      const url = typeof result === 'string' ? result : result.url
      const isMegaUrl = typeof result === 'object' && result.isMegaUrl

      const isImage = !isMegaUrl && (file.mimeType?.startsWith('image/') ||
        /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name))

      if (isImage) {
        setImagePreview({ url, name: file.name })
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (e) {
      setError(`Não foi possível abrir o arquivo: ${e.message}`)
    }
  }

  async function handleDelete(file) {
    if (!confirm(`Apagar "${file.name}"?`)) return
    try {
      const authParam = account.session || account.token
      await provider.deleteFile(authParam, file.id || file.path)
      setFiles(prev => prev.filter(f => f.id !== file.id))
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleRename(file, newName) {
    try {
      const authParam = account.session || account.token
      await provider.renameFile(authParam, file.id || file.path, newName)
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, name: newName } : f))
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !provider?.uploadFile) return
    setUploading(true)
    setUploadPct(0)
    try {
      const authParam = account.session || account.token
      await provider.uploadFile(authParam, file, currentFolderId, pct => setUploadPct(Math.round(pct * 100)))
      loadFiles(currentFolderId)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      setUploadPct(0)
    }
  }

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  if (!account) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', opacity: 0.4 }}>
        <CloudOff size={64} />
        <p>Selecione uma conta na sidebar</p>
      </div>
    )
  }

  if (account.needsReauth) {
    return <ReauthScreen account={account} />
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>

      {/* ── Toolbar ── */}
      <div className="fm-toolbar">
        {/* Breadcrumb */}
        <div className="fm-breadcrumb">
          <button onClick={() => navigateTo(-1)} style={{ background: 'none', border: 'none', padding: '0.2rem 0.4rem', fontSize: '0.8rem', opacity: breadcrumb.length === 0 ? 1 : 0.5 }}>
            <Home size={14} />
          </button>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <ChevronRight size={12} style={{ opacity: 0.3 }} />
              <button
                onClick={() => navigateTo(i)}
                style={{ background: 'none', border: 'none', padding: '0.2rem 0.4rem', fontSize: '0.8rem', opacity: i === breadcrumb.length - 1 ? 1 : 0.5, fontWeight: i === breadcrumb.length - 1 ? 700 : 400 }}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            <input
              className="fm-search"
              placeholder="Pesquisar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Upload */}
          <label title="Upload" style={{ cursor: 'pointer' }}>
            <input type="file" style={{ display: 'none' }} onChange={handleUpload} />
            <span className="icon-btn" title="Enviar arquivo"><Upload size={15} /></span>
          </label>

          {/* Refresh */}
          <button className="icon-btn" title="Atualizar" onClick={() => loadFiles(currentFolderId)}>
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          {/* View toggle */}
          <button className={`icon-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grade">
            <LayoutGrid size={15} />
          </button>
          <button className={`icon-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Lista">
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', background: 'var(--accent-primary)', borderRadius: 4 }}
            animate={{ width: `${uploadPct}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#ff6666' }}>
          {error}
        </div>
      )}

      {/* ── Content area ── */}
      {loading && files.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '0.75rem', opacity: 0.4 }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Carregando arquivos…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '0.5rem', opacity: 0.3 }}>
          <FolderPlus size={48} />
          <p style={{ fontSize: '0.9rem' }}>{search ? 'Nenhum resultado' : 'Pasta vazia'}</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode + currentFolderId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={viewMode === 'grid' ? 'file-grid' : 'file-list'}
          >
            {/* Folders first */}
            {filtered
              .sort((a, b) => (a.type === 'folder' ? -1 : 1) - (b.type === 'folder' ? -1 : 1) || a.name.localeCompare(b.name))
              .map(file => (
                <FileCard
                  key={file.id}
                  file={file}
                  viewMode={viewMode}
                  onOpen={handleFileOpen}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  onTransfer={setTransferFile}
                />
              ))
            }
          </motion.div>
        </AnimatePresence>
      )}
      </div>

      {/* Image lightbox */}
      <ImageLightbox preview={imagePreview} onClose={() => setImagePreview(null)} />
      
      {/* Transfer modal */}
      {transferFile && (
        <TransferModal
          file={transferFile}
          sourceAccountId={accountId}
          onClose={() => setTransferFile(null)}
        />
      )}
    </>
  )
}
