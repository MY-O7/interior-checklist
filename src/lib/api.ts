// API 호출 헬퍼. credentials/헤더/JSON 직렬화 보일러플레이트를 한 곳으로 모음.
// 실패(non-2xx, 네트워크 오류)는 ApiError/TypeError 로 throw 한다 — 호출부는 try/catch 로 처리.

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    ...(body !== undefined
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // 본문이 없거나 JSON이 아님 (예: 프록시가 뱉은 HTML 에러 페이지)
  }
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `요청 실패 (${res.status})`);
  }
  return (data ?? {}) as T;
}

export const apiGet = <T = any>(path: string) => request<T>('GET', path);
export const apiPost = <T = any>(path: string, body?: unknown) => request<T>('POST', path, body);
export const apiPatch = <T = any>(path: string, body?: unknown) => request<T>('PATCH', path, body);
export const apiDelete = <T = any>(path: string, body?: unknown) => request<T>('DELETE', path, body);
