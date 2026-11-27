const API_URL = import.meta.env.VITE_API_URL || '/api';

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export async function api(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    authToken = null;
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const pagesApi = {
  getTree: (workspaceId) => api(`/pages/tree/${workspaceId}`),
  get: (id) => api(`/pages/${id}`),
  create: (data) => api('/pages', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => api(`/pages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => api(`/pages/${id}`, { method: 'DELETE' }),
  restore: (id) => api(`/pages/${id}/restore`, { method: 'POST' }),
  duplicate: (id) => api(`/pages/${id}/duplicate`, { method: 'POST' }),
  move: (id, parentId) => api(`/pages/${id}/move`, { method: 'POST', body: JSON.stringify({ parentId }) }),
  getHistory: (id) => api(`/pages/${id}/history`),
  restoreVersion: (id, versionId) => api(`/pages/${id}/history/${versionId}/restore`, { method: 'POST' }),
};

export const blocksApi = {
  getPageBlocks: (pageId) => api(`/blocks/page/${pageId}`),
  create: (data) => api('/blocks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => api(`/blocks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => api(`/blocks/${id}`, { method: 'DELETE' }),
  reorder: (pageId, blocks) => api('/blocks/reorder', { method: 'POST', body: JSON.stringify({ pageId, blocks }) }),
};

export const searchApi = {
  search: (params) => api(`/search?${new URLSearchParams(params)}`),
  quick: (params) => api(`/search/quick?${new URLSearchParams(params)}`),
  recent: (params) => api(`/search/recent?${new URLSearchParams(params)}`),
};

export const tagsApi = {
  getWorkspaceTags: (workspaceId) => api(`/tags/${workspaceId}`),
  create: (workspaceId, data) => api(`/tags/${workspaceId}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (workspaceId, tagId, data) => api(`/tags/${workspaceId}/${tagId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (workspaceId, tagId) => api(`/tags/${workspaceId}/${tagId}`, { method: 'DELETE' }),
  addToPage: (pageId, tagId) => api(`/tags/pages/${pageId}`, { method: 'POST', body: JSON.stringify({ tagId }) }),
  removeFromPage: (pageId, tagId) => api(`/tags/pages/${pageId}/${tagId}`, { method: 'DELETE' }),
};

export const commentsApi = {
  getPageComments: (pageId) => api(`/comments/page/${pageId}`),
  getBlockComments: (blockId) => api(`/comments/block/${blockId}`),
  create: (data) => api('/comments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, content) => api(`/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  delete: (id) => api(`/comments/${id}`, { method: 'DELETE' }),
  resolve: (id, resolved) => api(`/comments/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolved }) }),
};

export const favoritesApi = {
  get: () => api('/favorites'),
  add: (pageId) => api('/favorites', { method: 'POST', body: JSON.stringify({ pageId }) }),
  remove: (pageId) => api(`/favorites/${pageId}`, { method: 'DELETE' }),
  check: (pageId) => api(`/favorites/check/${pageId}`),
};

export const uploadApi = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      credentials: 'include',
    }).then(r => r.json());
  },
  uploadMultiple: (files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return fetch(`${API_URL}/upload/multiple`, {
      method: 'POST',
      body: formData,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      credentials: 'include',
    }).then(r => r.json());
  },
  delete: (filename) => api(`/upload/${filename}`, { method: 'DELETE' }),
};

export const workspacesApi = {
  get: () => api('/workspaces'),
  getById: (id) => api(`/workspaces/${id}`),
  create: (data) => api('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => api(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => api(`/workspaces/${id}`, { method: 'DELETE' }),
  getMembers: (id) => api(`/workspaces/${id}/members`),
  inviteMember: (id, data) => api(`/workspaces/${id}/members`, { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id, userId, data) => api(`/workspaces/${id}/members/${userId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeMember: (id, userId) => api(`/workspaces/${id}/members/${userId}`, { method: 'DELETE' }),
};

export const authApi = {
  login: (username, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username, password, name) => api('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, name }) }),
  me: () => api('/auth/me'),
  refresh: () => api('/auth/refresh', { method: 'POST' }),
  updateProfile: (data) => api('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (currentPassword, newPassword) => api('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
};