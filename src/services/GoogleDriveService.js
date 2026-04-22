const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';

/**
 * Lists files and folders. 
 * If folderId is provided, lists content of that folder.
 */
export const listDriveFiles = async (accessToken, folderId = 'root') => {
  let query = `mimeType contains 'audio/' or mimeType contains 'video/' or mimeType = 'application/vnd.google-apps.folder'`;
  if (folderId) {
    query = `('${folderId}' in parents) and (${query}) and trashed = false`;
  }
  
  const url = `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,thumbnailLink,size,iconLink)&pageSize=100`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message || 'Failed to fetch Drive files');
  }

  const data = await response.json();
  return data.files;
};

/**
 * Searches for a folder by name.
 */
export const findFolder = async (accessToken, folderName) => {
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) throw new Error('Search failed');
  const data = await response.json();
  return data.files.length > 0 ? data.files[0] : null;
};

/**
 * Creates a folder with the given name.
 */
export const createFolder = async (accessToken, folderName, parentId = 'root') => {
  const url = `${DRIVE_API_URL}/files`;
  const body = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error('Folder creation failed');
  return await response.json();
};

export const getMediaStreamUrl = async (accessToken, fileId) => {
  return `${DRIVE_API_URL}/files/${fileId}?alt=media&access_token=${accessToken}`;
};
