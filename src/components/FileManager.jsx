import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, List, Upload, FolderPlus, ChevronRight,
  Home, Loader2, RefreshCw, Search, CloudOff, X, Download,
  Trash2, Copy, CheckSquare, MoveRight
} from 'lucide-react'
import { CloudManager } from '../services/CloudManager'
import { useLang } from '../i18n'
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

function ReauthScreen({ account, onReauthGoogle, onReauthDropbox, onReauthOneDrive }) {
  const { t } = useLang()
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(account.providerId === 'mega') // Start loading for mega silent auth
  const [error, setError]       = useState('')
  const [showForm, setShowForm] = useState(account.providerId !== 'mega')

  // Try silent login on mount (MEGA ONLY)
  useEffect(() => {
    if (account.providerId !== 'mega') return
    let isMounted = true
    async function trySilentLogin() {
      try {
        const { decryptPassword, CloudManager } = await import('../services/CloudManager')
        const uid = CloudManager._uid
        const decrypted = await decryptPassword(uid, account._encryptedMegaPassword)
        if (decrypted && isMounted) {
          await CloudManager.connectMega(account.email, decrypted)
        } else if (isMounted) {
          setLoading(false)
          setShowForm(true)
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

  async function handleMegaReauth(e) {
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

  const isGoogle   = account.providerId === 'googledrive'
  const isDropbox  = account.providerId === 'dropbox'
  const isOneDrive = account.providerId === 'onedrive'
  const isMega     = account.providerId === 'mega'

  const providerName = isGoogle ? 'Google Drive' : isDropbox ? 'Dropbox' : isOneDrive ? 'OneDrive' : 'MEGA'
  const providerColor = isGoogle ? '#4285F4' : isDropbox ? '#0061FF' : isOneDrive ? '#0078D4' : '#D9272E'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}
      >
        <div style={{ 
          width: 48, height: 48, borderRadius: '12px', 
          background: `${providerColor}1a`, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          margin: '0 auto 1rem' 
        }}>
          {loading && !showForm ? (
            <Loader2 size={24} color={providerColor} style={{ animation: 'spin 1s linear infinite' }} />
          ) : isGoogle ? (
            <svg width="24" height="24" viewBox="0 0 87.3 78" fill="none"><path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/><path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.5C.4 49.9 0 51.45 0 53h27.5z" fill="#00AC47"/><path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#EA4335"/><path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D"/><path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z" fill="#2684FC"/><path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/></svg>
          ) : isMega ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#D9272E"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.836 17.52h-2.52V10.15l-3.3 5.48h-.033l-3.3-5.48v7.37H6.164V6.48h2.693l3.143 5.358 3.143-5.358h2.693v11.04z"/></svg>
          ) : isDropbox ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#0061FF"><path d="M6.1 4L1.5 7l4.6 3 4.6-3-4.6-3zm11.8 0l-4.6 3 4.6 3 4.6-3-4.6-3zM1.5 13l4.6 3 4.6-3-4.6-3-4.6 3zm16.4 0l4.6-3-4.6-3-4.6 3 4.6 3zm-7.2 1.2L6.1 11l-4.6 3 4.6 3 4.6-3zm1.4 0l4.6 3 4.6-3-4.6-3-4.6 3zM12 15.3l-4.6 3 4.6 3 4.6-3-4.6-3z" /></svg>
          ) : (
            <CloudOff size={24} color={providerColor} />
          )}
        </div>
        
        {loading && isMega && !showForm ? (
          <>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t('reauth.restoring')}</h3>
            <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.5rem' }}>{t('reauth.restoringDesc')}</p>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t('reauth.title')}</h3>
            <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {t('reauth.desc', { provider: providerName, email: account.email })}
            </p>

            {isMega ? (
              <form onSubmit={handleMegaReauth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                  <input
                    type="password"
                    placeholder={t('reauth.megaPassword')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
                  />
                </div>
                {error && <p style={{ color: '#ff4444', fontSize: '0.8rem', textAlign: 'left' }}>{error}</p>}
                <button className="primary" type="submit" disabled={!password || loading} style={{ justifyContent: 'center', padding: '0.75rem' }}>
                  {loading ? <span className="spin-small" /> : t('reauth.reconnect')}
                </button>
              </form>
            ) : (
              <button 
                className="primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                onClick={() => {
                  if (isGoogle) onReauthGoogle(account.email)
                  if (isDropbox) onReauthDropbox()
                  if (isOneDrive) onReauthOneDrive()
                }}
              >
                {t('reauth.reconnectNow')}
              </button>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}

// ── FileManager ───────────────────────────────────────────────────────────────

export default function FileManager({ 
  accountId, 
  onReauthGoogle, 
  onReauthMega, 
  onReauthDropbox, 
  onReauthOneDrive 
}) {
  const { t } = useLang()
  const [files,       setFiles]       = useState([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [viewMode,    setViewMode]    = useState('grid')  // 'grid' | 'list'
  const [search,      setSearch]      = useState('')
  const [breadcrumb,  setBreadcrumb]  = useState([])      // [{id, name}, ...]
  const [uploading,   setUploading]   = useState(false)
  const [uploadPct,   setUploadPct]   = useState(0)
  const [downloadProgress, setDownloadProgress] = useState('')
  const [imagePreview, setImagePreview] = useState(null) // { url, name }
  const [transferFile, setTransferFile] = useState(null) // file object or array to transfer
  const [transferAction, setTransferAction] = useState('copy') // 'copy' | 'move'
  const [selectedIds,  setSelectedIds]  = useState(new Set())

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
      const msg = e.message || ''
      if (msg.includes('invalid authentication credentials') || msg.includes('401')) {
        CloudManager.markNeedsReauth(accountId)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [accountId, account])

  useEffect(() => {
    if (accountId && !account?.needsReauth) {
      setBreadcrumb([])
      setSelectedIds(new Set())
      loadFiles(null)
    }
  }, [accountId, loadFiles, account?.needsReauth])

  function openFolder(folder) {
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }])
    setSelectedIds(new Set())
    loadFiles(folder.id)
  }

  function navigateTo(index) {
    setSelectedIds(new Set())
    if (index === -1) {
      setBreadcrumb([])
      loadFiles(null)
    } else {
      const crumb = breadcrumb[index]
      setBreadcrumb(prev => prev.slice(0, index + 1))
      loadFiles(crumb.id)
    }
  }

  // ── Selection helpers ────────────────────────────────────────────────────────

  function toggleSelect(file) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      const key = file.id || file.path
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function selectAll() {
    const onlyFiles = filtered.filter(f => f.type !== 'folder')
    setSelectedIds(new Set(onlyFiles.map(f => f.id || f.path)))
  }

  function clearSelection() { setSelectedIds(new Set()) }

  const selectedFiles = files.filter(f => selectedIds.has(f.id || f.path))
  const selectionActive = selectedIds.size > 0

  // ── Bulk actions ─────────────────────────────────────────────────────────────

  async function handleBulkDelete() {
    if (!confirm(t('fm.bulkDeleteConfirm', { n: selectedFiles.length }))) return
    try {
      setLoading(true)
      await CloudManager.deleteFiles(accountId, selectedFiles.map(f => f.id || f.path))
      setFiles(prev => prev.filter(f => !selectedIds.has(f.id || f.path)))
      clearSelection()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleBulkTransfer(action = 'copy') {
    setTransferAction(action)
    setTransferFile(selectedFiles)
  }

  // ── File operations ──────────────────────────────────────────────────────────

  async function handleFileOpen(file) {
    if (file.type === 'folder') { openFolder(file); return }
    if (!account) return

    try {
      const result = await CloudManager.getDownloadUrl(accountId, file.id || file.path, file)
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
      setError(`${t('fm.openError')}: ${e.message}`)
    }
  }

  async function handleDelete(file) {
    if (!confirm(t('fm.deleteConfirm', { name: file.name }))) return
    try {
      await CloudManager.deleteFile(accountId, file.id || file.path)
      setFiles(prev => prev.filter(f => f.id !== file.id))
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleRename(file, newName) {
    try {
      await CloudManager.renameFile(accountId, file.id || file.path, newName)
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, name: newName } : f))
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadPct(0)
    try {
      await CloudManager.uploadFile(accountId, file, currentFolderId, pct => setUploadPct(Math.round(pct * 100)))
      loadFiles(currentFolderId)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      setUploadPct(0)
    }
  }

  async function handleDownload(file) {
    if (file.type === 'file') {
      try {
        setDownloadProgress(`Baixando ${file.name}...`)
        const blob = await CloudManager.getFileBlob(accountId, file)
        const { saveAs } = await import('file-saver')
        saveAs(blob, file.name)
      } catch(e) {
        setError(`Erro no download: ${e.message}`)
      } finally {
        setDownloadProgress('')
      }
      return
    }

    // Download de pasta (ZIP)
    try {
      setDownloadProgress('Listando arquivos da pasta (pode demorar)...')
      
      const allFiles = []
      async function scanFolder(folderId, path = '') {
        const list = await CloudManager.listFiles(accountId, folderId)
        for (const f of list) {
          if (f.type === 'folder') {
            await scanFolder(f.id || f.path, path + f.name + '/')
          } else {
            f.zipPath = path + f.name
            allFiles.push(f)
          }
        }
      }
      
      await scanFolder(file.id || file.path, '')
      
      if (allFiles.length === 0) {
        alert('A pasta está vazia.')
        setDownloadProgress('')
        return
      }

      const JSZip = (await import('jszip')).default
      const { saveAs } = await import('file-saver')
      const zip = new JSZip()
      
      for (let i = 0; i < allFiles.length; i++) {
        const f = allFiles[i]
        setDownloadProgress(`Baixando para o ZIP (${i + 1}/${allFiles.length})...`)
        const blob = await CloudManager.getFileBlob(accountId, f)
        zip.file(f.zipPath, blob)
      }
      
      setDownloadProgress('Gerando arquivo ZIP final...')
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      saveAs(zipBlob, `${file.name}.zip`)
      
    } catch(e) {
      setError(`Erro no download da pasta: ${e.message}`)
    } finally {
      setDownloadProgress('')
    }
  }

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  if (!account) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', opacity: 0.4 }}>
        <CloudOff size={64} />
        <p>{t('fm.selectAccount')}</p>
      </div>
    )
  }

  if (account.needsReauth) {
    return (
      <ReauthScreen 
        account={account} 
        onReauthGoogle={onReauthGoogle}
        onReauthMega={onReauthMega}
        onReauthDropbox={onReauthDropbox}
        onReauthOneDrive={onReauthOneDrive}
      />
    )
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
              placeholder={t('fm.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Upload */}
          <label title={t('fm.upload')} style={{ cursor: 'pointer' }}>
            <input type="file" style={{ display: 'none' }} onChange={handleUpload} />
            <span className="icon-btn" title={t('fm.upload')}><Upload size={15} /></span>
          </label>

          {/* Refresh */}
          <button className="icon-btn" title={t('fm.refresh')} onClick={() => loadFiles(currentFolderId)}>
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          {/* View toggle */}
          <button className={`icon-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title={t('fm.gridView')}>
            <LayoutGrid size={15} />
          </button>
          <button className={`icon-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title={t('fm.listView')}>
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
      
      {/* Download progress */}
      {downloadProgress && (
        <div style={{ background: 'rgba(0, 242, 255, 0.1)', border: '1px solid rgba(0, 242, 255, 0.3)', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          {downloadProgress}
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
          <p style={{ fontSize: '0.9rem' }}>{search ? t('fm.noResults') : t('fm.empty')}</p>
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
                  onTransfer={(f, action = 'copy') => { setTransferAction(action); setTransferFile(f) }}
                  onDownload={handleDownload}
                  selected={selectedIds.has(file.id || file.path)}
                  onSelect={toggleSelect}
                />
              ))
            }
          </motion.div>
        </AnimatePresence>
      )}
      </div>

      {/* ── Bulk Toolbar (floating) ── */}
      <AnimatePresence>
        {selectionActive && (
          <motion.div
            className="bulk-toolbar"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckSquare size={16} color="var(--accent-primary)" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {t('fm.selected', { n: selectedIds.size, p: selectedIds.size > 1 ? 's' : '' })}
              </span>
            </div>

            <div style={{ height: 20, width: 1, background: 'rgba(255,255,255,0.12)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button className="icon-btn" title={t('fm.selectAll')} onClick={selectAll}>
                <CheckSquare size={15} />
              </button>
              <button className="icon-btn" title={t('fm.copySelected')} onClick={() => handleBulkTransfer('copy')}>
                <Copy size={15} />
              </button>
              <button className="icon-btn" title="Mover selecionados" onClick={() => handleBulkTransfer('move')}>
                <MoveRight size={15} />
              </button>
              <button className="icon-btn" title={t('fm.deleteSelected')} onClick={handleBulkDelete} style={{ color: '#ff4444' }}>
                <Trash2 size={15} />
              </button>
              <button className="icon-btn" title={t('fm.clearSelection')} onClick={clearSelection}>
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image lightbox */}
      <ImageLightbox preview={imagePreview} onClose={() => setImagePreview(null)} />
      
      {/* Transfer modal */}
      {transferFile && (
        <TransferModal
          file={Array.isArray(transferFile) ? null : transferFile}
          files={Array.isArray(transferFile) ? transferFile : null}
          sourceAccountId={accountId}
          action={transferAction}
          onClose={() => { setTransferFile(null); clearSelection() }}
          onSuccess={() => { loadFiles(currentFolderId); clearSelection() }}
        />
      )}
    </>
  )
}
