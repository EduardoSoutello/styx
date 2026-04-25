/**
 * Dropbox Provider
 * Auth: OAuth2 PKCE (no SDK needed)
 * Requires: VITE_DROPBOX_CLIENT_ID in .env
 */

const API = 'https://api.dropboxapi.com/2'
const CONTENT = 'https://content.dropboxapi.com/2'
const CLIENT_ID = import.meta.env.VITE_DROPBOX_CLIENT_ID || ''
const REDIRECT = `${window.location.origin}/auth/dropbox`

// ── PKCE helpers ─────────────────────────────────────────────────────────────

function base64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function generateCodeChallenge(verifier) {
  const enc = new TextEncoder().encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', enc)
  return base64url(hash)
}

export function generateCodeVerifier() {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return base64url(arr)
}

export async function getDropboxAuthUrl() {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  sessionStorage.setItem('dbx_verifier', verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline'
  })
  return `https://www.dropbox.com/oauth2/authorize?${params}`
}

export async function exchangeDropboxCode(code) {
  const verifier = sessionStorage.getItem('dbx_verifier')
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT,
      code_verifier: verifier
    })
  })
  if (!res.ok) throw new Error('Dropbox token exchange failed')
  return res.json() // { access_token, refresh_token, ... }
}

// ── Provider ──────────────────────────────────────────────────────────────────

async function dbxPost(token, endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error_summary || `Dropbox error ${res.status}`)
  }
  return res.json()
}

export const DropboxProvider = {
  id: 'dropbox',
  name: 'Dropbox',
  color: '#0061FF',
  icon: 'dropbox',
  clientId: CLIENT_ID,

  isConfigured() {
    return !!CLIENT_ID
  },

  async listFiles(token, path = '') {
    const endpoint = path ? '/files/list_folder' : '/files/list_folder'
    const data = await dbxPost(token, endpoint, { path: path || '' })
    return (data.entries || []).map(f => ({
      id: f.id || f.path_lower,
      name: f.name,
      type: f['.tag'] === 'folder' ? 'folder' : 'file',
      mimeType: f['.tag'] === 'folder' ? 'folder' : null,
      size: f.size || null,
      modifiedAt: f.server_modified || null,
      path: f.path_lower,
      provider: 'dropbox',
      raw: f
    }))
  },

  async getQuota(token) {
    const data = await dbxPost(token, '/users/get_space_usage', null)
    return {
      used: data.used || 0,
      total: data.allocation?.allocated || 0
    }
  },

  async getProfile(token) {
    const data = await dbxPost(token, '/users/get_current_account', null)
    return {
      email: data.email || 'Conta Dropbox',
      name: data.name?.display_name || 'Usuário',
      photo: data.profile_photo_url || null
    }
  },

  getDownloadUrl(token, path) {
    return `${CONTENT}/files/download?authorization=Bearer%20${token}&arg=${encodeURIComponent(JSON.stringify({ path }))}`
  },

  async createFolder(token, path) {
    return dbxPost(token, '/files/create_folder_v2', { path })
  },

  async deleteFile(token, path) {
    return dbxPost(token, '/files/delete_v2', { path })
  },

  async renameFile(token, fromPath, toPath) {
    return dbxPost(token, '/files/move_v2', { from_path: fromPath, to_path: toPath })
  },

  /** Get file as Blob */
  async getFileBlob(token, path) {
    const res = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path })
      }
    })
    if (!res.ok) throw new Error('Download failed')
    return res.blob()
  }
}
