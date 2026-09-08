// src/lib/firebase/config.js
//
// ⚠️ Placeholder مقصود — التطبيق مش هيشتغل ضد Firebase حقيقي لحد ما تستبدل
// القيم دي. راجع القسم 6 (Phase B) من برومبت الترحيل.
//
// القيم بتتقرا من متغيرات البيئة (.env) بدل ما تتكتب هنا مباشرة، عشان ملف الكود
// نفسه ينفع يترفع على Git بأمان — .env الفعلي (مش .env.example) ما يترفعش أبدًا.
// شوف .env.example للقائمة الكاملة والتعليمات.
//
// كل القيم دي بتيجي من: Firebase Console → Project Settings → عمود "SDK setup
// and configuration" → اختار "Config".
//
// نسخة Spark (مجانية بالكامل — بدون Blaze/Cloud Functions): الملف ده بيهيّئ
// Auth + Firestore بس. Functions و Messaging اتشالوا عمدًا لأنهم محتاجين
// مشروع على خطة Blaze (فوترة مفعّلة) حتى لو استخدامك الفعلي صفر.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "TODO_FIREBASE_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "TODO_FIREBASE_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "TODO_FIREBASE_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "TODO_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "TODO_FIREBASE_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "TODO_FIREBASE_APP_ID",
};

const IS_PLACEHOLDER = firebaseConfig.apiKey.startsWith("TODO_");

// يطبع تحذير واضح مرة واحدة بدل ما يفشل بصمت أو يديك خطأ Firebase مبهم.
if (IS_PLACEHOLDER && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[firebase/config] لسه Placeholder — أنشئ ملف .env (من .env.example) وحط بيانات مشروع Firebase الحقيقي بتاعك قبل ما تشغّل التطبيق فعليًا."
  );
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);

// Offline persistence مدمج في Firestore SDK نفسه (بند 6/Phase D) — بديل عن
// Dexie، مش بالتوازي معاه، عشان يفضل مصدر حقيقة واحد للبيانات.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache(/* settings */ {}),
});

// وضع الـ Emulator — يتفعّل تلقائيًا وقت التطوير المحلي (`npm run dev`) لو
// VITE_USE_FIREBASE_EMULATOR=true في .env، عشان تقدر تجرب Auth + Firestore
// محليًا بدون ما تلمس بيانات حقيقية أو تحتاج مشروع Firebase مدفوع أصلًا.
const USE_EMULATOR = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
let emulatorsConnected = false;

function connectToEmulatorsIfConfigured() {
  if (!USE_EMULATOR || emulatorsConnected) return;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  emulatorsConnected = true;
}

connectToEmulatorsIfConfigured();

export { app, auth, db, IS_PLACEHOLDER };
