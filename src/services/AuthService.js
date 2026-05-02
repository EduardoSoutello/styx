/**
 * AuthService — wraps Firebase Auth for Styx user authentication.
 * Supports Google Sign-In and email/password with email verification.
 */

import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  reload,
} from 'firebase/auth'
import { auth, db } from '../firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

// E-mails com permissão de administrador/dono
const ADMIN_EMAILS = [
  'eduardosoutellodev@gmail.com', 
  'eduardo.soutello@gmail.com',
  'adr.artdesign@gmail.com'
]

// ── Password Validation ───────────────────────────────────────────────────────

export function validatePassword(password) {
  const errors = []
  if (password.length < 8)              errors.push('Mínimo 8 caracteres')
  if (!/[A-Z]/.test(password))          errors.push('Pelo menos 1 letra maiúscula')
  if (!/[0-9]/.test(password))          errors.push('Pelo menos 1 número')
  if (!/[^A-Za-z0-9]/.test(password))  errors.push('Pelo menos 1 símbolo (!@#$...)')
  return errors
}

export function getPasswordStrength(password) {
  let score = 0
  if (password.length >= 8)             score++
  if (password.length >= 12)            score++
  if (/[A-Z]/.test(password))          score++
  if (/[0-9]/.test(password))          score++
  if (/[^A-Za-z0-9]/.test(password))  score++
  if (score <= 1) return { level: 0, label: 'Muito fraca', color: '#ef4444' }
  if (score <= 2) return { level: 1, label: 'Fraca',       color: '#f97316' }
  if (score <= 3) return { level: 2, label: 'Média',       color: '#eab308' }
  if (score <= 4) return { level: 3, label: 'Forte',       color: '#22c55e' }
  return                { level: 4, label: 'Muito forte',  color: '#00f2ff' }
}

// ── Friendly error messages ───────────────────────────────────────────────────

function humanizeError(code) {
  const map = {
    'auth/email-already-in-use':    'Este email já está cadastrado.',
    'auth/invalid-email':           'Email inválido.',
    'auth/user-not-found':          'Usuário não encontrado.',
    'auth/wrong-password':          'Senha incorreta.',
    'auth/invalid-credential':      'Email ou senha incorretos.',
    'auth/too-many-requests':       'Muitas tentativas. Tente novamente mais tarde.',
    'auth/network-request-failed':  'Erro de conexão. Verifique sua internet.',
    'auth/popup-closed-by-user':    'Login cancelado.',
    'auth/cancelled-popup-request': 'Login cancelado.',
  }
  return map[code] || 'Ocorreu um erro. Tente novamente.'
}

// ── Firestore User Sync ───────────────────────────────────────────────────────

/** Ensure user exists in Firestore with correct plan/roles */
export async function initializeUserDocument(user) {
  if (!user) return
  
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)

  const isOwner = ADMIN_EMAILS.includes(user.email?.toLowerCase())
  
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    lastLogin: serverTimestamp(),
  }

  // Se o usuário não existir, cria com os padrões
  if (!userSnap.exists()) {
    userData.createdAt = serverTimestamp()
    userData.plan = isOwner ? 'pro' : 'free'
    if (isOwner) userData.isOwner = true
    
    await setDoc(userRef, userData)
  } else {
    // Se já existir, apenas atualiza o lastLogin e garante o status de owner se necessário
    if (isOwner) {
      userData.isOwner = true
      userData.plan = 'pro'
    }
    await setDoc(userRef, userData, { merge: true })
  }
}

// ── Auth operations ───────────────────────────────────────────────────────────

/** Sign in with Google popup */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    const result = await signInWithPopup(auth, provider)
    await initializeUserDocument(result.user)
    return result.user
  } catch (e) {
    throw new Error(humanizeError(e.code))
  }
}

/** Register with email/password + send verification email */
export async function registerWithEmail(name, email, password) {
  const errors = validatePassword(password)
  if (errors.length > 0) throw new Error(errors[0])
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName: name })
    await initializeUserDocument(result.user)
    await sendEmailVerification(result.user)
    return result.user
  } catch (e) {
    throw new Error(humanizeError(e.code))
  }
}

/** Sign in with email/password */
export async function signInWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    await initializeUserDocument(result.user)
    return result.user
  } catch (e) {
    throw new Error(humanizeError(e.code))
  }
}

/** Resend verification email to current user */
export async function resendVerificationEmail() {
  if (!auth.currentUser) throw new Error('Nenhum usuário logado.')
  await sendEmailVerification(auth.currentUser)
}

/** Reload user from Firebase to check if email was verified */
export async function refreshUser() {
  if (!auth.currentUser) return null
  await reload(auth.currentUser)
  return auth.currentUser
}

/** Send password reset email */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (e) {
    throw new Error(humanizeError(e.code))
  }
}

/** Sign out current user */
export async function signOut() {
  await firebaseSignOut(auth)
}

/** Subscribe to auth state changes */
export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, callback)
}
