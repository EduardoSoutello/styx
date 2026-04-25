import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudManager } from '../services/CloudManager'
import { ChevronRight, Folder, FolderPlus, X, Loader2, UploadCloud } from 'lucide-react'

export default function TransferModal({ file, sourceAccountId, onClose }) {
  const [targetAccount, setTargetAccount] = useState(null)
  const [folders, setFolders] = useState([])
  const [breadcrumb, setBreadcrumb] = useState([])
  const [loading, setLoading] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

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
    if (!targetAccount) return
    setTransferring(true)
    setError(null)
    setProgress(0)

    try {
      await CloudManager.transferFile(sourceAccountId, targetAccount.id, file, currentFolderId, (pct) => {
        setProgress(Math.round(pct * 100))
      })
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
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Copiar para...</h3>
              <p style={{ fontSize: '0.85rem', opacity: 0.5, margin: '0.2rem 0 0 0' }}>{file.name}</p>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', opacity: 0.5, cursor: 'pointer' }}><X size={20} /></button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', minHeight: 300 }}>
            {transferring ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                <UploadCloud size={48} color="#0a84ff" />
                <h4 style={{ margin: 0 }}>Transferindo arquivo...</h4>
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    style={{ height: '100%', background: '#0a84ff' }}
                  />
                </div>
                <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{progress}% concluído</p>
                <p style={{ fontSize: '0.75rem', opacity: 0.4, textAlign: 'center', marginTop: '1rem' }}>
                  Não feche esta aba. A transferência está ocorrendo através do seu navegador.
                </p>
              </div>
            ) : !targetAccount ? (
              <>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', opacity: 0.8 }}>Selecione a conta de destino</h4>
                {availableAccounts.length === 0 ? (
                  <p style={{ fontSize: '0.9rem', opacity: 0.5, textAlign: 'center', marginTop: '2rem' }}>
                    Nenhuma outra conta conectada.
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
                        <img src={`/${acc.providerId}.svg`} alt={acc.providerId} style={{ width: 24, height: 24 }} />
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
                  <button onClick={() => setTargetAccount(null)} style={{ background: 'none', border: 'none', color: '#0a84ff', cursor: 'pointer', padding: 0 }}>
                    Contas
                  </button>
                  <ChevronRight size={14} opacity={0.3} />
                  <button onClick={() => navigateBreadcrumb(-1)} style={{ background: 'none', border: 'none', color: breadcrumb.length === 0 ? 'white' : '#0a84ff', cursor: 'pointer', padding: 0 }}>
                    {targetAccount.name}
                  </button>
                  {breadcrumb.map((crumb, idx) => (
                    <span key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ChevronRight size={14} opacity={0.3} />
                      <button onClick={() => navigateBreadcrumb(idx)} style={{ background: 'none', border: 'none', color: idx === breadcrumb.length - 1 ? 'white' : '#0a84ff', cursor: 'pointer', padding: 0 }}>
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
                        background: 'rgba(10, 132, 255, 0.1)', border: '1px solid rgba(10, 132, 255, 0.3)',
                        borderRadius: '8px', cursor: 'pointer', color: 'white', textAlign: 'left', marginBottom: '0.5rem'
                      }}
                    >
                      <FolderPlus size={18} color="#0a84ff" />
                      <span style={{ fontSize: '0.9rem', color: '#0a84ff', fontWeight: 500 }}>Raiz desta pasta</span>
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
                        <Folder size={18} fill="#0a84ff" color="#0a84ff" opacity={0.8} />
                        <span style={{ fontSize: '0.9rem' }}>{f.name}</span>
                      </button>
                    ))}
                    {folders.length === 0 && (
                      <p style={{ fontSize: '0.85rem', opacity: 0.4, textAlign: 'center', marginTop: '1rem' }}>
                        Nenhuma subpasta.
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
              <button className="secondary" onClick={onClose} style={{ padding: '0.5rem 1rem' }}>Cancelar</button>
              <button className="primary" onClick={handleTransfer} disabled={loading} style={{ padding: '0.5rem 1rem' }}>
                Copiar Aqui
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
