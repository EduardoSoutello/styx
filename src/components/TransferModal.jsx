import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudManager } from '../services/CloudManager'
import { useLang } from '../i18n'
import { ChevronRight, Folder, FolderPlus, X, Loader2, UploadCloud, FileText } from 'lucide-react'
import { PROVIDER_CONFIG } from './ProviderBadge'

export default function TransferModal({ file, files, sourceAccountId, onClose, action = 'copy', onSuccess }) {
  const [targetAccount, setTargetAccount] = useState(null)
  const [folders, setFolders] = useState([])
  const [breadcrumb, setBreadcrumb] = useState([])
  const [loading, setLoading] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const { t } = useLang()

  // Support both single file and array of files
  const isBulk = Array.isArray(files) && files.length > 0
  const displayName = isBulk ? t('transfer.files', { n: files.length, p: files.length > 1 ? 's' : '' }) : file?.name
  const itemsToTransfer = isBulk ? files : (file ? [file] : [])

  // Filter out the source account to avoid copying to the exact same account
  // (though technically allowed if different folders, usually cross-cloud means different account)
  const availableAccounts = CloudManager.accounts.filter(a => a.id !== sourceAccountId)

  const currentFolderId = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].id : null

  useEffect(() => {
    if (targetAccount) {
      loadFolders(null)
    }
  }, [targetAccount])

  async function loadFolders(folderId) {
    setLoading(true)
    setError(null)
    try {
      const result = await CloudManager.listFiles(targetAccount.id, folderId)
      // Only show folders for the destination picker
      setFolders(result.filter(f => f.type === 'folder'))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openFolder(folder) {
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }])
    loadFolders(folder.id)
  }

  function navigateBreadcrumb(index) {
    if (index === -1) {
      setBreadcrumb([])
      loadFolders(null)
    } else {
      const crumb = breadcrumb[index]
      setBreadcrumb(prev => prev.slice(0, index + 1))
      loadFolders(crumb.id)
    }
  }

  async function handleTransfer() {
    if (!targetAccount || itemsToTransfer.length === 0) return
    setTransferring(true)
    setError(null)
    setProgress(0)

    try {
      if (isBulk) {
        await CloudManager.transferFiles(sourceAccountId, targetAccount.id, itemsToTransfer, currentFolderId, (pct) => {
          setProgress(Math.round(pct * 100))
        })
      } else {
        await CloudManager.transferFile(sourceAccountId, targetAccount.id, itemsToTransfer[0], currentFolderId, (pct) => {
          setProgress(Math.round(pct * 100))
        })
      }

      if (action === 'move') {
        const itemIds = itemsToTransfer.map(f => f.id || f.path)
        await CloudManager.deleteFiles(sourceAccountId, itemIds)
      }

      onSuccess?.()
      onClose() // close on success
    } catch (err) {
      setError(err.message)
      setTransferring(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={e => e.stopPropagation()}
          className="card"
          style={{ width: '100%', maxWidth: 500, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}
        >
          {/* Header */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                {action === 'move' ? 'Mover para...' : t('transfer.title')}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
                {isBulk && <FileText size={13} style={{ opacity: 0.5 }} />}
                <p style={{ fontSize: '0.85rem', opacity: 0.5, margin: 0 }}>{displayName}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', opacity: 0.5, cursor: 'pointer' }}><X size={20} /></button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', minHeight: 300 }}>
            {transferring ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                <UploadCloud size={48} color="var(--accent-primary)" />
                <h4 style={{ margin: 0 }}>
                  {action === 'move' 
                    ? (isBulk ? \`Movendo \${itemsToTransfer.length} itens...\` : 'Movendo arquivo...')
                    : (isBulk ? t('transfer.transferringBulk', { n: itemsToTransfer.length, p: itemsToTransfer.length > 1 ? 's' : '' }) : t('transfer.transferring'))
                  }
                </h4>
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    style={{ height: '100%', background: 'var(--accent-gradient)', borderRadius: 3 }}
                  />
                </div>
                <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{t('transfer.progress', { pct: progress })}</p>
                <p style={{ fontSize: '0.75rem', opacity: 0.4, textAlign: 'center', marginTop: '1rem' }}>
                  {t('transfer.warning')}
                </p>
              </div>
            ) : !targetAccount ? (
              <>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', opacity: 0.8 }}>{t('transfer.selectAccount')}</h4>
                {availableAccounts.length === 0 ? (
                  <p style={{ fontSize: '0.9rem', opacity: 0.5, textAlign: 'center', marginTop: '2rem' }}>
                    {t('transfer.noAccounts')}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {availableAccounts.map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => setTargetAccount(acc)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px', cursor: 'pointer', color: 'white', textAlign: 'left'
                        }}
                      >
                        <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ transform: 'scale(1.5)' }}>{PROVIDER_CONFIG[acc.providerId]?.icon}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{acc.name}</div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{acc.email}</div>
                        </div>
                        <ChevronRight size={18} opacity={0.5} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Breadcrumb navigator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  <button onClick={() => setTargetAccount(null)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: 0 }}>
                    {t('transfer.accounts')}
                  </button>
                  <ChevronRight size={14} opacity={0.3} />
                  <button onClick={() => navigateBreadcrumb(-1)} style={{ background: 'none', border: 'none', color: breadcrumb.length === 0 ? 'white' : 'var(--accent-primary)', cursor: 'pointer', padding: 0 }}>
                    {targetAccount.name}
                  </button>
                  {breadcrumb.map((crumb, idx) => (
                    <span key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ChevronRight size={14} opacity={0.3} />
                      <button onClick={() => navigateBreadcrumb(idx)} style={{ background: 'none', border: 'none', color: idx === breadcrumb.length - 1 ? 'white' : 'var(--accent-primary)', cursor: 'pointer', padding: 0 }}>
                        {crumb.name}
                      </button>
                    </span>
                  ))}
                </div>

                {/* Folder list */}
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', opacity: 0.5 }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <button
                      onClick={() => {}} // Selects current folder, already handled by "Copiar Aqui"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                        background: 'rgba(0, 242, 255, 0.06)', border: '1px solid rgba(0, 242, 255, 0.2)',
                        borderRadius: '8px', cursor: 'pointer', color: 'white', textAlign: 'left', marginBottom: '0.5rem'
                      }}
                    >
                      <FolderPlus size={18} color="var(--accent-primary)" />
                      <span style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', fontWeight: 500 }}>{t('transfer.rootFolder')}</span>
                    </button>

                    {folders.map(f => (
                      <button
                        key={f.id}
                        onClick={() => openFolder(f)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                          background: 'transparent', border: 'none',
                          borderRadius: '8px', cursor: 'pointer', color: 'white', textAlign: 'left'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Folder size={18} fill="var(--accent-primary)" color="var(--accent-primary)" opacity={0.8} />
                        <span style={{ fontSize: '0.9rem' }}>{f.name}</span>
                      </button>
                    ))}
                    {folders.length === 0 && (
                      <p style={{ fontSize: '0.85rem', opacity: 0.4, textAlign: 'center', marginTop: '1rem' }}>
                        {t('transfer.noSubfolders')}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {error && (
              <div style={{ background: 'rgba(255,68,68,0.1)', color: '#ff4444', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', marginTop: '1rem' }}>
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          {targetAccount && !transferring && (
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'rgba(0,0,0,0.2)' }}>
              <button className="secondary" onClick={onClose} style={{ padding: '0.5rem 1rem' }}>{t('transfer.cancel')}</button>
              <button className="primary" onClick={handleTransfer} disabled={loading} style={{ padding: '0.5rem 1rem' }}>
                {action === 'move'
                  ? (isBulk ? \`Mover \${itemsToTransfer.length} itens para cá\` : 'Mover para cá')
                  : (isBulk ? t('transfer.copyBulk', { n: itemsToTransfer.length }) : t('transfer.copyHere'))
                }
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
