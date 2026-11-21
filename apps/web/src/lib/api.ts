export interface MetaInfo {
  name: string;
  version: string;
  capabilities: {
    workbooks: string;
    ai: boolean;
    plugins: boolean;
  };
}

export interface HealthInfo {
  status: string;
  name: string;
  version: string;
}

export interface WorkbookRecord {
  id: string;
  name: string;
  snapshot: unknown;
  revision: number;
  updatedAt: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Tauri 运行时注入 `__TAURI_INTERNALS__`；桌面端没有 Vite proxy，直连本地后端。 */
function detectTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? (detectTauri() ? 'http://127.0.0.1:8787' : '')
).replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 5_000;

/** 拼接后端 URL。未配置 VITE_API_BASE_URL 时走同源（开发期为 Vite proxy）。 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function errorMessageOf(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const error = (body as { error?: { message?: unknown } }).error;
    if (error && typeof error.message === 'string' && error.message.length > 0) {
      return error.message;
    }
  }
  return fallback;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl(path), {
      ...init,
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...init.headers,
      },
    });

    if (!response.ok) {
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        // 响应体不是 JSON 时使用默认错误文案。
      }
      throw new ApiError(
        response.status,
        errorMessageOf(body, `请求失败（HTTP ${response.status}）`),
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchHealth(): Promise<HealthInfo> {
  return request<HealthInfo>('/api/v1/health');
}

export function fetchMeta(): Promise<MetaInfo> {
  return request<MetaInfo>('/api/v1/meta');
}

export function fetchWorkbook(id: string): Promise<WorkbookRecord> {
  return request<WorkbookRecord>(`/api/v1/workbooks/${encodeURIComponent(id)}`);
}

export function saveWorkbook(
  id: string,
  payload: { name: string; snapshot: unknown },
): Promise<WorkbookRecord> {
  return request<WorkbookRecord>(`/api/v1/workbooks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
