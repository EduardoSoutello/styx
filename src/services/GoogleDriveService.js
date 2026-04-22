const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';

export const listDriveFiles = async (accessToken, folderId = 'root') => {
  const query = `('${folderId}' in parents) and (mimeType contains 'audio/' or mimeType contains 'video/' or mimeType = 'application/vnd.google-apps.folder') and trashed = false`;
  const url = `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,thumbnailLink,size)&pageSize=100`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || 'Falha ao listar arquivos');
  }
  const data = await res.json();
  return data.files;
};

export const findFolder = async (accessToken, name) => {
  const query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return data.files[0] ?? null;
};

export const createFolder = async (accessToken, name, parentId = 'root') => {
  const res = await fetch(`${DRIVE_API_URL}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  });
  if (!res.ok) throw new Error('Folder creation failed');
  return res.json();
};

/**
 * Returns the streaming URL synchronously (no async needed).
 * Using access_token in query param is supported by Google APIs.
 * This is called INSIDE a user gesture handler so audio.play() retains gesture context.
 */
export const getMediaStreamUrl = (accessToken, fileId) => {
  return `${DRIVE_API_URL}/files/${fileId}?alt=media&access_token=${accessToken}`;
};
