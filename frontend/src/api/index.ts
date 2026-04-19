import api from './client'
import type { TokenResponse } from '@/types'

export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),
  signup: (data: { email: string; password: string; full_name: string; phone?: string; role?: string }) =>
    api.post<TokenResponse>('/auth/signup', data),
  getMe: () => api.get('/auth/me'),
  updateMe: (data: any) => api.put('/auth/me', data),
}

export const usersApi = {
  list: (role?: string) => api.get('/users', { params: { role } }),
  create: (data: any) => api.post('/users', data),
  get: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
}

export const clientsApi = {
  list: () => api.get('/clients'),
  create: (data: any) => api.post('/clients', data),
  get: (id: string) => api.get(`/clients/${id}`),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
}

export const surveyorsApi = {
  list: () => api.get('/surveyors'),
  create: (data: any) => api.post('/surveyors', data),
  get: (id: string) => api.get(`/surveyors/${id}`),
  update: (id: string, data: any) => api.put(`/surveyors/${id}`, data),
  delete: (id: string) => api.delete(`/surveyors/${id}`),
}

export const projectsApi = {
  list: (status?: string) => api.get('/projects', { params: { status } }),
  create: (data: any) => api.post('/projects', data),
  get: (id: string) => api.get(`/projects/${id}`),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
}

export const quotationsApi = {
  list: () => api.get('/quotations'),
  create: (data: any) => api.post('/quotations', data),
  get: (id: string) => api.get(`/quotations/${id}`),
  update: (id: string, data: any) => api.put(`/quotations/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/quotations/${id}/status`, null, { params: { status } }),
}

export const invoicesApi = {
  list: () => api.get('/invoices'),
  create: (data: any) => api.post('/invoices', data),
  createFromQuotation: (quotationId: string, params?: { due_date?: string; notes?: string }) =>
    api.post(`/invoices/from-quotation/${quotationId}`, null, { params }),
  get: (id: string) => api.get(`/invoices/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/invoices/${id}/status`, null, { params: { status } }),
  recordPayment: (id: string, data: any) => api.post(`/invoices/${id}/payments`, data),
  getPayments: (id: string) => api.get(`/invoices/${id}/payments`),
}

export const ticketsApi = {
  list: (status?: string) => api.get('/tickets', { params: { status } }),
  create: (data: any) => api.post('/tickets', data),
  get: (id: string) => api.get(`/tickets/${id}`),
  update: (id: string, data: any) => api.put(`/tickets/${id}`, data),
  addComment: (id: string, data: any) => api.post(`/tickets/${id}/comments`, data),
  getComments: (id: string) => api.get(`/tickets/${id}/comments`),
}

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentProjects: () => api.get('/dashboard/recent-projects'),
}

export const documentsApi = {
  list: (projectId: string) => api.get(`/projects/${projectId}/documents`),
  upload: (projectId: string, file: File, description?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (description) formData.append('description', description)
    return api.post(`/projects/${projectId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  download: (projectId: string, docId: string) =>
    api.get(`/projects/${projectId}/documents/${docId}/download`, { responseType: 'blob' }),
  delete: (projectId: string, docId: string) =>
    api.delete(`/projects/${projectId}/documents/${docId}`),
}

export const autocadApi = {
  uploadDxf: (projectId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/projects/${projectId}/autocad/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getEntities: (projectId: string) =>
    api.get(`/projects/${projectId}/autocad/entities`),
  saveDrawing: (projectId: string, data: any) =>
    api.post(`/projects/${projectId}/autocad/save`, data),
  listVersions: (projectId: string) =>
    api.get(`/projects/${projectId}/autocad/versions`),
  createVersion: (projectId: string, data: any) =>
    api.post(`/projects/${projectId}/autocad/versions`, data),
  getVersion: (projectId: string, versionId: string) =>
    api.get(`/projects/${projectId}/autocad/versions/${versionId}`),
  updateVersion: (projectId: string, versionId: string, data: any) =>
    api.put(`/projects/${projectId}/autocad/versions/${versionId}`, data),
  deleteVersion: (projectId: string, versionId: string) =>
    api.delete(`/projects/${projectId}/autocad/versions/${versionId}`),
}

export const priceMasterApi = {
  listTiers: () => api.get('/price-master/tiers'),
  createTier: (data: any) => api.post('/price-master/tiers', data),
  updateTier: (id: string, data: any) => api.put(`/price-master/tiers/${id}`, data),
  deleteTier: (id: string) => api.delete(`/price-master/tiers/${id}`),
  listTerms: () => api.get('/price-master/terms'),
  createTerm: (data: any) => api.post('/price-master/terms', data),
  updateTerm: (id: string, data: any) => api.put(`/price-master/terms/${id}`, data),
  deleteTerm: (id: string) => api.delete(`/price-master/terms/${id}`),
  seedDefaults: () => api.post('/price-master/seed-defaults'),
}

export const projectMapsApi = {
  listVersions: (projectId: string) =>
    api.get(`/projects/${projectId}/map-versions`),
  createVersion: (projectId: string, data: any) =>
    api.post(`/projects/${projectId}/map-versions`, data),
  getVersion: (projectId: string, versionId: string) =>
    api.get(`/projects/${projectId}/map-versions/${versionId}`),
  updateVersion: (projectId: string, versionId: string, data: any) =>
    api.put(`/projects/${projectId}/map-versions/${versionId}`, data),
  deleteVersion: (projectId: string, versionId: string) =>
    api.delete(`/projects/${projectId}/map-versions/${versionId}`),
}

export const siteSettingsApi = {
  get: () => api.get('/site-settings'),
  update: (data: any) => api.put('/site-settings', data),
  uploadLogo: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/site-settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadFavicon: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/site-settings/favicon', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteLogo: () => api.delete('/site-settings/logo'),
  getLogoUrl: () => '/api/v1/site-settings/logo/file',
  getFaviconUrl: () => '/api/v1/site-settings/favicon/file',
}
