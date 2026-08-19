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

  // Bỏ qua Backend APIs, Database (Supabase) và Cloud Storage (S3 / R2)
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.in") ||
    url.hostname.includes("r2.cloudflarestorage") ||
    url.hostname.includes("amazonaws.com")
  ) {
    return;
  }

  // --------------------------------------------------------------------------
  // A. HTML Navigation Requests (SPA Routes & index.html)
  // Chiến lược: Network-First với Timeout (3s) -> Fallback Cache index.html
  // --------------------------------------------------------------------------
  const isNavigation =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    event.respondWith(
      (async () => {
        try {
          // Thử lấy từ network với timeout 3s để tránh màn hình trắng khi mạng lag
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Network timeout")), 3000),
          );
          const networkResponse = await Promise.race([
            fetch(event.request),
            timeoutPromise,
          ]);

          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches
              .open(CACHE_APP)
              .then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        } catch {
          // Offline hoặc timeout: Lấy từ cache
          const cached =
            (await caches.match(event.request)) ||
            (await caches.match("/index.html")) ||
            (await caches.match("/"));
          return (
            cached ||
            new Response(
              "Hệ thống đang offline. Vui lòng kiểm tra kết nối mạng.",
              {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              },
            )
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
      caches.match(event.request).then(async (cached) => {
        if (cached) return cached;

        try {
          const response = await fetch(event.request);
          if (response && response.status === 200) {
            const clone = response.clone();
            caches
              .open(CACHE_APP)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        } catch {
          return new Response("Asset not available offline", { status: 404 });
        }
      }),
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
      caches.open(CACHE_FONTS).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
          const response = await fetch(event.request);
          if (
            response &&
            (response.status === 200 || response.type === "opaque")
          ) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          return (
            cached || new Response("Font unavailable offline", { status: 504 })
          );
        }
      }),
    );
    return;
  }

  if (isFontStylesheet) {
    event.respondWith(
      caches.open(CACHE_FONTS).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (
              response &&
              (response.status === 200 || response.type === "opaque")
            ) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      }),
    );
    return;
  }

  // --------------------------------------------------------------------------
  // D. Audio / Media Files (Dictionary API pronunciations, Lingva, MP3, WAV, TTS)
  // Chiến lược: Cache-First + LRU Trimming (Max 100 entries)
  // --------------------------------------------------------------------------
  const isAudioMedia =
    url.hostname.includes("dictionaryapi.dev") ||
    url.hostname.includes("lingva") ||
    (url.hostname.includes("google.com") &&
      url.pathname.includes("translate_tts")) ||
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(url.pathname);

  if (isAudioMedia) {
    event.respondWith(
      caches.open(CACHE_MEDIA).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
          const response = await fetch(event.request);
          // Chỉ cache response 200 hoàn chỉnh (tránh 206 Partial Content gây lỗi Cache API)
          if (
            response &&
            (response.status === 200 || response.type === "opaque")
          ) {
            cache.put(event.request, response.clone()).then(() => {
              trimCache(CACHE_MEDIA, MAX_MEDIA_ENTRIES);
            });
          }
          return response;
        } catch {
          return cached || new Response("Audio offline", { status: 504 });
        }
      }),
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
      caches.open(CACHE_IMAGES).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              (networkResponse.status === 200 ||
                networkResponse.type === "opaque")
            ) {
              cache.put(event.request, networkResponse.clone()).then(() => {
                trimCache(CACHE_IMAGES, MAX_IMAGE_ENTRIES);
              });
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      }),
    );
    return;
  }

  // --------------------------------------------------------------------------
  // F. Fallback cho các tài nguyên tĩnh khác (manifest.json, v.v.)
  // Chiến lược: Network-First với Fallback Cache
  // --------------------------------------------------------------------------
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          !response ||
          response.status !== 200 ||
          response.type === "opaque"
        ) {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_APP).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
