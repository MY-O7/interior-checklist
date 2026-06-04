// API 호출 헬퍼. credentials/헤더/JSON 직렬화 보일러플레이트를 한 곳으로 모음.
// 항상 파싱된 JSON을 반환 (본문이 없으면 빈 객체).

async function request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    ...(body !== undefined
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
}

export const apiGet = <T = any>(path: string) => request<T>('GET', path);
export const apiPost = <T = any>(path: string, body?: unknown) => request<T>('POST', path, body);
export const apiPatch = <T = any>(path: string, body?: unknown) => request<T>('PATCH', path, body);
export const apiDelete = <T = any>(path: string, body?: unknown) => request<T>('DELETE', path, body);
