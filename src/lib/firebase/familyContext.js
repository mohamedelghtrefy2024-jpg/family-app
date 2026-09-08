// src/lib/firebase/familyContext.js
//
// أبسط حل ممكن لمشكلة "كل الـ repositories محتاجة تعرف familyId": بدل ما نضيف
// باراميتر familyId لكل دالة في كل الـ 16 ملف repo (تغيير كبير وخطر على كود
// مُختبر شغّال)، بنحتفظ بـ familyId الحالي هنا كمتغيّر وحيد بيتحدّث مرة واحدة
// من AuthContext وقت تسجيل الدخول/الخروج، وكل استعلامات Firestore (في
// firestoreDb.js) بتقراه من هنا.
//
// ده أسلوب مقصود ومناسب لطبيعة التطبيق: مستخدم واحد بيستخدم أسرة واحدة في
// نفس الوقت (مفيش "بدّل بين أسرتين في نفس التبويب") — لو الاحتياج ده ظهر
// مستقبلًا، محتاج إعادة تصميم أوسع (تمرير familyId صراحة)، مش تعديل هنا.

let currentFamilyId = null;

export function setCurrentFamilyId(familyId) {
  currentFamilyId = familyId;
}

export function getCurrentFamilyId() {
  return currentFamilyId;
}

export function clearCurrentFamilyId() {
  currentFamilyId = null;
}
