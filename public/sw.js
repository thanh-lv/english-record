// ==============================================================================
// SpeakWithMsMy - Service Worker Optimization
// Multi-Tier Caching Architecture for High Performance & Offline Reliability
// ==============================================================================

// Cache namespaces
const CACHE_PREFIX = "speakwithmsmy";
const CACHE_APP = `${CACHE_PREFIX}-app-v__BUILD_TIMESTAMP__`;
const CACHE_FONTS = `${CACHE_PREFIX}-fonts-v1`;
const CACHE_MEDIA = `${CACHE_PREFIX}-media-v1`;
const CACHE_IMAGES = `${CACHE_PREFIX}-images-v1`;

// Danh sách các cache cố định cần giữ lại qua các lần deploy
const PERSISTENT_CACHES = [CACHE_FONTS, CACHE_MEDIA, CACHE_IMAGES];

// Giới hạn số lượng mục lưu trữ (LRU Limit) để bảo vệ dung lượng bộ nhớ
const MAX_MEDIA_ENTRIES = 100;
const MAX_IMAGE_ENTRIES = 60;

// Pre-cache tối thiểu cho App Shell
const PRECACHE_URLS = ["/", "/index.html", "/manifest.json", "/icon.svg"];

/**
 * LRU Cache Trimming: Giới hạn số lượng entry trong cache.
 * Xóa các mục cũ nhất (FIFO) khi vượt ngưỡng tối đa.
 */
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const itemsToDelete = keys.slice(0, keys.length - maxItems);
      await Promise.all(itemsToDelete.map((key) => cache.delete(key)));
    }
  } catch (err) {
    console.warn("[SW] Cache trimming error:", err);
  }
}

// ---- 1. Install: Pre-cache App Shell ----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_APP)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => console.warn("[SW] Precache failed:", err)),
  );
  // Kích hoạt SW mới ngay lập tức
  self.skipWaiting();
});

// ---- 2. Activate: Xóa bỏ các App Cache phiên bản cũ ----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            // Giữ lại các cache cố định (fonts, media, images) và CACHE_APP hiện tại
            if (key === CACHE_APP || PERSISTENT_CACHES.includes(key)) {
              return Promise.resolve();
            }
            // Xóa các cache app-v cũ hoặc cache legacy cũ
            if (
              key.startsWith(`${CACHE_PREFIX}-app-v`) ||
              key.startsWith(`${CACHE_PREFIX}-v`)
            ) {
              console.log("[SW] Deleting obsolete cache:", key);
              return caches.delete(key);
            }
            return Promise.resolve();
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// ---- 3. Fetch Event Routing & Caching Strategies ----
self.addEventListener("fetch", (event) => {
  // Bỏ qua non-GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Bỏ qua các scheme không phải HTTP/HTTPS (ví dụ chrome-extension://)
  if (!url.protocol.startsWith("http")) return;

  // Bỏ qua Backend APIs, Database (Supabase), Cloud Storage (S3 / R2 / CDN), Telegram API, Gemini API và Range requests
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.in") ||
    url.hostname.includes("r2.cloudflarestorage") ||
    url.hostname.includes("r2.dev") ||
    url.hostname.includes("amazonaws.com") ||
    url.hostname.includes("workers.dev") ||
    url.hostname.includes("telegram.org") ||
    url.hostname.includes("googleapis.com/v1") ||
    url.hostname.includes("generativelanguage.googleapis.com") ||
    event.request.headers.has("range")
  ) {
    return;
  }

  // --------------------------------------------------------------------------
  // A. HTML Navigation Requests (SPA Routes & index.html)
  // Chiến lược: Network-First -> Fallback Cache index.html (App Shell)
  // --------------------------------------------------------------------------
  const isNavigation =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    event.respondWith(
      (async () => {
        try {
          // Thử lấy từ network trước để luôn có phiên bản mới nhất
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches
              .open(CACHE_APP)
              .then((cache) => cache.put(event.request, clone))
              .catch(() => {});
          }
          return networkResponse;
        } catch {
          // Khi offline hoặc lỗi mạng: Phục vụ App Shell (index.html) từ cache
          const cached =
            (await caches.match(event.request)) ||
            (await caches.match("/index.html")) ||
            (await caches.match("/"));
          if (cached) {
            return cached;
          }
          return new Response(
            `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Đang kết nối lại...</title><style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F8FAFC;color:#334155;text-align:center;padding:20px}button{background:#2563EB;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:16px;cursor:pointer;margin-top:16px}</style></head><body><div><h2>⚠️ Không có kết nối mạng</h2><p>Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.</p><button onclick="window.location.reload()">Tải lại trang</button></div></body></html>`,
            {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            },
          );
        }
      })(),
    );
    return;
  }

  // --------------------------------------------------------------------------
  // B. Vite Static Chunks & Bundled Assets (/assets/*)
  // Các file JS, CSS, Asset có kèm hash từ Vite Rollup
  // Chiến lược: Cache-First tuyệt đối
  // --------------------------------------------------------------------------
  const isViteAsset =
    url.pathname.startsWith("/assets/") ||
    (url.origin === self.location.origin &&
      /\.(js|css|woff2?|png|webp|svg|jpg|jpeg|gif)$/i.test(url.pathname));

  if (isViteAsset) {
    event.respondWith(
      (async () => {
        try {
          const cached = await caches.match(event.request);
          if (cached) return cached;

          const response = await fetch(event.request);
          if (response && response.status === 200) {
            const clone = response.clone();
            caches
              .open(CACHE_APP)
              .then((cache) => cache.put(event.request, clone))
              .catch(() => {});
          }
          return (
            response ||
            new Response("Asset not found", { status: 404 })
          );
        } catch {
          const fallback = await caches.match(event.request);
          return (
            fallback ||
            new Response("Asset not available offline", { status: 503 })
          );
        }
      })(),
    );
    return;
  }

  // --------------------------------------------------------------------------
  // C. Web Fonts & Font Stylesheets (Google Fonts, Fonts CDN)
  // Chiến lược: Cache-First cho Webfonts, Stale-While-Revalidate cho Font CSS
  // --------------------------------------------------------------------------
  const isFontFile =
    url.hostname === "fonts.gstatic.com" ||
    /\.(woff2?|ttf|otf|eot)$/i.test(url.pathname);
  const isFontStylesheet = url.hostname === "fonts.googleapis.com";

  if (isFontFile) {
    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(CACHE_FONTS);
          const cached = await cache.match(event.request);
          if (cached) return cached;

          const response = await fetch(event.request);
          if (
            response &&
            (response.status === 200 || response.type === "opaque")
          ) {
            cache.put(event.request, response.clone()).catch(() => {});
          }
          return response;
        } catch {
          const cached = await caches.match(event.request);
          return (
            cached ||
            new Response("Font unavailable offline", { status: 504 })
          );
        }
      })(),
    );
    return;
  }

  if (isFontStylesheet) {
    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(CACHE_FONTS);
          const cached = await cache.match(event.request);

          const networkPromise = fetch(event.request)
            .then((response) => {
              if (
                response &&
                (response.status === 200 || response.type === "opaque")
              ) {
                cache.put(event.request, response.clone()).catch(() => {});
              }
              return response;
            })
            .catch(() => null);

          if (cached) {
            // Revalidate in background
            networkPromise.catch(() => {});
            return cached;
          }

          const res = await networkPromise;
          return (
            res ||
            new Response("/* Font stylesheet offline */", {
              status: 200,
              headers: { "Content-Type": "text/css" },
            })
          );
        } catch {
          return new Response("/* Font stylesheet error */", {
            status: 200,
            headers: { "Content-Type": "text/css" },
          });
        }
      })(),
    );
    return;
  }

  // --------------------------------------------------------------------------
  // D. Audio / Media Files (Dictionary API pronunciations, Lingva, MP3, WAV, TTS)
  // Chiến lược: Cache-First + LRU Trimming (Max 100 entries)
  // --------------------------------------------------------------------------
  const isAudioMedia =
    url.hostname.includes("dictionaryapi.dev") ||
    url.hostname.includes("soundoftext.com") ||
    (url.origin === self.location.origin &&
      /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(url.pathname));

  if (isAudioMedia) {
    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(CACHE_MEDIA);
          const cached = await cache.match(event.request);
          if (cached) return cached;

          const response = await fetch(event.request);
          if (
            response &&
            (response.status === 200 || response.type === "opaque")
          ) {
            cache.put(event.request, response.clone()).then(() => {
              trimCache(CACHE_MEDIA, MAX_MEDIA_ENTRIES);
            }).catch(() => {});
          }
          return response;
        } catch {
          const cached = await caches.match(event.request);
          return (
            cached ||
            new Response("Audio offline", { status: 504 })
          );
        }
      })(),
    );
    return;
  }

  // --------------------------------------------------------------------------
  // E. Static Images & Graphics (External illustrations, PNG, JPG, WebP, SVG)
  // Chiến lược: Stale-While-Revalidate + LRU Trimming (Max 60 entries)
  // --------------------------------------------------------------------------
  const isImage = /\.(png|jpe?g|webp|avif|svg|gif|ico)$/i.test(url.pathname);

  if (isImage) {
    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(CACHE_IMAGES);
          const cached = await cache.match(event.request);

          const networkPromise = fetch(event.request)
            .then((networkResponse) => {
              if (
                networkResponse &&
                (networkResponse.status === 200 ||
                  networkResponse.type === "opaque")
              ) {
                cache.put(event.request, networkResponse.clone()).then(() => {
                  trimCache(CACHE_IMAGES, MAX_IMAGE_ENTRIES);
                }).catch(() => {});
              }
              return networkResponse;
            })
            .catch(() => null);

          if (cached) {
            // Revalidate in background
            networkPromise.catch(() => {});
            return cached;
          }

          const res = await networkPromise;
          return (
            res ||
            new Response("", { status: 404, statusText: "Image Not Found" })
          );
        } catch {
          const cached = await caches.match(event.request);
          return (
            cached ||
            new Response("", { status: 404, statusText: "Image Not Found" })
          );
        }
      })(),
    );
    return;
  }

  // --------------------------------------------------------------------------
  // F. Fallback cho các tài nguyên tĩnh cùng origin (manifest.json, v.v.)
  // Chiến lược: Network-First với Fallback Cache an toàn
  // --------------------------------------------------------------------------
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (response && response.status === 200) {
            const clone = response.clone();
            caches
              .open(CACHE_APP)
              .then((cache) => cache.put(event.request, clone))
              .catch(() => {});
          }
          return response;
        } catch {
          const cached = await caches.match(event.request);
          return (
            cached ||
            new Response("Offline resource not cached", { status: 503 })
          );
        }
      })(),
    );
  }
});
