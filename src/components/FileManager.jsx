import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, List, Upload, FolderPlus, ChevronRight,
  Home, Loader2, RefreshCw, Search, CloudOff
} from 'lucide-react'
import { CloudManager } from '../services/CloudManager'
import FileCard from './FileCard'

export default function FileManager({ accountId }) {
  const [files,       setFiles]       = useState([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [viewMode,    setViewMode]    = useState('grid')  // 'grid' | 'list'
  const [search,      setSearch]      = useState('')
  const [breadcrumb,  setBreadcrumb]  = useState([])      // [{id, name}, ...]
  const [uploading,   setUploading]   = useState(false)
  const [uploadPct,   setUploadPct]   = useState(0)

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
    if (accountId) {
      setBreadcrumb([])
      loadFiles(null)
    }
  }, [accountId, loadFiles])

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

  function handleFileOpen(file) {
    if (file.type === 'folder') {
      openFolder(file)
    } else {
      // Open download URL
      if (provider && account) {
        const authParam = account.session || account.token
        const url = provider.getDownloadUrl(authParam, file.id || file.path)
        window.open(url, '_blank')
      }
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

  return (
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
                />
              ))
            }
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
