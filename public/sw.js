// sw.js — Phase 15 (بند 47)
// بدون أي plugin بناء — استراتيجية بسيطة وواضحة:
// - طلبات التنقّل (navigation): Network-first مع رجوع لنسخة مخزّنة من "/" لو مفيش نت.
// - باقي الطلبات من نفس الأصل (JS/CSS/الصور): Cache-first، وتحديث الكاش من الشبكة في الخلفية.
// ملاحظة مهمة: زي أي PWA بكاش، نسخة جديدة من التطبيق ممكن تحتاج إغلاق كل التابات المفتوحة
// وإعادة الفتح مرة (أو ضغطة تحديث تانية) عشان الكاش القديم يتنضّف فعليًا — ده سلوك طبيعي للـ Service Workers.

const CACHE_VERSION = "family-app-v1";
const APP_SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // سيب طلبات الخطوط الخارجية لسلوك المتصفح الافتراضي

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
