/**
 * CloudManager — central registry for connected cloud accounts
 * Persists to localStorage, provides a unified interface across providers.
 */

import { GoogleDriveProvider } from './providers/GoogleDriveProvider'
import { DropboxProvider } from './providers/DropboxProvider'
import { OneDriveProvider } from './providers/OneDriveProvider'
import { MegaProvider } from './providers/MegaProvider'

export const PROVIDERS = {
  googledrive: GoogleDriveProvider,
  dropbox:     DropboxProvider,
  onedrive:    OneDriveProvider,
  mega:        MegaProvider
}

const STORAGE_KEY = 'styx_accounts'

// ── Serialise / deserialise ───────────────────────────────────────────────────
// We can't store MEGA's live _client in localStorage, so we strip it on save
// and mark the account as "needs-reauth" on load.

function serialiseAccount(acc) {
  const { session, ...rest } = acc
  const safeSession = session
    ? { ...session, _client: undefined }
    : null
  return { ...rest, session: safeSession }
}

function loadAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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

function saveAccounts(accounts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.map(serialiseAccount)))
}

// ── CloudManager ─────────────────────────────────────────────────────────────

class CloudManagerClass {
  constructor() {
    this._accounts = loadAccounts()
    this._listeners = []
  }

  /** All registered accounts */
  get accounts() { return this._accounts }

  /** Subscribe to changes */
  subscribe(fn) {
    this._listeners.push(fn)
    return () => { this._listeners = this._listeners.filter(l => l !== fn) }
  }

  _notify() {
    saveAccounts(this._accounts)
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

    const quota = await provider.getQuota(session).catch(() => ({ used: 0, total: 0 }))

    const account = {
      id: `mega_${email}`,
      providerId: 'mega',
      email,
      name: session.name || email,
      photo: null,
      token: null, // MEGA uses session, not token
      session,
      quota,
      connectedAt: Date.now()
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

  /** Refresh quota for an account */
  async refreshQuota(accountId) {
    const acc = this._accounts.find(a => a.id === accountId)
    if (!acc) return
    const provider = PROVIDERS[acc.providerId]
    try {
      const authParam = acc.session || acc.token
      acc.quota = await provider.getQuota(authParam)
      this._notify()
    } catch {
      // fail silently
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
}

export const CloudManager = new CloudManagerClass()
