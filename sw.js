// 도료계산기 서비스워커 — 오프라인 캐싱 + 자동 업데이트
// 아래 CACHE 버전은 deploy.sh가 배포할 때마다 자동으로 갱신함 (수정 금지 권장)
const CACHE = 'paint-calc-20260629151142';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// 설치: 핵심 자산 미리 캐싱 후 즉시 활성화
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 활성화: 옛 캐시 정리 후 모든 탭 즉시 장악
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // 화면(HTML) 요청 → 네트워크 우선: 온라인이면 항상 최신, 끊기면 캐시
  const isDoc = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');
  if (isDoc) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // 그 외 자산(아이콘 등) → 캐시 우선, 없으면 네트워크 후 런타임 캐싱
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && req.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
