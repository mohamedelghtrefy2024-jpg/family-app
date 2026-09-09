// scripts/stamp-sw-cache-version.mjs
//
// المشكلة اللي بيحلها الملف ده: قبل كده كان CACHE_VERSION في public/sw.js
// نص ثابت ("family-app-v1") مش بيتغيّر أبدًا. الـ Service Worker بيمسح بس
// الكاشات اللي اسمها مختلف عن القيمة دي (`activate` handler) — فلو نشرت
// نسخة جديدة من الموقع من غير ما تغيّر النص ده يدويًا، أي حد فتح الموقع قبل
// كده هيفضل شغّال بنسخة الكاش القديمة (حتى لو فيها استجابة خربانة اتخزنت
// غلط من محاولة نشر قديمة، زي manifest.json راجع HTML بدل JSON) — من غير ما
// يحس، ومن غير ما إعادة النشر تصلّحها ليه.
//
// الحل: بعد كل `vite build`، السكريبت ده بيحقن قيمة جديدة (تاريخ/وقت البناء)
// في dist/sw.js تلقائيًا — فكل نشر جديد يبقى Cache Version مختلف، والمتصفح
// بيمسح كل كاش قديم فورًا (activate handler أصلًا بيعمل كده، بس محتاج قيمة
// فعلاً متغيّرة كل مرة).
import { readFileSync, writeFileSync } from "node:fs";

const SW_PATH = "dist/sw.js";
const buildStamp = new Date().toISOString().replace(/[:.]/g, "-");

const original = readFileSync(SW_PATH, "utf8");
const stamped = original.replace(
  /const CACHE_VERSION = ".*";/,
  `const CACHE_VERSION = "family-app-${buildStamp}";`
);

if (stamped === original) {
  console.error("[stamp-sw-cache-version] لم ألاقِ سطر CACHE_VERSION المتوقع في dist/sw.js — راجع الملف يدويًا.");
  process.exit(1);
}

writeFileSync(SW_PATH, stamped, "utf8");
console.log(`[stamp-sw-cache-version] CACHE_VERSION = family-app-${buildStamp}`);
