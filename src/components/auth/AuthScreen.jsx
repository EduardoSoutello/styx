import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader } from 'lucide-react'
import {
  signInWithGoogle,
  signInWithEmail,
  registerWithEmail,
  resetPassword,
  getPasswordStrength,
  validatePassword,
} from '../../services/AuthService'

// ── Google Icon SVG ───────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// ── Password Strength Bar ─────────────────────────────────────────────────────

function PasswordStrengthBar({ password }) {
  if (!password) return null
  const { level, label, color } = getPasswordStrength(password)
  const errors = validatePassword(password)

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {/* Bar */}
      <div style={{ display: 'flex', gap: '3px', height: '3px', marginBottom: '0.4rem' }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              flex: 1,
              borderRadius: '2px',
              background: i <= level ? color : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>
      {/* Label + errors */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color, fontWeight: 600 }}>{label}</span>
        {errors.length > 0 && (
          <span style={{ fontSize: '0.68rem', opacity: 0.5, textAlign: 'right' }}>
            {errors[0]}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────

function InputField({ label, icon: Icon, type = 'text', value, onChange, placeholder, error, rightElement }) {
  return (
    <div className="input-group">
      <label>
        {Icon && <Icon size={12} />}
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ borderColor: error ? 'rgba(239,68,68,0.5)' : undefined }}
          autoComplete={type === 'password' ? 'current-password' : 'off'}
        />
        {rightElement && (
          <div style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)' }}>
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <span style={{ fontSize: '0.72rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <AlertCircle size={12} /> {error}
        </span>
      )}
    </div>
  )
}

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: '10px',
        padding: '0.65rem 0.9rem',
        fontSize: '0.82rem',
        color: '#fca5a5',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <AlertCircle size={14} style={{ flexShrink: 0 }} />
      {message}
    </motion.div>
  )
}

// ── Login Tab ─────────────────────────────────────────────────────────────────

function LoginTab({ onGoogleLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      // App.jsx onAuthStateChanged handles the redirect
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(resetEmail || email)
      setResetSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (showReset) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Redefinir senha</h3>
          <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>
            Enviaremos um link para o seu email.
          </p>
        </div>
        {resetSent ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: 'rgba(0,242,255,0.08)',
              border: '1px solid rgba(0,242,255,0.2)',
              borderRadius: '10px',
              padding: '1rem',
              fontSize: '0.85rem',
              color: 'var(--accent-primary)',
              textAlign: 'center',
            }}
          >
            ✉️ Email enviado! Verifique sua caixa de entrada.
          </motion.div>
        ) : (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <ErrorBanner message={error} />
            <InputField
              label="Email"
              icon={Mail}
              type="email"
              value={resetEmail || email}
              onChange={v => setResetEmail(v)}
              placeholder="seu@email.com"
            />
            <button type="submit" className="primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <span className="spin-small" /> : 'Enviar link de redefinição'}
            </button>
          </form>
        )}
        <button
          onClick={() => { setShowReset(false); setResetSent(false) }}
          style={{ background: 'none', border: 'none', opacity: 0.5, fontSize: '0.8rem', justifyContent: 'center' }}
        >
          ← Voltar ao login
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Google */}
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={loading}
        style={{
          width: '100%',
          justifyContent: 'center',
          gap: '0.75rem',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          fontWeight: 600,
        }}
      >
        <GoogleIcon /> Continuar com Google
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: '0.72rem', opacity: 0.4, flexShrink: 0 }}>ou continue com email</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
      </div>

      <ErrorBanner message={error} />

      <InputField
        label="Email"
        icon={Mail}
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="seu@email.com"
      />

      <InputField
        label="Senha"
        icon={Lock}
        type={showPass ? 'text' : 'password'}
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        rightElement={
          <button
            type="button"
            onClick={() => setShowPass(s => !s)}
            style={{ background: 'none', border: 'none', padding: 0, opacity: 0.4 }}
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        }
      />

      <div style={{ textAlign: 'right', marginTop: '-0.3rem' }}>
        <button
          type="button"
          onClick={() => setShowReset(true)}
          style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.75rem', opacity: 0.5 }}
        >
          Esqueci minha senha
        </button>
      </div>

      <button type="submit" className="primary" disabled={loading || !email || !password} style={{ width: '100%', justifyContent: 'center' }}>
        {loading ? <span className="spin-small" /> : 'Entrar'}
      </button>
    </form>
  )
}

// ── Register Tab ──────────────────────────────────────────────────────────────

function RegisterTab({ onGoogleLogin }) {
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const pwErrors     = validatePassword(password)
  const confirmError = confirm && password !== confirm ? 'As senhas não coincidem' : ''

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (pwErrors.length > 0) return setError(pwErrors[0])
    if (password !== confirm) return setError('As senhas não coincidem.')
    setLoading(true)
    try {
      await registerWithEmail(name.trim(), email, password)
      // onAuthStateChanged in App.jsx will detect unverified user → EmailVerifyScreen
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Google */}
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={loading}
        style={{
          width: '100%',
          justifyContent: 'center',
          gap: '0.75rem',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          fontWeight: 600,
        }}
      >
        <GoogleIcon /> Criar conta com Google
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: '0.72rem', opacity: 0.4, flexShrink: 0 }}>ou com email</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
      </div>

      <ErrorBanner message={error} />

      <InputField label="Nome completo" icon={User} value={name} onChange={setName} placeholder="Seu Nome" />
      <InputField label="Email" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="seu@email.com" />

      <div className="input-group">
        <label><Lock size={12} /> Senha</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mín. 8 chars, maiúscula, número, símbolo"
            autoComplete="new-password"
          />
          <div style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)' }}>
            <button
              type="button"
              onClick={() => setShowPass(s => !s)}
              style={{ background: 'none', border: 'none', padding: 0, opacity: 0.4 }}
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <PasswordStrengthBar password={password} />
      </div>

      <InputField
        label="Confirmar senha"
        icon={Lock}
        type={showPass ? 'text' : 'password'}
        value={confirm}
        onChange={setConfirm}
        placeholder="Repita a senha"
        error={confirmError}
      />

      <button
        type="submit"
        className="primary"
        disabled={loading || !name || !email || !password || !confirm || pwErrors.length > 0 || !!confirmError}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {loading ? <span className="spin-small" /> : 'Criar conta'}
      </button>
    </form>
  )
}

// ── Main AuthScreen ───────────────────────────────────────────────────────────

export default function AuthScreen() {
  const [tab, setTab]       = useState('login')   // 'login' | 'register'
  const [gLoading, setGLoading] = useState(false)
  const [gError, setGError]     = useState('')

  async function handleGoogleLogin() {
    setGError('')
    setGLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setGError(err.message)
    } finally {
      setGLoading(false)
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
        position: 'relative',
      }}
    >
      {/* Background glows */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 30% 20%, rgba(112,0,255,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(0,242,255,0.08) 0%, transparent 60%)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: '100%',
          maxWidth: 420,
          zIndex: 1,
          background: 'rgba(14,16,22,0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '2rem',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,242,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <h1
            className="gradient-text"
            style={{ fontSize: '2.5rem', letterSpacing: '-0.05em', fontWeight: 800 }}
          >
            STYX
          </h1>
          <p style={{ fontSize: '0.78rem', opacity: 0.4, marginTop: '0.25rem', letterSpacing: '0.1em' }}>
            GERENCIADOR MULTI-CLOUD
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '12px',
            padding: '3px',
            gap: '3px',
          }}
        >
          {['login', 'register'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? 'rgba(255,255,255,0.08)' : 'none',
                border: tab === t ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                borderRadius: '9px',
                fontWeight: tab === t ? 700 : 500,
                opacity: tab === t ? 1 : 0.5,
                transition: 'all 0.2s ease',
                justifyContent: 'center',
                padding: '0.55rem',
                fontSize: '0.85rem',
              }}
            >
              {t === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        {/* Google error */}
        {gError && <ErrorBanner message={gError} />}

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: tab === 'login' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === 'login' ? 12 : -12 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'login'
              ? <LoginTab    onGoogleLogin={handleGoogleLogin} googleLoading={gLoading} />
              : <RegisterTab onGoogleLogin={handleGoogleLogin} googleLoading={gLoading} />
            }
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '0.7rem', opacity: 0.3 }}>
          Seus dados de nuvem ficam vinculados à sua conta Styx.
        </p>
      </motion.div>
    </div>
  )
}
