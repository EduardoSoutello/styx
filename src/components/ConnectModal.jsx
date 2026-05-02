import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, Eye, EyeOff, ExternalLink, AlertTriangle } from 'lucide-react'
import { PROVIDER_CONFIG } from './ProviderBadge'
import { useLang } from '../i18n'

export default function ConnectModal({ onClose, onConnectGoogle, onConnectMega, onConnectDropbox, onConnectOneDrive }) {
  const { t } = useLang()
  const PROVIDERS_LIST = [
    {
      id: 'googledrive',
      authType: 'oauth',
      description: t('connect.google'),
      available: true
    },
    {
      id: 'mega',
      authType: 'credentials',
      description: t('connect.mega'),
      available: true
    },
    {
      id: 'onedrive',
      authType: 'oauth',
      description: !!import.meta.env.VITE_ONEDRIVE_CLIENT_ID ? t('connect.onedrive') : 'Requer VITE_ONEDRIVE_CLIENT_ID',
      available: !!import.meta.env.VITE_ONEDRIVE_CLIENT_ID,
      inDev: true
    },
    {
      id: 'dropbox',
      authType: 'oauth',
      description: !!import.meta.env.VITE_DROPBOX_CLIENT_ID ? t('connect.dropbox') : 'Requer VITE_DROPBOX_CLIENT_ID',
      available: !!import.meta.env.VITE_DROPBOX_CLIENT_ID,
      inDev: true
    }
  ]

  const [step, setStep]           = useState('pick')      // 'pick' | 'mega-form'
  const [selectedId, setSelected] = useState(null)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  async function handleSelect(provider) {
    setError(null)
    if (provider.id === 'mega') {
      setSelected('mega')
      setStep('mega-form')
      return
    }
    if (!provider.available) return

    setLoading(true)
    setSelected(provider.id)
    try {
      if (provider.id === 'googledrive') await onConnectGoogle()
      if (provider.id === 'dropbox')     await onConnectDropbox()
      if (provider.id === 'onedrive')    await onConnectOneDrive()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleMegaSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onConnectMega(email, password)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 2000
        }}
      />

      {/* Modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2001,
          padding: '1rem'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="connect-modal">
          {/* Header */}
          <div className="connect-modal-header">
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {step === 'pick' ? t('connect.title') : t('connect.megaTitle')}
              </h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.2rem' }}>
                {step === 'pick' ? t('connect.subtitle') : t('connect.megaSubtitle')}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: '10px' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Provider grid */}
          {step === 'pick' && (
            <div className="provider-grid">
              {PROVIDERS_LIST.map(p => {
                const cfg = PROVIDER_CONFIG[p.id]
                const isLoading = loading && selectedId === p.id
                return (
                  <motion.button
                    key={p.id}
                    className={`provider-card ${!p.available ? 'disabled' : ''}`}
                    whileHover={p.available ? { scale: 1.03 } : {}}
                    whileTap={p.available ? { scale: 0.97 } : {}}
                    onClick={() => handleSelect(p)}
                    disabled={isLoading}
                    style={{ borderColor: p.available ? `${cfg.color}44` : 'transparent' }}
                  >
                    <div style={{
                      width: 48, height: 48,
                      borderRadius: 14,
                      background: cfg.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${cfg.color}44`,
                      flexShrink: 0
                    }}>
                      {/* Larger icon inside card */}
                      <span style={{ transform: 'scale(2)' }}>{cfg.icon}</span>
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: cfg.color }}>
                        {cfg.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: '0.1rem' }}>
                        {p.description}
                      </div>
                    </div>
                    {!p.available && (
                      <span style={{ fontSize: '0.65rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <AlertTriangle size={12} /> Config
                      </span>
                    )}
                    {p.inDev && p.available && (
                      <span style={{ 
                        fontSize: '0.6rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem',
                        background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)',
                        padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 600, whiteSpace: 'nowrap'
                      }}>
                        <AlertTriangle size={11} /> {t('connect.inDev')}
                      </span>
                    )}
                    {p.authType === 'oauth' && p.available && !p.inDev && (
                      <ExternalLink size={14} style={{ opacity: 0.3 }} />
                    )}
                    {isLoading && (
                      <div className="spin-small" />
                    )}
                  </motion.button>
                )
              })}
            </div>
          )}

          {/* MEGA credentials form */}
          {step === 'mega-form' && (
            <form onSubmit={handleMegaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label><Mail size={14} /> Email</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label><Lock size={14} /> {t('connect.megaPassword')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', padding: '0.25rem'
                    }}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ color: '#ff4444', fontSize: '0.8rem', background: 'rgba(255,68,68,0.1)', padding: '0.6rem 0.75rem', borderRadius: '10px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setStep('pick')} style={{ flex: 1 }}>
                  {t('connect.megaBack')}
                </button>
                <button type="submit" className="primary" style={{ flex: 2, justifyContent: 'center' }} disabled={loading}>
                  {loading ? t('connect.megaConnecting') : t('connect.megaConnect')}
                </button>
              </div>
            </form>
          )}

          {error && step === 'pick' && (
            <div style={{ marginTop: '1rem', color: '#ff4444', fontSize: '0.8rem', background: 'rgba(255,68,68,0.1)', padding: '0.6rem 0.75rem', borderRadius: '10px' }}>
              {error}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
