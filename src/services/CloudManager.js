/**
 * CloudManager — central registry for connected cloud accounts
 * Persists to localStorage, provides a unified interface across providers.
 */

import { GoogleDriveProvider } from './providers/GoogleDriveProvider'
import { DropboxProvider } from './providers/DropboxProvider'
import { OneDriveProvider } from './providers/OneDriveProvider'
import { MegaProvider } from './providers/MegaProvider'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export const PROVIDERS = {
  googledrive: GoogleDriveProvider,
  dropbox:     DropboxProvider,
  onedrive:    OneDriveProvider,
  mega:        MegaProvider
}

const BASE_KEY = 'styx_accounts'

// ── Serialise / deserialise ───────────────────────────────────────────────────
// We can't store MEGA's live _client in localStorage, so we strip it on save
// and mark the account as "needs-reauth" on load.

function serialiseAccount(acc) {
  const { session, ...rest } = acc
  let safeSession = null
  if (session) {
    safeSession = { ...session }
    delete safeSession._client
  }
  return JSON.parse(JSON.stringify({ ...rest, session: safeSession }))
}

function loadAccounts(uid) {
  try {
    const key = uid ? `${BASE_KEY}_${uid}` : BASE_KEY
    const raw = localStorage.getItem(key)
    if (!raw) return []
    return JSON.parse(raw).map(acc => {
      // MEGA sessions are live objects – mark for reauth
      if (acc.providerId === 'mega' && acc.session) {
        acc.session._client = null
        acc.needsReauth = true
      }
      return acc
    })
  } catch {
    return []
  }
}

function saveAccounts(accounts, uid) {
  const key = uid ? `${BASE_KEY}_${uid}` : BASE_KEY
  localStorage.setItem(key, JSON.stringify(accounts.map(serialiseAccount)))
}

// ── Crypto Utilities for MEGA Auto-Login ─────────────────────────────────────
// Uses Firebase UID to derive a key for AES-GCM local storage encryption

async function getCryptoKey(uid) {
  const saltStr = uid || 'styx_default_salt_123'
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(saltStr),
    'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('styx_mega_crypto_salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt']
  )
}

async function encryptPassword(uid, password) {
  if (!password) return null
  try {
    const key = await getCryptoKey(uid)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(password)
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
    
    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(ciphertext), iv.length)
    return btoa(String.fromCharCode(...combined))
  } catch (e) {
    console.error('Failed to encrypt MEGA password', e)
    return null
  }
}

export async function decryptPassword(uid, encryptedB64) {
  if (!encryptedB64) return null
  try {
    const key = await getCryptoKey(uid)
    const combined = new Uint8Array(atob(encryptedB64).split('').map(c => c.charCodeAt(0)))
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new TextDecoder().decode(decrypted)
  } catch (e) {
    console.error('Failed to decrypt MEGA password', e)
    return null
  }
}


// ── CloudManager ─────────────────────────────────────────────────────────────

class CloudManagerClass {
  constructor() {
    this._uid      = null
    this._accounts = []
    this._listeners = []
  }

  /** Called by App.jsx when auth state changes */
  setUser(uid) {
    this._uid      = uid
    this._accounts = loadAccounts(uid)
    this._listeners.forEach(fn => fn([...this._accounts]))

    if (uid && db) {
      this._syncFromFirestore(uid).catch(err => {
        console.error('Failed to sync from Firestore', err)
      })
    }
  }

  async _syncFromFirestore(uid) {
    const docRef = doc(db, 'users', uid)
    const snapshot = await getDoc(docRef)
    if (snapshot.exists()) {
      const data = snapshot.data()
      if (data && data.accounts) {
        const remoteAccounts = data.accounts.map(acc => {
          if (acc.providerId === 'mega') {
            acc.needsReauth = true
            const local = this._accounts.find(a => a.id === acc.id)
            if (local && local.session && local.session._client) {
               acc.session = local.session
               acc.needsReauth = false
            }
          }
          return acc
        })
        this._accounts = remoteAccounts
        saveAccounts(this._accounts, this._uid)
        this._listeners.forEach(fn => fn([...this._accounts]))
      }
    }
  }

  /** All registered accounts */
  get accounts() { return this._accounts }

  /** Subscribe to changes */
  subscribe(fn) {
    this._listeners.push(fn)
    return () => { this._listeners = this._listeners.filter(l => l !== fn) }
  }

  _notify() {
    saveAccounts(this._accounts, this._uid)
    
    if (this._uid && db) {
      const docRef = doc(db, 'users', this._uid)
      const serialized = this._accounts.map(serialiseAccount)
      setDoc(docRef, { accounts: serialized }, { merge: true }).catch(err => {
        console.error('Failed to save to Firestore', err)
      })
    }

    this._listeners.forEach(fn => fn([...this._accounts]))
  }

  /**
   * Add or update a Google Drive account (token from OAuth popup)
   */
  async connectGoogleDrive(accessToken) {
    const provider = PROVIDERS.googledrive
    const [profile, quota] = await Promise.all([
      provider.getProfile(accessToken),
      provider.getQuota(accessToken).catch(() => ({ used: 0, total: 0 }))
    ])

    const existing = this._accounts.findIndex(
      a => a.providerId === 'googledrive' && a.email === profile.email
    )
    const account = {
      id: `googledrive_${profile.email}`,
      providerId: 'googledrive',
      email: profile.email,
      name: profile.name,
      photo: profile.photo,
      token: accessToken,
      session: null,
      quota,
      connectedAt: Date.now()
    }

    if (existing >= 0) this._accounts[existing] = account
    else this._accounts.push(account)
    this._notify()
    return account
  }

  /**
   * Add a Dropbox account (token from OAuth callback)
   */
  async connectDropbox(accessToken) {
    const provider = PROVIDERS.dropbox
    const [profile, quota] = await Promise.all([
      provider.getProfile(accessToken),
      provider.getQuota(accessToken).catch(() => ({ used: 0, total: 0 }))
    ])

    const account = {
      id: `dropbox_${profile.email}`,
      providerId: 'dropbox',
      email: profile.email,
      name: profile.name,
      photo: profile.photo,
      token: accessToken,
      session: null,
      quota,
      connectedAt: Date.now()
    }

    const existing = this._accounts.findIndex(a => a.id === account.id)
    if (existing >= 0) this._accounts[existing] = account
    else this._accounts.push(account)
    this._notify()
    return account
  }

  /**
   * Add an OneDrive account
   */
  async connectOneDrive(accessToken) {
    const provider = PROVIDERS.onedrive
    const [profile, quota] = await Promise.all([
      provider.getProfile(accessToken),
      provider.getQuota(accessToken).catch(() => ({ used: 0, total: 0 }))
    ])

    const account = {
      id: `onedrive_${profile.email}`,
      providerId: 'onedrive',
      email: profile.email,
      name: profile.name,
      photo: profile.photo,
      token: accessToken,
      session: null,
      quota,
      connectedAt: Date.now()
    }

    const existing = this._accounts.findIndex(a => a.id === account.id)
    if (existing >= 0) this._accounts[existing] = account
    else this._accounts.push(account)
    this._notify()
    return account
  }

  /**
   * Add a MEGA account (email + password login)
   */
  async connectMega(email, password) {
    const provider = PROVIDERS.mega
    const session = await provider.login(email, password)

    // Fetch quota while session is live (right after login)
    const quota = await provider.getQuota(session).catch(() => ({ used: 0, total: 0 }))

    // Encrypt password for silent re-auth
    const encryptedPass = await encryptPassword(this._uid, password)

    const account = {
      id: `mega_${email}`,
      providerId: 'mega',
      email,
      name: session.name || email,
      photo: null,
      token: null,
      session,
      quota,
      connectedAt: Date.now(),
      _encryptedMegaPassword: encryptedPass
    }

    const existing = this._accounts.findIndex(a => a.id === account.id)
    if (existing >= 0) this._accounts[existing] = account
    else this._accounts.push(account)
    this._notify()
    return account
  }


  /** Remove an account by id */
  disconnect(accountId) {
    this._accounts = this._accounts.filter(a => a.id !== accountId)
    this._notify()
  }

  /** Reorder accounts array (for drag-and-drop) */
  reorderAccounts(newAccounts) {
    this._accounts = [...newAccounts]
    this._notify()
  }

  /** Refresh quota for an account */
  async refreshQuota(accountId) {
    const acc = this._accounts.find(a => a.id === accountId)
    if (!acc) return
    // Skip MEGA accounts that lost their live session on page reload
    if (acc.providerId === 'mega' && acc.needsReauth) return
    const provider = PROVIDERS[acc.providerId]
    try {
      const authParam = acc.session || acc.token
      acc.quota = await provider.getQuota(authParam)
      this._notify()
    } catch {
      // fail silently — keep existing quota value
    }
  }

  /** List files for an account in a folder */
  async listFiles(accountId, folderId = null) {
    const acc = this._accounts.find(a => a.id === accountId)
    if (!acc) throw new Error('Account not found')
    const provider = PROVIDERS[acc.providerId]
    const authParam = acc.session || acc.token
    return provider.listFiles(authParam, folderId)
  }

  /** Get the provider for an account */
  getProvider(accountId) {
    const acc = this._accounts.find(a => a.id === accountId)
    return acc ? PROVIDERS[acc.providerId] : null
  }

  /** Transfer a file from one cloud to another */
  async transferFile(sourceId, targetId, file, targetFolderId, onProgress) {
    const sourceAcc = this._accounts.find(a => a.id === sourceId)
    const targetAcc = this._accounts.find(a => a.id === targetId)
    if (!sourceAcc || !targetAcc) throw new Error('Account not found')

    const sourceProvider = PROVIDERS[sourceAcc.providerId]
    const targetProvider = PROVIDERS[targetAcc.providerId]

    if (!sourceProvider.getFileBlob || !targetProvider.uploadFile) {
      throw new Error('Provider does not support direct transfer')
    }

    onProgress?.(0.1) // Start download

    try {
      // 1. Download to Blob
      const blob = await sourceProvider.getFileBlob(sourceAcc.session || sourceAcc.token, file.id || file.path, file)
      
      onProgress?.(0.5) // Download complete, start upload
      
      // Convert Blob to File object for upload
      const transferFileObj = new File([blob], file.name, { type: file.mimeType || blob.type })
      
      // 2. Upload to target
      await targetProvider.uploadFile(
        targetAcc.session || targetAcc.token, 
        transferFileObj, 
        targetFolderId, 
        (pct) => {
          // Scale upload progress from 50% to 100%
          onProgress?.(0.5 + (pct * 0.5))
        }
      )

      onProgress?.(1.0)
    } catch (e) {
      console.error('Transfer failed', e)
      throw new Error('A transferência falhou: ' + e.message)
    }
  }
}

export const CloudManager = new CloudManagerClass()
