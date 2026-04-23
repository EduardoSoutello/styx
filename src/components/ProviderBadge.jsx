import { motion } from 'framer-motion'

const PROVIDER_CONFIG = {
  googledrive: {
    label: 'Google Drive',
    color: '#4285F4',
    bg: 'rgba(66,133,244,0.12)',
    icon: (
      <svg viewBox="0 0 87.3 78" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
      </svg>
    )
  },
  dropbox: {
    label: 'Dropbox',
    color: '#0061FF',
    bg: 'rgba(0,97,255,0.12)',
    icon: (
      <svg viewBox="0 0 40 36" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
        <path fill="#0061FF" d="M20 7.1L10 13.4l10 6.3-10 6.3L0 19.7l10-6.3L0 7.1 10 .8zm-10 20.9l10-6.3 10 6.3-10 6.3zm10-8.2l10-6.3-10-6.3 10-6.3 10 6.3-10 6.3z"/>
      </svg>
    )
  },
  onedrive: {
    label: 'OneDrive',
    color: '#0078D4',
    bg: 'rgba(0,120,212,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
        <path fill="#0078D4" d="M14.5 10.5c.4-1 .5-2 .3-3.1C14.4 5 12.9 3.3 11 2.7c-2.6-.9-5.5.5-6.4 3.1-.1.4-.2.8-.2 1.2C2 7.3 0 9.4 0 12c0 2.8 2.2 5 5 5h14c2.2 0 4-1.8 4-4 0-2-1.5-3.7-3.5-4z"/>
      </svg>
    )
  },
  mega: {
    label: 'MEGA',
    color: '#D9272E',
    bg: 'rgba(217,39,46,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
        <path fill="#D9272E" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.9 16.4h-1.5V9.6L12 14.4l-4.4-4.8v6.8H6.1V7.6L12 13.9l5.9-6.3v8.8z"/>
      </svg>
    )
  }
}

export default function ProviderBadge({ providerId, showLabel = false, size = 'sm' }) {
  const cfg = PROVIDER_CONFIG[providerId] || {
    label: providerId, color: '#888', bg: 'rgba(136,136,136,0.12)', icon: null
  }

  const sizes = { sm: 22, md: 30, lg: 40 }
  const dim = sizes[size] || 22

  return (
    <motion.div
      className="provider-badge"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        background: cfg.bg,
        border: `1px solid ${cfg.color}33`,
        borderRadius: '8px',
        padding: size === 'lg' ? '0.5rem 0.75rem' : '0.25rem 0.5rem',
        width: showLabel ? 'auto' : dim,
        height: showLabel ? 'auto' : dim,
        justifyContent: 'center',
        flexShrink: 0
      }}
      title={cfg.label}
    >
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {cfg.icon}
      </span>
      {showLabel && (
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: cfg.color, whiteSpace: 'nowrap' }}>
          {cfg.label}
        </span>
      )}
    </motion.div>
  )
}

export { PROVIDER_CONFIG }
