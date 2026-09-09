// sw.js — Phase 15 (بند 47)
// بدون أي plugin بناء — استراتيجية بسيطة وواضحة:
// - طلبات التنقّل لصفحة SPA (فتح "/" أو أي مسار داخلي زي "/settings"):
//   Network-first مع رجوع لنسخة مخزّنة من "/" لو مفيش نت.
// - أي طلب تاني (JS/CSS/الصور/manifest.json...)، **حتى لو كان request.mode
//   نفسه "navigate"** (زي فتح /manifest.json مباشرة في تاب جديد — ده برضه
//   navigate!): Cache-first بالمفتاح الصحيح لنفس المسار المطلوب، وتحديث
//   الكاش من الشبكة في الخلفية.
// ⚠️ باگ كان هنا وتصلّح: كل الكود كان بيتعامل مع أي navigate (بما فيها فتح
// /manifest.json مباشرة) وكأنه فتح الصفحة الرئيسية بالظبط — بيحفظه في الكاش
// تحت مفتاح "/" الثابت (غلط، بدل مسار الطلب الحقيقي)، وبيرجّع نسخة الصفحة
// الرئيسية المخزّنة عند أي فشل بسيط بدل المحتوى الصح. الفرق دلوقتي: لو
// المسار شكله ملف حقيقي (فيه امتداد زي .json) مش SPA route، بيتعامل معاه
// عادي بالـ cache-first، مش بمنطق "صفحة SPA".
// ملاحظة مهمة: زي أي PWA بكاش، نسخة جديدة من التطبيق ممكن تحتاج إغلاق كل التابات المفتوحة
// وإعادة الفتح مرة (أو ضغطة تحديث تانية) عشان الكاش القديم يتنضّف فعليًا — ده سلوك طبيعي للـ Service Workers.
//
// ملحوظة (نسخة Spark المجانية): كان هنا كود Firebase Cloud Messaging لاستقبال
// Push حقيقي حتى لو التطبيق مقفول — اتشال عمدًا لأن إرسال التنبيهات كان
// معتمد على Cloud Functions + Cloud Scheduler، والاتنين محتاجين خطة Blaze
// (فوترة مفعّلة) حتى لو الاستخدام صفر. لو حبيت ترجّعهم لاحقًا، النسخة القديمة
// موجودة في تاريخ الـ git.
//
const CACHE_VERSION = "family-app-v1";
// self.registration.scope بدل مسار "/" ثابت — عشان يشتغل صح سواء الـ SW
// مسجّل على الجذر (سيرفر محلي) أو على مسار فرعي زي GitHub Pages
// (username.github.io/repo/).
const SCOPE = self.registration.scope; // ينتهي دايمًا بـ "/"
const APP_SHELL = [SCOPE, SCOPE + "manifest.json"];

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

  // "شكله ملف" = آخر جزء في المسار فيه امتداد (زي .json/.png/.js) — ده مش
  // SPA route (اللي عادةً مسار بدون امتداد زي "/" أو "/settings").
  const looksLikeStaticFile = /\.[a-zA-Z0-9]+$/.test(url.pathname);

  if (request.mode === "navigate" && !looksLikeStaticFile) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(SCOPE, copy));
          return response;
        })
        .catch(() => caches.match(SCOPE))
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
