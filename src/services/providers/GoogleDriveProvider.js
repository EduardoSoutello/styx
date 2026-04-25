/**
 * Google Drive Provider
 * Auth: OAuth2 via @react-oauth/google (popup flow)
 */

const BASE = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function driveGet(token, endpoint, params = {}) {
  const url = new URL(`${BASE}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Drive error ${res.status}`)
  }
  return res.json()
}

async function driveRequest(token, method, endpoint, body, params = {}) {
  const url = new URL(`${BASE}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Drive error ${res.status}`)
  }
  return res.status === 204 ? null : res.json()
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const GoogleDriveProvider = {
  id: 'googledrive',
  name: 'Google Drive',
  color: '#4285F4',
  icon: 'google-drive',

  /** List files in a folder */
  async listFiles(token, folderId = null) {
    const folder = folderId || 'root'
    const fields = 'files(id,name,mimeType,size,modifiedTime,parents,iconLink,thumbnailLink,webContentLink)'
    const data = await driveGet(token, '/files', {
      q: `'${folder}' in parents and trashed = false`,
      fields,
      pageSize: '100',
      orderBy: 'folder,name'
    })
    return (data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
      mimeType: f.mimeType,
      size: f.size ? parseInt(f.size) : null,
      modifiedAt: f.modifiedTime,
      thumbnail: f.thumbnailLink || null,
      provider: 'googledrive',
      raw: f
    }))
  },

  /** Get storage quota */
  async getQuota(token) {
    const data = await driveGet(token, '/about', { fields: 'storageQuota' })
    const q = data.storageQuota
    return {
      used: parseInt(q.usage || 0),
      total: parseInt(q.limit || 0),
      usedInDrive: parseInt(q.usageInDrive || 0)
    }
  },

  /** Get user profile */
  async getProfile(token) {
    const data = await driveGet(token, '/about', { fields: 'user' })
    return {
      email: data.user?.emailAddress || 'Conta Google',
      name: data.user?.displayName || 'Usuário',
      photo: data.user?.photoLink || null
    }
  },

  /** Download URL for a file */
  getDownloadUrl(token, fileId, fileObj) {
    if (fileObj?.raw) {
      const isImage = fileObj.mimeType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(fileObj.name)
      if (isImage && fileObj.raw.thumbnailLink) {
        // Use high-res thumbnail for image preview to avoid CORS block
        return fileObj.raw.thumbnailLink.replace(/=s\d+/, '=s1200')
      }
      if (fileObj.raw.webContentLink) {
        // webContentLink is Google's official direct download URL
        return fileObj.raw.webContentLink
      }
    }
    // Fallback if no file object or links
    return `${BASE}/files/${fileId}?alt=media&access_token=${token}`
  },

  /** Create folder */
  async createFolder(token, name, parentId = 'root') {
    return driveRequest(token, 'POST', '/files', {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    })
  },

  /** Delete file or folder */
  async deleteFile(token, fileId) {
    return driveRequest(token, 'DELETE', `/files/${fileId}`)
  },

  /** Rename file */
  async renameFile(token, fileId, newName) {
    return driveRequest(token, 'PATCH', `/files/${fileId}`, { name: newName })
  },

  /** Upload a file */
  async uploadFile(token, file, parentId = 'root', onProgress) {
    const metadata = { name: file.name, parents: [parentId] }
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', file)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${UPLOAD}/files?uploadType=multipart`)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      if (onProgress) xhr.upload.onprogress = e => onProgress(e.loaded / e.total)
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
        else reject(new Error(`Upload failed: ${xhr.status}`))
      }
      xhr.onerror = () => reject(new Error('Upload network error'))
      xhr.send(form)
    })
  },

  /** Get file as Blob (for cross-cloud transfer) */
  async getFileBlob(token, fileId) {
    const url = `${BASE}/files/${fileId}?alt=media`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error('Download failed')
    return res.blob()
  }
}
