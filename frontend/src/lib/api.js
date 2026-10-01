import axios from 'axios';
import { useAuth } from './auth';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4100/api', timeout: 20000 });
let refreshing = null;

api.interceptors.request.use(config => {
  const accessToken = useAuth.getState().session?.accessToken;
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    const session = useAuth.getState().session;
    if (error.response?.status === 401 && original && !original._retried && session?.refreshToken && !original.url?.includes('/auth/refresh')) {
      original._retried = true;
      try {
        if (!refreshing) {
          refreshing = axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: session.refreshToken })
            .then(({ data }) => { useAuth.getState().signIn(data); return data.accessToken; })
            .finally(() => { refreshing = null; });
        }
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        useAuth.getState().signOut();
      }
    }
    return Promise.reject(error);
  }
);

export function errMessage(error) {
  return error.response?.data?.message || error.message || 'Đã xảy ra lỗi, vui lòng thử lại';
}

export async function downloadExcel(type, filters = {}) {
  const { data } = await api.get('/reports/export', { params: { type, ...filters }, responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inventory-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default api;
