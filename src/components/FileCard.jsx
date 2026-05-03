import { motion } from 'framer-motion'
import {
  Folder, FileText, FileImage, FileVideo, FileAudio, File,
  MoreVertical, Download, Trash2, Edit3, Copy, MoveRight
} from 'lucide-react'
import { useState } from 'react'
import ProviderBadge from './ProviderBadge'
import { useLang } from '../i18n'

function FileIcon({ mimeType, type, size = 32 }) {
  if (type === 'folder') return <Folder size={size} color="#f59e0b" />

  const m = mimeType || ''
  if (m.startsWith('image/'))  return <FileImage  size={size} color="#10b981" />
  if (m.startsWith('video/'))  return <FileVideo  size={size} color="#6366f1" />
  if (m.startsWith('audio/'))  return <FileAudio  size={size} color="#00f2ff" />
  if (m.includes('pdf'))       return <FileText   size={size} color="#f87171" />
  if (m.includes('zip') || m.includes('rar')) return <File size={size} color="#a78bfa" />
  return <FileText size={size} color="#94a3b8" />
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function FileCard({ 
  file, onOpen, onDelete, onRename, onTransfer, onDownload,
  showProvider = false, viewMode = 'grid',
  selected = false, onSelect
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName]   = useState(file.name)
  const { t } = useLang()

  function handleRenameSubmit(e) {
    e.preventDefault()
    if (newName.trim() && newName !== file.name) onRename?.(file, newName.trim())
    setRenaming(false)
  }

  if (viewMode === 'list') {
    return (
      <motion.div
        className="file-list-item"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ background: 'rgba(255,255,255,0.04)' }}
        onClick={() => onOpen?.(file)}
        style={{ cursor: 'pointer' }}
      >
        <div 
          onClick={e => { e.stopPropagation(); onSelect?.(file) }}
          style={{ 
            padding: '0 0.5rem', display: 'flex', alignItems: 'center', 
            opacity: selected ? 1 : 0.2, cursor: 'pointer' 
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => { if(!selected) e.currentTarget.style.opacity = 0.2 }}
        >
          <div style={{ 
            width: 18, height: 18, borderRadius: 4, 
            border: `2px solid ${selected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.4)'}`,
            background: selected ? 'var(--accent-primary)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {selected && <div style={{ width: 8, height: 8, background: 'black', borderRadius: 1 }} />}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
          {file.thumbnail
            ? <img src={file.thumbnail} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
            : <FileIcon mimeType={file.mimeType} type={file.type} size={22} />
          }
          {renaming ? (
            <form onSubmit={handleRenameSubmit} onClick={e => e.stopPropagation()}>
              <input
                className="rename-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onBlur={() => setRenaming(false)}
                autoFocus
              />
            </form>
          ) : (
            <span style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
          {showProvider && <ProviderBadge providerId={file.provider} />}
          <span style={{ fontSize: '0.72rem', opacity: 0.4, width: 80, textAlign: 'right' }}>{formatBytes(file.size)}</span>
          <span style={{ fontSize: '0.72rem', opacity: 0.4, width: 100, textAlign: 'right' }}>{formatDate(file.modifiedAt)}</span>
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(m => !m) }}
              style={{ background: 'none', border: 'none', padding: '0.3rem' }}
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div className="file-menu" onClick={e => e.stopPropagation()}>
                <button onClick={() => { onRename && setRenaming(true); setMenuOpen(false) }}><Edit3 size={12} /> {t('file.rename')}</button>
                <button onClick={() => { onTransfer?.(file, 'copy'); setMenuOpen(false) }}><Copy size={12} /> {t('file.copyTo')}</button>
                <button onClick={() => { onTransfer?.(file, 'move'); setMenuOpen(false) }}><MoveRight size={12} /> Mover para...</button>
                <button onClick={() => { onDownload?.(file); setMenuOpen(false) }}><Download size={12} /> {t('file.download')}</button>
                <button onClick={() => { onDelete?.(file); setMenuOpen(false) }} style={{ color: '#ff4444' }}><Trash2 size={12} /> {t('file.delete')}</button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // Grid view
  return (
    <motion.div
      className="file-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, borderColor: 'var(--accent-primary)' }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onOpen?.(file)}
      style={{ 
        cursor: 'pointer', position: 'relative',
        background: selected ? 'rgba(0, 242, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
        borderColor: selected ? 'var(--accent-primary)' : 'var(--border-color)'
      }}
    >
      {/* Selection Checkbox */}
      <div 
        onClick={e => { e.stopPropagation(); onSelect?.(file) }}
        style={{ 
          position: 'absolute', top: '0.5rem', left: '0.5rem', zIndex: 10,
          width: 22, height: 22, borderRadius: 6,
          background: selected ? 'var(--accent-primary)' : 'rgba(0,0,0,0.3)',
          border: `2px solid ${selected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          opacity: selected ? 1 : 0,
          transition: 'all 0.2s ease'
        }}
        className="selection-checkbox"
      >
        {selected && <div style={{ width: 10, height: 10, background: 'black', borderRadius: 1 }} />}
      </div>

      {/* Thumbnail or icon */}
      <div className="file-card-thumb">
        {file.thumbnail
          ? <img src={file.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <FileIcon mimeType={file.mimeType} type={file.type} size={40} />
        }
      </div>

      {/* Provider badge overlay */}
      {showProvider && (
        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
          <ProviderBadge providerId={file.provider} />
        </div>
      )}

      {/* Info */}
      <div style={{ padding: '0.6rem' }}>
        {renaming ? (
          <form onSubmit={handleRenameSubmit} onClick={e => e.stopPropagation()}>
            <input className="rename-input" value={newName} onChange={e => setNewName(e.target.value)} onBlur={() => setRenaming(false)} autoFocus />
          </form>
        ) : (
          <p style={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.name}
          </p>
        )}
        <p style={{ fontSize: '0.68rem', opacity: 0.4, marginTop: '0.15rem' }}>
          {file.type === 'folder' ? t('file.folder') : formatBytes(file.size) || (file.mimeType?.split('/')[1]?.toUpperCase() ?? t('file.file'))}
        </p>
      </div>

      {/* Context menu trigger */}
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: '0.4rem', right: '0.4rem' }}>
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(m => !m) }}
          style={{ background: 'rgba(0,0,0,0.5)', border: 'none', padding: '0.25rem', borderRadius: '6px', opacity: 0 }}
          className="file-card-menu-btn"
        >
          <MoreVertical size={12} />
        </button>
        {menuOpen && (
          <div className="file-menu" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setRenaming(true); setMenuOpen(false) }}><Edit3 size={12} /> {t('file.rename')}</button>
            <button onClick={() => { onTransfer?.(file, 'copy'); setMenuOpen(false) }}><Copy size={12} /> {t('file.copyTo')}</button>
            <button onClick={() => { onTransfer?.(file, 'move'); setMenuOpen(false) }}><MoveRight size={12} /> Mover para...</button>
            <button onClick={() => { onDownload?.(file); setMenuOpen(false) }}><Download size={12} /> {t('file.download')}</button>
            <button onClick={() => { onDelete?.(file); setMenuOpen(false) }} style={{ color: '#ff4444' }}><Trash2 size={12} /> {t('file.delete')}</button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
