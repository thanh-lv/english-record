// Cache version – tự động theo timestamp build, thay đổi mỗi lần deploy
const CACHE_NAME = "speakwithmsmy-v__BUILD_TIMESTAMP__";

// Chỉ pre-cache các file tĩnh không đổi
const PRECACHE_URLS = ["/manifest.json", "/icon.svg"];

// ---- Install: pre-cache tối thiểu ----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Kích hoạt SW mới ngay, không chờ tab cũ đóng
  self.skipWaiting();
});

// ---- Activate: xóa cache cũ ----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => {
              console.log("[SW] Deleting old cache:", k);
              return caches.delete(k);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---- Fetch: Network-First strategy ----
self.addEventListener("fetch", (event) => {
  // Bỏ qua non-GET và API calls
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Bỏ qua Supabase, S3/R2, và các external API
  if (
    url.hostname.includes("supabase") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("r2.cloudflarestorage") ||
    url.hostname.includes("amazonaws.com")
  ) {
    return;
  }

  // HTML navigation requests (index.html, SPA routes)
  // → luôn lấy từ network trước để tránh blank page khi deploy mới
  const isNavigation =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache lại bản mới
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(event.request, clone)
          );
          return response;
        })
        .catch(() => {
          // Offline fallback: dùng cache nếu không có mạng
          return caches.match("/index.html").then(
            (cached) => cached || new Response("Offline", { status: 503 })
          );
        })
    );
    return;
  }

  // Static assets với hash trong tên file (vite build: /assets/xxx-AbCdEf.js)
  // → Cache-First vì hash đã đảm bảo tính duy nhất
  const isHashedAsset =
    url.pathname.startsWith("/assets/") &&
    /\.[a-f0-9]{8,}\.(js|css|woff2?|png|webp|svg)$/.test(url.pathname);

  if (isHashedAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(event.request, clone)
          );
          return response;
        });
      })
    );
    return;
  }

  // Các file khác (icon.svg, manifest.json, v.v.)
  // → Network-First, fallback cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque")
          return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) =>
          cache.put(event.request, clone)
        );
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
