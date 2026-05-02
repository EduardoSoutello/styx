import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, RefreshCw, LogOut } from 'lucide-react'
import { resendVerificationEmail, refreshUser, signOut } from '../../services/AuthService'

export default function EmailVerifyScreen({ user }) {
  const [resending, setResending]   = useState(false)
  const [checking,  setChecking]    = useState(false)
  const [resentMsg, setResentMsg]   = useState('')
  const [error,     setError]       = useState('')

  async function handleResend() {
    setError('')
    setResentMsg('')
    setResending(true)
    try {
      await resendVerificationEmail()
      setResentMsg('Email reenviado! Verifique sua caixa de entrada (e a pasta de spam).')
    } catch (e) {
      setError(e.message)
    } finally {
      setResending(false)
    }
  }

  async function handleCheckVerified() {
    setError('')
    setChecking(true)
    try {
      const updated = await refreshUser()
      if (updated && !updated.emailVerified) {
        setError('Email ainda não verificado. Clique no link que enviamos.')
      }
      // If verified, onAuthStateChanged in App.jsx will update automatically
    } catch (e) {
      setError(e.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(0,242,255,0.07) 0%, transparent 60%)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%',
          maxWidth: 420,
          zIndex: 1,
          background: 'rgba(14,16,22,0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          textAlign: 'center',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(0,242,255,0.1)',
            border: '1px solid rgba(0,242,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Mail size={28} color="var(--accent-primary)" />
        </div>

        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Verifique seu email
          </h2>
          <p style={{ fontSize: '0.85rem', opacity: 0.5, lineHeight: 1.6 }}>
            Enviamos um link de verificação para{' '}
            <strong style={{ opacity: 1, color: 'var(--accent-primary)' }}>
              {user?.email}
            </strong>
          </p>
          <p style={{ fontSize: '0.78rem', opacity: 0.4, marginTop: '0.5rem' }}>
            Clique no link do email e depois volte aqui.
          </p>
        </div>

        {/* Feedback messages */}
        {resentMsg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              width: '100%',
              background: 'rgba(0,242,255,0.08)',
              border: '1px solid rgba(0,242,255,0.2)',
              borderRadius: '10px',
              padding: '0.75rem',
              fontSize: '0.8rem',
              color: 'var(--accent-primary)',
            }}
          >
            {resentMsg}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              width: '100%',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px',
              padding: '0.75rem',
              fontSize: '0.8rem',
              color: '#fca5a5',
            }}
          >
            {error}
          </motion.div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%' }}>
          <button
            className="primary"
            onClick={handleCheckVerified}
            disabled={checking}
            style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
          >
            {checking ? <span className="spin-small" /> : <RefreshCw size={15} />}
            Já verifiquei meu email
          </button>

          <button
            onClick={handleResend}
            disabled={resending}
            style={{ width: '100%', justifyContent: 'center', opacity: 0.6 }}
          >
            {resending ? <span className="spin-small" /> : 'Reenviar email'}
          </button>

          <button
            onClick={() => signOut()}
            style={{ width: '100%', justifyContent: 'center', background: 'none', border: 'none', opacity: 0.35, gap: '0.4rem', fontSize: '0.78rem' }}
          >
            <LogOut size={13} /> Usar outra conta
          </button>
        </div>
      </motion.div>
    </div>
  )
}
