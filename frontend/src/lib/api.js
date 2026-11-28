const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include',
    ...options
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        data.error || 'Request failed',
        response.status,
        data.code,
        data.details
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.message || 'Network error', 0, 'NETWORK_ERROR');
  }
}

export const api = {
  // Auth
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: data }),
    login: (data) => request('/auth/login', { method: 'POST', body: data }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    logoutAll: () => request('/auth/logout-all', { method: 'POST' }),
    me: () => request('/auth/me'),
    changePassword: (data) => request('/auth/change-password', { method: 'POST', body: data }),
    updateProfile: (data) => request('/auth/profile', { method: 'PATCH', body: data })
  },

  // Workspaces
  workspaces: {
    list: () => request('/workspaces'),
    create: (data) => request('/workspaces', { method: 'POST', body: data }),
    get: (id) => request(`/workspaces/${id}`),
    update: (id, data) => request(`/workspaces/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request(`/workspaces/${id}`, { method: 'DELETE' }),
    members: {
      list: (workspaceId) => request(`/workspaces/${workspaceId}/members`),
      invite: (workspaceId, data) => request(`/workspaces/${workspaceId}/members`, { method: 'POST', body: data }),
      update: (workspaceId, userId, data) => request(`/workspaces/${workspaceId}/members/${userId}`, { method: 'PATCH', body: data }),
      remove: (workspaceId, userId) => request(`/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' }),
      leave: (workspaceId) => request(`/workspaces/${workspaceId}/leave`, { method: 'POST' })
    }
  },

  // Pages
  pages: {
    list: (workspaceId) => request(`/pages?workspaceId=${workspaceId}`),
    get: (id) => request(`/pages/${id}`),
    create: (data) => request('/pages', { method: 'POST', body: data }),
    update: (id, data) => request(`/pages/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request(`/pages/${id}`, { method: 'DELETE' }),
    restore: (id) => request(`/pages/${id}/restore`, { method: 'POST' }),
    duplicate: (id) => request(`/pages/${id}/duplicate`, { method: 'POST' }),
    reorder: (pageIds) => request('/pages/reorder', { method: 'POST', body: { pageIds } }),
    publish: (id) => request(`/pages/${id}/publish`, { method: 'POST' }),
    versions: {
      list: (pageId) => request(`/pages/${pageId}/versions`),
      restore: (pageId, versionId) => request(`/pages/${pageId}/versions/${versionId}/restore`, { method: 'POST' })
    }
  },

  // Blocks
  blocks: {
    list: (pageId) => request(`/blocks/page/${pageId}`),
    create: (data) => request('/blocks', { method: 'POST', body: data }),
    update: (id, data) => request(`/blocks/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request(`/blocks/${id}`, { method: 'DELETE' }),
    reorder: (blockIds) => request('/blocks/reorder', { method: 'POST', body: { blockIds } }),
    duplicate: (id) => request(`/blocks/${id}/duplicate`, { method: 'POST' })
  },

  // Comments
  comments: {
    listByPage: (pageId) => request(`/comments/page/${pageId}`),
    listByBlock: (blockId) => request(`/comments/block/${blockId}`),
    create: (data) => request('/comments', { method: 'POST', body: data }),
    update: (id, data) => request(`/comments/${id}`, { method: 'PATCH', body: data }),
    resolve: (id) => request(`/comments/${id}/resolve`, { method: 'POST' }),
    delete: (id) => request(`/comments/${id}`, { method: 'DELETE' })
  },

  // Tags
  tags: {
    list: (workspaceId) => request(`/tags?workspaceId=${workspaceId}`),
    create: (data) => request('/tags', { method: 'POST', body: data }),
    update: (id, data) => request(`/tags/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request(`/tags/${id}`, { method: 'DELETE' }),
    addToPage: (pageId, tagId) => request(`/tags/pages/${pageId}/tags`, { method: 'POST', body: { tagId } }),
    removeFromPage: (pageId, tagId) => request(`/tags/pages/${pageId}/tags/${tagId}`, { method: 'DELETE' }),
    getForPage: (pageId) => request(`/tags/pages/${pageId}`)
  },

  // Favorites
  favorites: {
    list: () => request('/favorites'),
    add: (pageId) => request('/favorites', { method: 'POST', body: { pageId } }),
    remove: (pageId) => request(`/favorites/${pageId}`, { method: 'DELETE' }),
    check: (pageId) => request(`/favorites/${pageId}/check`)
  },

  // Search
  search: {
    query: (params) => {
      const searchParams = new URLSearchParams(params);
      return request(`/search?${searchParams}`);
    },
    quick: (params) => {
      const searchParams = new URLSearchParams(params);
      return request(`/search/quick?${searchParams}`);
    },
    inPage: (pageId, q) => request(`/search/page/${pageId}?q=${encodeURIComponent(q)}`)
  },

  // Upload
  upload: {
    single: (file, workspaceId) => {
      const formData = new FormData();
      formData.append('file', file);
      if (workspaceId) formData.append('workspaceId', workspaceId);
      return request('/upload/single', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type with boundary
      });
    },
    multiple: (files, workspaceId) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      if (workspaceId) formData.append('workspaceId', workspaceId);
      return request('/upload/multiple', {
        method: 'POST',
        body: formData,
        headers: {}
      });
    },
    delete: (filename, workspaceId) => {
      const params = workspaceId ? `?workspaceId=${workspaceId}` : '';
      return request(`/upload/${filename}${params}`, { method: 'DELETE' });
    }
  }
};

export { ApiError };