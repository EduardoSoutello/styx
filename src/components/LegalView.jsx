import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, FileText, Lock, Eye } from 'lucide-react'
import { useLang } from '../i18n'

export default function LegalView({ isOpen, onClose, isStatic = false }) {
  const { t } = useLang()

  if (!isOpen) return null

  const containerStyle = isStatic ? {
    minHeight: '100vh',
    background: '#0e1016',
    display: 'flex',
    justifyContent: 'center',
    padding: '2rem 1rem'
  } : {
    position: 'fixed',
    inset: 0,
    zIndex: 3000,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(15px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem'
  }

  const modalStyle = isStatic ? {
    width: '100%',
    maxWidth: '800px',
    background: 'rgba(14,16,22,0.98)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 50px 100px rgba(0,0,0,0.8)',
    height: 'fit-content'
  } : {
    width: '100%',
    maxWidth: '800px',
    maxHeight: '85vh',
    background: 'rgba(14,16,22,0.98)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 50px 100px rgba(0,0,0,0.8)'
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={isStatic ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={containerStyle}
        onClick={isStatic ? undefined : onClose}
      >
        <motion.div
          initial={isStatic ? {} : { scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          style={modalStyle}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <header style={{ 
            padding: '1.5rem 2rem', 
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Shield size={20} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('sidebar.legal')}</h2>
            </div>
            {isStatic ? (
              <button 
                onClick={() => window.location.href = '/'}
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '12px', 
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer', 
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                Neblina App
              </button>
            ) : (
              <button 
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
              >
                <X size={18} />
              </button>
            )}
          </header>

          {/* Scrollable Content */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '2rem', 
            lineHeight: 1.6, 
            color: 'rgba(255,255,255,0.85)',
            fontSize: '0.95rem'
          }}>
            {/* TERMS SECTION */}
            {(window.location.pathname === '/terms' || !isStatic) && (
              <section style={{ marginBottom: isStatic ? '0' : '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#fff' }}>
                  <FileText size={18} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{t('auth.terms')}</h3>
                </div>
                <p style={{ marginBottom: '1rem' }}>
                  Bem-vindo à Neblina. Ao utilizar nossos serviços, você concorda com as seguintes condições:
                </p>
                <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <li><strong>Uso Responsável:</strong> A Neblina é uma ferramenta de gestão. Você é o único responsável pelos arquivos que transfere ou armazena através da plataforma.</li>
                  <li><strong>Propriedade Intelectual:</strong> Não reivindicamos nenhum direito sobre seus arquivos. Seus dados permanecem sendo seus.</li>
                  <li><strong>Limitação de Responsabilidade:</strong> A Neblina fornece integração com serviços de terceiros (Google, MEGA, etc). Não nos responsabilizamos por falhas nestes serviços externos.</li>
                </ul>
              </section>
            )}

            {/* DIVIDER if showing both */}
            {!isStatic && <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '2rem 0' }} />}

            {/* PRIVACY SECTION */}
            {(window.location.pathname === '/privacy' || !isStatic) && (
              <section style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#fff' }}>
                  <Lock size={18} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{t('auth.privacy')}</h3>
                </div>
                <p style={{ marginBottom: '1rem' }}>
                  Sua privacidade é nossa prioridade técnica. Veja como tratamos seus dados:
                </p>
                <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>
                      <Eye size={16} />
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>O que NÃO vemos</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                      Não temos acesso ao conteúdo dos seus arquivos. Todo o tráfego ocorre entre o seu navegador e os provedores de nuvem.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#00ff41' }}>
                      <Lock size={16} />
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Senhas e Tokens</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                      Senhas do MEGA são criptografadas com AES-GCM usando seu UID exclusivo como chave.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Footer */}
          <footer style={{ 
            padding: '1.25rem 2rem', 
            borderTop: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
            fontSize: '0.8rem',
            opacity: 0.4
          }}>
            Neblina — Smart Cloud Management // Última atualização: 01 de Maio de 2026
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
