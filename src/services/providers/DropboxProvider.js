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
    token_access_type: 'offline',
    force_reapprove: 'true',
    force_reauthentication: 'true'
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('Dropbox Token Exchange Error:', err)
    throw new Error(err.error_description || 'Dropbox token exchange failed')
  }
  return res.json() // { access_token, refresh_token, expires_in, ... }
}

export async function refreshDropboxToken(refreshToken) {
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID
    })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('Dropbox Token Refresh Error:', err)
    throw new Error(err.error_description || 'Dropbox token refresh failed')
  }
  return res.json() // { access_token, expires_in, ... }
}

// ── Provider ──────────────────────────────────────────────────────────────────

async function dbxPost(token, endpoint, body) {
  const hasBody = body && Object.keys(body).length > 0
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {})
    },
    body: hasBody ? JSON.stringify(body) : null
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('Dropbox API Error:', { endpoint, body, err })
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
    const safePath = (path === null || path === undefined) ? '' : path
    const data = await dbxPost(token, '/files/list_folder', { path: safePath })
    return (data.entries || []).map(f => ({
      id: f.id,
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
  },

  /** Upload a file */
  async uploadFile(token, file, path = '', onProgress) {
    const filePath = path ? `${path}/${file.name}` : `/${file.name}`
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', 'https://content.dropboxapi.com/2/files/upload')
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.setRequestHeader('Content-Type', 'application/octet-stream')
      xhr.setRequestHeader('Dropbox-API-Arg', JSON.stringify({
        path: filePath,
        mode: 'overwrite',
        autorename: true,
        mute: false,
        strict_conflict: false
      }))

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(e.loaded / e.total)
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) resolve(JSON.parse(xhr.responseText))
        else reject(new Error(`Dropbox upload failed: ${xhr.status}`))
      }
      xhr.onerror = () => reject(new Error('Dropbox upload network error'))
      xhr.send(file)
    })
  }
}
