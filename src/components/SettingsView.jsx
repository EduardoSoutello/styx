import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, CreditCard, Info, LogOut, Trash2, ExternalLink, ShieldCheck, Zap, Crown } from 'lucide-react'
import { useLang } from '../i18n'

export default function SettingsView({ currentUser, userData, onLogout, onShowLegal }) {
  const { t } = useLang()
  const [activeTab, setActiveTab] = useState('account')
  const [loadingPlan, setLoadingPlan] = useState(false)

  const isPro = userData?.plan === 'pro' || userData?.isOwner
  const isOwner = userData?.isOwner

  const handleUpgrade = async (planType) => {
    setLoadingPlan(true)
    try {
      const response = await fetch('/api/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          email: currentUser.email,
          planType: planType
        })
      })
      const data = await response.json()
      if (data.init_point) {
        window.location.href = data.init_point
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      alert('Erro ao processar pagamento. Tente novamente.')
    } finally {
      setLoadingPlan(false)
    }
  }

  const tabs = [
    { id: 'account', label: t('settings.tabs.account'), icon: User },
    { id: 'plan', label: t('settings.tabs.plan'), icon: CreditCard },
    { id: 'about', label: t('settings.tabs.about'), icon: Info },
  ]

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('settings.title')}</h1>
      </header>

      <div style={{ display: 'flex', gap: '2rem', flexDirection: 'row', minHeight: '400px' }}>
        {/* Sidebar Tabs */}
        <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.9rem'
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', padding: '2rem' }}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'account' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '20px', 
                    background: isOwner ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'linear-gradient(135deg, var(--accent-primary) 0%, #7000ff 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#fff',
                    boxShadow: isOwner ? '0 0 20px rgba(249,115,22,0.3)' : 'none'
                  }}>
                    {isOwner ? <Crown size={32} /> : (currentUser?.displayName?.[0] || currentUser?.email?.[0]?.toUpperCase())}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {currentUser?.displayName || 'Usuário Neblina'}
                      {isOwner && <span style={{ fontSize: '0.65rem', background: '#f97316', color: '#fff', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>Owner</span>}
                    </h3>
                    <p style={{ fontSize: '0.85rem', opacity: 0.5 }}>{currentUser?.email}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
                  <button 
                    onClick={onLogout}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      color: '#fff', 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 600
                    }}
                  >
                    <LogOut size={16} />
                    {t('settings.account.logout')}
                  </button>

                  <button 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      color: '#ef4444', 
                      background: 'rgba(239,68,68,0.05)', 
                      border: '1px solid rgba(239,68,68,0.1)',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 600
                    }}
                  >
                    <Trash2 size={16} />
                    {t('settings.account.delete')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'plan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Current Plan */}
                <div style={{ 
                  background: isPro ? 'linear-gradient(135deg, rgba(112,0,255,0.2) 0%, rgba(0,242,255,0.15) 100%)' : 'rgba(255,255,255,0.03)', 
                  borderRadius: '16px', 
                  padding: '1.5rem', 
                  border: isPro ? '1px solid rgba(0,242,255,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {isPro && (
                    <div style={{ position: 'absolute', top: '-20%', right: '-5%', opacity: 0.1 }}>
                      <Zap size={100} color="#fff" />
                    </div>
                  )}
                  
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.4, textTransform: 'uppercase' }}>{t('settings.plan.current')}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isOwner ? 'Neblina Owner' : (isPro ? t('settings.plan.pro') : t('settings.plan.free'))}
                      {isPro && <Zap size={16} fill="currentColor" />}
                    </h3>
                    <div style={{ 
                      background: isPro ? '#f97316' : 'rgba(255,255,255,0.05)', 
                      color: isPro ? '#fff' : 'rgba(255,255,255,0.6)', 
                      padding: '0.35rem 0.85rem', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem', 
                      fontWeight: 800,
                      boxShadow: isPro ? '0 4px 12px rgba(249,115,22,0.3)' : 'none'
                    }}>
                      {isPro ? 'ATIVO' : 'FREE'}
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.7 }}>
                    {isOwner ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f97316', fontWeight: 700 }}>
                        <Crown size={14} /> Acesso Vitalício (Lifetime)
                      </div>
                    ) : isPro ? (
                      <div>
                        {t('settings.plan.proDesc')}<br/>
                        <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Renovação automática ativa</span>
                      </div>
                    ) : (
                      <div style={{ opacity: 0.5 }}>
                        • Até 2 contas conectadas<br/>
                        • Transferências padrão
                      </div>
                    )}
                  </div>
                </div>

                {/* Pro Plans - Show only if not pro */}
                {!isPro && (
                  <div style={{ 
                    background: 'linear-gradient(135deg, rgba(112,0,255,0.1) 0%, rgba(0,242,255,0.05) 100%)', 
                    borderRadius: '20px', 
                    padding: '1.5rem', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {t('settings.plan.pro')} <Zap size={18} fill="currentColor" />
                    </h3>
                    <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.5rem' }}>
                      {t('settings.plan.proDesc')}
                    </p>

                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      {/* Monthly */}
                      <div style={{ background: 'rgba(255,255,255,0.06)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t('settings.plan.monthly')}</span>
                        <button 
                          onClick={() => handleUpgrade('monthly')}
                          disabled={loadingPlan}
                          style={{ display: 'block', width: '100%', marginTop: '1rem', padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', cursor: loadingPlan ? 'wait' : 'pointer' }}
                        >
                          {loadingPlan ? '...' : t('settings.plan.upgrade')}
                        </button>
                      </div>

                      {/* Annual */}
                      <div style={{ background: 'rgba(0,242,255,0.15)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(0,242,255,0.3)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '10px', background: '#00ff41', color: '#000', fontSize: '0.65rem', fontWeight: 900, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>
                          {t('settings.plan.save')}
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t('settings.plan.annual')}</span>
                        <button 
                          onClick={() => handleUpgrade('annual')}
                          disabled={loadingPlan}
                          style={{ display: 'block', width: '100%', marginTop: '1rem', padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'var(--accent-primary)', color: '#0e1016', textAlign: 'center', fontWeight: 800, fontSize: '0.85rem', cursor: loadingPlan ? 'wait' : 'pointer' }}
                        >
                          {loadingPlan ? '...' : t('settings.plan.upgrade')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <img src="/Neblina_logo2.png" alt="Neblina" style={{ height: '60px', marginBottom: '1rem' }} />
                  <p style={{ fontSize: '0.95rem', opacity: 0.8, maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
                    {t('settings.about.desc')}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ opacity: 0.5 }}>{t('settings.about.version')}</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>2.1.0</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ opacity: 0.5 }}>{t('settings.about.dev')}</span>
                    <span style={{ fontWeight: 700 }}>Eduardo Soutello</span>
                  </div>
                  
                  <a 
                    href="https://eduardosoutello.vercel.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      marginTop: '2rem', 
                      padding: '0.6rem 1.25rem', 
                      borderRadius: '30px', 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      textDecoration: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      justifyContent: 'center'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    {t('settings.about.portfolio')}
                    <ExternalLink size={14} />
                  </a>

                  <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', textAlign: 'center' }}>
                    <button 
                      onClick={onShowLegal}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {t('sidebar.legal')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
