import { motion } from 'framer-motion'
import { Cloud, HardDrive, Plus } from 'lucide-react'
import { PROVIDER_CONFIG } from './ProviderBadge'
import StorageBar from './StorageBar'

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function HomeView({ accounts, onOpenAccount, onAddAccount }) {
  if (accounts.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: '1.5rem', textAlign: 'center'
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'rgba(0,242,255,0.06)',
          border: '1px solid rgba(0,242,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Cloud size={36} color="var(--accent-primary)" opacity={0.6} />
        </div>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.4rem' }}>Nenhuma nuvem conectada</h2>
          <p style={{ opacity: 0.45, marginTop: '0.4rem', fontSize: '0.9rem' }}>
            Adicione uma conta para começar a gerenciar seus arquivos
          </p>
        </div>
        <motion.button
          className="primary"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onAddAccount}
          style={{ gap: '0.5rem' }}
        >
          <Plus size={16} /> Adicionar Conta
        </motion.button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Minhas Nuvens</h2>
        <p style={{ opacity: 0.4, fontSize: '0.82rem', marginTop: '0.3rem' }}>
          {accounts.length} conta{accounts.length !== 1 ? 's' : ''} conectada{accounts.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="home-grid">
        {accounts.map((acc, i) => {
          const cfg = PROVIDER_CONFIG[acc.providerId] || { color: '#888', bg: 'rgba(136,136,136,0.1)', label: acc.providerId, icon: null }
          const pct = acc.quota?.total > 0 ? Math.round((acc.quota.used / acc.quota.total) * 100) : null

          return (
            <motion.div
              key={acc.id}
              className="home-account-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.03, borderColor: cfg.color + '66' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpenAccount(acc.id)}
              style={{ '--provider-color': cfg.color }}
            >
              {/* Provider icon large */}
              <div style={{
                width: 64, height: 64,
                borderRadius: 20,
                background: cfg.bg,
                border: `1px solid ${cfg.color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1rem',
                flexShrink: 0
              }}>
                <span style={{ transform: 'scale(3)', display: 'flex' }}>
                  {cfg.icon}
                </span>
              </div>

              {/* Provider name */}
              <div style={{ marginBottom: '0.25rem' }}>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700,
                  color: cfg.color, textTransform: 'uppercase',
                  letterSpacing: '0.08em', opacity: 0.9
                }}>
                  {cfg.label}
                </span>
              </div>

              {/* Account name */}
              <h3 style={{
                fontSize: '0.95rem', fontWeight: 700,
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', width: '100%',
                marginBottom: '0.15rem'
              }}>
                {acc.name}
              </h3>

              {/* Email */}
              <p style={{
                fontSize: '0.72rem', opacity: 0.45,
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', width: '100%',
                marginBottom: '1rem'
              }}>
                {acc.email}
              </p>

              {/* Storage */}
              {acc.quota?.total > 0 ? (
                <div style={{ width: '100%', marginTop: 'auto' }}>
                  <StorageBar used={acc.quota.used} total={acc.quota.total} color={cfg.color} />
                  {pct !== null && (
                    <p style={{ fontSize: '0.65rem', opacity: 0.4, marginTop: '0.4rem', textAlign: 'right' }}>
                      {pct}% usado
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: 0.35 }}>
                  <HardDrive size={12} />
                  <span style={{ fontSize: '0.7rem' }}>Armazenamento ilimitado</span>
                </div>
              )}

              {/* Hover arrow indicator */}
              <div className="home-card-arrow">→</div>
            </motion.div>
          )
        })}

        {/* Add account card */}
        <motion.div
          className="home-account-card home-add-card"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAddAccount}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: accounts.length * 0.07 }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'rgba(0,242,255,0.06)',
            border: '1px dashed rgba(0,242,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <Plus size={24} color="var(--accent-primary)" opacity={0.6} />
          </div>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', opacity: 0.6 }}>Adicionar Conta</p>
          <p style={{ fontSize: '0.75rem', opacity: 0.35, marginTop: '0.25rem' }}>
            Google Drive, MEGA, Dropbox, OneDrive
          </p>
        </motion.div>
      </div>
    </div>
  )
}
