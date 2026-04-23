/**
 * OneDrive Provider
 * Auth: OAuth2 implicit/PKCE via Microsoft Identity
 * Requires: VITE_ONEDRIVE_CLIENT_ID in .env
 */

const GRAPH = 'https://graph.microsoft.com/v1.0'
const CLIENT_ID = import.meta.env.VITE_ONEDRIVE_CLIENT_ID || ''
const REDIRECT = `${window.location.origin}/auth/onedrive`
const SCOPES = 'Files.ReadWrite User.Read offline_access'

// ── Auth helpers ──────────────────────────────────────────────────────────────

function base64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function generatePKCE() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return { verifier, challenge: base64url(hash) }
}

export async function getOneDriveAuthUrl() {
  const { verifier, challenge } = await generatePKCE()
  sessionStorage.setItem('od_verifier', verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT,
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    response_mode: 'query'
  })
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
}

export async function exchangeOneDriveCode(code) {
  const verifier = sessionStorage.getItem('od_verifier')
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT,
      code_verifier: verifier,
      scope: SCOPES
    })
  })
  if (!res.ok) throw new Error('OneDrive token exchange failed')
  return res.json()
}

// ── Provider ──────────────────────────────────────────────────────────────────

async function graphGet(token, endpoint) {
  const res = await fetch(`${GRAPH}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Graph error ${res.status}`)
  }
  return res.json()
}

async function graphRequest(token, method, endpoint, body) {
  const res = await fetch(`${GRAPH}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Graph error ${res.status}`)
  }
  return res.status === 204 ? null : res.json()
}

export const OneDriveProvider = {
  id: 'onedrive',
  name: 'OneDrive',
  color: '#0078D4',
  icon: 'onedrive',
  clientId: CLIENT_ID,

  isConfigured() {
    return !!CLIENT_ID
  },

  async listFiles(token, itemId = null) {
    const path = itemId ? `/me/drive/items/${itemId}/children` : '/me/drive/root/children'
    const data = await graphGet(token, `${path}?$select=id,name,file,folder,size,lastModifiedDateTime,thumbnails&$top=100`)
    return (data.value || []).map(f => ({
      id: f.id,
      name: f.name,
      type: f.folder ? 'folder' : 'file',
      mimeType: f.file?.mimeType || null,
      size: f.size || null,
      modifiedAt: f.lastModifiedDateTime || null,
      thumbnail: f.thumbnails?.[0]?.medium?.url || null,
      provider: 'onedrive',
      raw: f
    }))
  },

  async getQuota(token) {
    const data = await graphGet(token, '/me/drive?$select=quota')
    return {
      used: data.quota?.used || 0,
      total: data.quota?.total || 0,
      deleted: data.quota?.deleted || 0
    }
  },

  async getProfile(token) {
    const data = await graphGet(token, '/me?$select=displayName,mail,userPrincipalName')
    return {
      email: data.mail || data.userPrincipalName || 'Conta Microsoft',
      name: data.displayName || 'Usuário',
      photo: null
    }
  },

  async getDownloadUrl(token, itemId) {
    const data = await graphGet(token, `/me/drive/items/${itemId}?$select=@microsoft.graph.downloadUrl`)
    return data['@microsoft.graph.downloadUrl'] || null
  },

  async createFolder(token, name, parentId = null) {
    const path = parentId ? `/me/drive/items/${parentId}/children` : '/me/drive/root/children'
    return graphRequest(token, 'POST', path, {
      name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename'
    })
  },

  async deleteFile(token, itemId) {
    return graphRequest(token, 'DELETE', `/me/drive/items/${itemId}`)
  },

  async renameFile(token, itemId, newName) {
    return graphRequest(token, 'PATCH', `/me/drive/items/${itemId}`, { name: newName })
  }
}
