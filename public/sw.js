// 캐시 버전. 올리면 기존 캐시(구버전 API 응답 포함)가 activate 시 모두 제거됨.
const CACHE_NAME = 'somssi-v2';
const PRECACHE_URLS = [
  '/dashboard',
  '/offline',
];

// Install: 핵심 페이지 미리 캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: 옛 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: 페이지/정적자원만 network-first로 캐시. API는 절대 캐시하지 않음.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 외부 도메인(폰트 CDN 등)·API 요청은 캐시 개입 없이 그대로 통과
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // 정상 응답만 캐시 (오류 응답·불완전 응답 제외)
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((r) => r || caches.match('/offline'))
      )
  );
});
