/**
 * MEGA Provider
 * Auth: email + password (MEGA has no OAuth)
 * Uses: megajs library (must be installed: npm i megajs)
 *
 * NOTE: megajs performs all crypto in the browser via WebCrypto.
 * Credentials are NEVER sent to any server other than MEGA's own API.
 */

export const MegaProvider = {
  id: 'mega',
  name: 'MEGA',
  color: '#D9272E',
  icon: 'mega',
  authType: 'credentials', // differs from OAuth providers

  /**
   * Login with email and password.
   * Returns a session object { email, name, storage, _client }
   */
  async login(email, password) {
    // Dynamic import so megajs is only loaded when needed
    const { Storage } = await import('megajs')

    return new Promise((resolve, reject) => {
      const storage = new Storage({ email, password, autologin: false })
      storage.login((err) => {
        if (err) {
          reject(new Error(err.message || 'MEGA login failed. Check credentials.'))
          return
        }
        resolve({
          email: storage.email || email,
          name: storage.name || email,
          photo: null,
          _client: storage
        })
      })
    })
  },

  /**
   * List files in a folder node (or root)
   * @param {object} session - session._client is the Storage instance
   * @param {string|null} nodeId - MEGA node id or null for root
   */
  async listFiles(session, nodeId = null) {
    const storage = session._client
    if (!storage) throw new Error('MEGA session invalid')

    const root = nodeId ? storage.files[nodeId] : storage.root
    if (!root || !root.children) return []

    return root.children.map(node => ({
      id: node.nodeId,
      name: node.name,
      type: node.directory ? 'folder' : 'file',
      mimeType: null,
      size: node.size || null,
      modifiedAt: node.timestamp ? new Date(node.timestamp * 1000).toISOString() : null,
      thumbnail: null,
      provider: 'mega',
      raw: node
    }))
  },

  /**
   * Get storage quota
   */
  async getQuota(session) {
    const storage = session._client
    return new Promise((resolve, reject) => {
      storage.getAccountInfo((err, info) => {
        if (err) { reject(err); return }
        resolve({
          used: info.used || 0,
          total: info.total || 0
        })
      })
    })
  },

  async getProfile(session) {
    return {
      email: session.email,
      name: session.name || session.email,
      photo: null
    }
  },

  /**
   * Get a temporary download URL for a file
   */
  async getDownloadUrl(session, nodeId) {
    const storage = session._client
    const node = storage.files[nodeId]
    if (!node) throw new Error('MEGA file not found')

    return new Promise((resolve, reject) => {
      // Pass 'true' to include the decryption key in the URL!
      node.link(true, (err, url) => {
        if (err) reject(err)
        else resolve({ url, isMegaUrl: true })
      })
    })
  },

  async createFolder(session, name, parentNodeId = null) {
    const storage = session._client
    const parent = parentNodeId ? storage.files[parentNodeId] : storage.root
    return new Promise((resolve, reject) => {
      parent.mkdir(name, (err, folder) => {
        if (err) reject(err)
        else resolve(folder)
      })
    })
  },

  async deleteFile(session, nodeId) {
    const storage = session._client
    const node = storage.files[nodeId]
    if (!node) throw new Error('MEGA file not found')
    return new Promise((resolve, reject) => {
      node.delete(false, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}
