/**
 * tests/security-rules.test.mjs
 *
 * اختبارات تنفيذية حقيقية لـ firestore.rules ضد Firebase Emulator المحلي —
 * مش قراءة الملف وتخمين، ده تنفيذ فعلي لعمليات قراءة/كتابة بأدوار مختلفة
 * والتحقق إنها تتقبل أو تترفض بالظبط زي المتوقع (القسم 2 من برومبت الترحيل:
 * الحماية سيرفر-ساید، ولازم تُختبر فعليًا مش بس تُكتب).
 *
 * التشغيل (يشغّل الـ emulator تلقائيًا، ميحتاجش مشروع Firebase حقيقي):
 *   npm run test:rules
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query as fsQuery, where as fsWhere } from "firebase/firestore";

const PROJECT_ID = "demo-family-app";

let testEnv;
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    failures.push({ name, err });
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

async function main() {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });

  // ------------------------------------------------------------------
  // بيانات أولية: أسرة واحدة، أب واحد، ابن واحد، مصروف واحد، درس واحد.
  // بتتزرع بصلاحية Admin (بتتجاوز الـ Rules) عشان نجهز الحالة، مش عشان نختبرها.
  // ------------------------------------------------------------------
  const FAMILY_ID = "fam1";
  const PARENT_UID = "parent1";
  const CHILD_UID = "childUser1";
  const CHILD_RECORD_ID = "child1";
  const OTHER_CHILD_RECORD_ID = "child2";

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `families/${FAMILY_ID}`), { name: "أسرة الاختبار" });
    await setDoc(doc(db, `families/${FAMILY_ID}/children/${CHILD_RECORD_ID}`), {
      name: "أحمد", family_id: FAMILY_ID,
    });
    await setDoc(doc(db, `families/${FAMILY_ID}/children/${OTHER_CHILD_RECORD_ID}`), {
      name: "سارة", family_id: FAMILY_ID,
    });
    await setDoc(doc(db, `families/${FAMILY_ID}/lessons/lesson1`), {
      child_id: CHILD_RECORD_ID, subject_id: "sub1", location_id: "loc1", family_id: FAMILY_ID,
    });
    await setDoc(doc(db, `families/${FAMILY_ID}/lessons/lesson2`), {
      child_id: OTHER_CHILD_RECORD_ID, subject_id: "sub1", location_id: "loc1", family_id: FAMILY_ID,
    });
    await setDoc(doc(db, `families/${FAMILY_ID}/prices/price1`), {
      lesson_id: "lesson1", child_id: CHILD_RECORD_ID, amount: 300, family_id: FAMILY_ID,
    });
    await setDoc(doc(db, `families/${FAMILY_ID}/expenses/exp1`), {
      child_id: CHILD_RECORD_ID, amount: 1000, family_id: FAMILY_ID,
    });
    await setDoc(doc(db, `families/${FAMILY_ID}/payments/pay1`), {
      expense_id: "exp1", amount: 600, family_id: FAMILY_ID,
    });
    await setDoc(doc(db, `families/${FAMILY_ID}/budgets/budget1`), {
      scope: "Family", planned_amount: 5000, family_id: FAMILY_ID,
    });
  });

  // نسخة Spark (مجانية، بدون Cloud Functions): الدور/الأسرة بيتقروا من مستند
  // userProfiles/{uid} (راجع firestore.rules) بدل Custom Claims على التوكن —
  // فبنزرعهم هنا بصلاحية Admin زي أي بيانات تجهيزية تانية، مش بنمررهم كـ
  // claims لـ authenticatedContext.
  const STRANGER_UID = "stranger1";
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `userProfiles/${PARENT_UID}`), { role: "Parent", familyId: FAMILY_ID });
    await setDoc(doc(db, `userProfiles/${CHILD_UID}`), {
      role: "Child", familyId: FAMILY_ID, linkedChildId: CHILD_RECORD_ID,
    });
    await setDoc(doc(db, `userProfiles/${STRANGER_UID}`), { role: "Parent", familyId: "otherFamily" });
  });

  const parentCtx = testEnv.authenticatedContext(PARENT_UID);
  const childCtx = testEnv.authenticatedContext(CHILD_UID);
  const unlinkedChildCtx = testEnv.authenticatedContext("childUserNoLink");
  // مستخدم مسجّل دخول لكن معندوش مستند userProfiles أصلًا (لسه محدش ربطه)
  const strangerCtx = testEnv.authenticatedContext(STRANGER_UID);

  const parentDb = parentCtx.firestore();
  const childDb = childCtx.firestore();
  const unlinkedDb = unlinkedChildCtx.firestore();
  const strangerDb = strangerCtx.firestore();

  /* ================================================================ */
  section("🔒 بيانات مالية — الابن Deny كامل حتى القراءة");
  /* ================================================================ */

  await test("الابن ميقدرش يقرا expenses بتاعة أسرته", async () => {
    await assertFails(getDoc(doc(childDb, `families/${FAMILY_ID}/expenses/exp1`)));
  });

  await test("الابن ميقدرش يقرا payments", async () => {
    await assertFails(getDoc(doc(childDb, `families/${FAMILY_ID}/payments/pay1`)));
  });

  await test("الابن ميقدرش يقرا budgets", async () => {
    await assertFails(getDoc(doc(childDb, `families/${FAMILY_ID}/budgets/budget1`)));
  });

  await test("الابن ميقدرش يعمل List على مجموعة expenses كلها (مش مستند واحد بس)", async () => {
    await assertFails(getDocs(collection(childDb, `families/${FAMILY_ID}/expenses`)));
  });

  await test("الابن ميقدرش يكتب/يعدّل expense حتى لو حاول مباشرة", async () => {
    await assertFails(
      setDoc(doc(childDb, `families/${FAMILY_ID}/expenses/hacked1`), { amount: 1, family_id: FAMILY_ID })
    );
  });

  await test("الأب/الأم يقدروا يقروا نفس البيانات المالية عادي", async () => {
    await assertSucceeds(getDoc(doc(parentDb, `families/${FAMILY_ID}/expenses/exp1`)));
    await assertSucceeds(getDoc(doc(parentDb, `families/${FAMILY_ID}/payments/pay1`)));
    await assertSucceeds(getDoc(doc(parentDb, `families/${FAMILY_ID}/budgets/budget1`)));
  });

  /* ================================================================ */
  section("📚 جدول/دروس — الابن يشوف بتاعه بس، مش إخوته");
  /* ================================================================ */

  await test("الابن يقدر يقرا درسه هو (lesson1، child_id == سجله)", async () => {
    await assertSucceeds(getDoc(doc(childDb, `families/${FAMILY_ID}/lessons/lesson1`)));
  });

  await test("الابن ميقدرش يقرا درس أخته (lesson2، child_id != سجله)", async () => {
    await assertFails(getDoc(doc(childDb, `families/${FAMILY_ID}/lessons/lesson2`)));
  });

  await test("الأب/الأم يقدروا يقروا دروس كل الأبناء", async () => {
    await assertSucceeds(getDoc(doc(parentDb, `families/${FAMILY_ID}/lessons/lesson1`)));
    await assertSucceeds(getDoc(doc(parentDb, `families/${FAMILY_ID}/lessons/lesson2`)));
  });

  await test("Query عريض (list) بدون فلتر child_id يُرفض كليًا للابن (Firestore query-scoping)", async () => {
    // ده الأساس اللي بُني عليه loadChildScheduleContext.js بدل loadCalendarContext.js
    // للابن — Firestore بيرفض الـ query كله (مش بيفلتره) لو مش قابل للتحقق من الـ Rule.
    await assertFails(getDocs(collection(childDb, `families/${FAMILY_ID}/lessons`)));
  });

  await test("Query مفلتر بـ where(child_id == سجله) ينجح للابن (نفس الحقل اللي الـ Rule بتفحصه)", async () => {
    const q = fsQuery(collection(childDb, `families/${FAMILY_ID}/lessons`), fsWhere("child_id", "==", CHILD_RECORD_ID));
    await assertSucceeds(getDocs(q));
  });

  await test("الابن ميقدرش يعدّل أو يحذف درسه حتى لو بتاعه (Read-Only كامل)", async () => {
    await assertFails(
      setDoc(doc(childDb, `families/${FAMILY_ID}/lessons/lesson1`), {
        child_id: CHILD_RECORD_ID, subject_id: "hacked", family_id: FAMILY_ID,
      })
    );
    await assertFails(deleteDoc(doc(childDb, `families/${FAMILY_ID}/lessons/lesson1`)));
  });

  /* ================================================================ */
  section("💰 سعر الدرس — مسموح للابن يشوفه صراحة (مطلوب في القسم 3)");
  /* ================================================================ */

  await test("الابن يقدر يقرا سعر درسه هو", async () => {
    await assertSucceeds(getDoc(doc(childDb, `families/${FAMILY_ID}/prices/price1`)));
  });

  /* ================================================================ */
  section("👨‍👩‍👧 عزل الأسر عن بعض (Multi-tenant boundary)");
  /* ================================================================ */

  await test("أب من أسرة تانية ميقدرش يقرا أي حاجة في الأسرة دي", async () => {
    await assertFails(getDoc(doc(strangerDb, `families/${FAMILY_ID}/lessons/lesson1`)));
    await assertFails(getDoc(doc(strangerDb, `families/${FAMILY_ID}/children/${CHILD_RECORD_ID}`)));
  });

  /* ================================================================ */
  section("⏳ مستخدم لسه مش مربوط (بند 8.3 — الربط اليدوي)");
  /* ================================================================ */

  await test("مستخدم جديد مسجّل دخول بس لسه مالوش مستند userProfiles (مش مربوط) — Deny كامل", async () => {
    await assertFails(getDoc(doc(unlinkedDb, `families/${FAMILY_ID}/lessons/lesson1`)));
    await assertFails(getDoc(doc(unlinkedDb, `families/${FAMILY_ID}/children/${CHILD_RECORD_ID}`)));
  });

  /* ================================================================ */
  section("👤 members — الربط اليدوي للأب/الأم بس");
  /* ================================================================ */

  await test("الابن ميقدرش يضيف/يعدّل عضو في members (حتى نفسه)", async () => {
    await assertFails(
      setDoc(doc(childDb, `families/${FAMILY_ID}/members/${CHILD_UID}`), {
        role: "Parent", // محاولة تصعيد صلاحيات
        familyId: FAMILY_ID,
      })
    );
  });

  await test("الأب/الأم يقدر يضيف/يربط عضو جديد", async () => {
    await assertSucceeds(
      setDoc(doc(parentDb, `families/${FAMILY_ID}/members/newChildUser`), {
        role: "Child",
        linkedChildId: OTHER_CHILD_RECORD_ID,
      })
    );
  });

  /* ================================================================ */
  section("🌱 Bootstrap — أول أب/أم في أسرة جديدة تمامًا (مفيش حد يربطه)");
  /* ================================================================ */

  await test("مستخدم جديد يقدر يؤسس أسرة جديدة (يحدد نفسه founderUid)", async () => {
    const founderCtx = testEnv.authenticatedContext("founderUid1", {});
    const founderDb = founderCtx.firestore();
    await assertSucceeds(
      setDoc(doc(founderDb, "families/newFam1"), { name: "أسرة جديدة", founderUid: "founderUid1" })
    );
  });

  await test("المؤسس يقدر يضيف نفسه Parent في الأسرة اللي أسسها هو بس", async () => {
    const founderCtx = testEnv.authenticatedContext("founderUid1", {});
    const founderDb = founderCtx.firestore();
    await assertSucceeds(
      setDoc(doc(founderDb, "families/newFam1/members/founderUid1"), { role: "Parent" })
    );
  });

  await test("مستخدم تاني ميقدرش يضيف نفسه Parent في أسرة مؤسسها شخص غيره", async () => {
    const impostorCtx = testEnv.authenticatedContext("impostorUid", {});
    const impostorDb = impostorCtx.firestore();
    await assertFails(
      setDoc(doc(impostorDb, "families/newFam1/members/impostorUid"), { role: "Parent" })
    );
  });

  await test("المؤسس ميقدرش يضيف نفسه بدور غير Parent كـ bootstrap (محاولة تحايل)", async () => {
    const founderCtx = testEnv.authenticatedContext("founderUid2", {});
    const founderDb = founderCtx.firestore();
    await setDoc(doc(founderDb, "families/newFam2"), { name: "أسرة", founderUid: "founderUid2" });
    await assertFails(
      setDoc(doc(founderDb, "families/newFam2/members/founderUid2"), { role: "Child" })
    );
  });

  /* ================================================================ */
  section("🆔 userProfiles — مصدر الصلاحية الحقيقي (بديل Spark للـ Custom Claims)");
  /* ================================================================ */

  await test("المؤسس يقدر يكتب userProfiles بتاعه هو بس (role: Parent) في الأسرة اللي أسسها", async () => {
    const founderCtx = testEnv.authenticatedContext("founderUid3", {});
    const founderDb = founderCtx.firestore();
    await setDoc(doc(founderDb, "families/newFam3"), { name: "أسرة", founderUid: "founderUid3" });
    await assertSucceeds(
      setDoc(doc(founderDb, "userProfiles/founderUid3"), { role: "Parent", familyId: "newFam3" })
    );
  });

  await test("مستخدم تاني ميقدرش يكتب userProfiles لنفسه بـ familyId أسرة مؤسسها شخص غيره", async () => {
    const impostorCtx = testEnv.authenticatedContext("impostorUid2", {});
    const impostorDb = impostorCtx.firestore();
    await assertFails(
      setDoc(doc(impostorDb, "userProfiles/impostorUid2"), { role: "Parent", familyId: "newFam3" })
    );
  });

  await test("الأب/الأم يقدر يكتب userProfiles لعضو جديد في أسرته", async () => {
    await assertSucceeds(
      setDoc(doc(parentDb, "userProfiles/newChildUser"), {
        role: "Child", familyId: FAMILY_ID, linkedChildId: OTHER_CHILD_RECORD_ID,
      })
    );
  });

  await test("الابن ميقدرش يكتب/يعدّل userProfiles حتى بتاعه هو (مفيش ترقية صلاحيات ذاتية)", async () => {
    await assertFails(
      setDoc(doc(childDb, `userProfiles/${CHILD_UID}`), { role: "Parent", familyId: FAMILY_ID })
    );
  });

  await test("أب من أسرة تانية ميقدرش يكتب/يقرا userProfiles بتاع حد في الأسرة دي", async () => {
    await assertFails(
      setDoc(doc(strangerDb, `userProfiles/${CHILD_UID}`), { role: "Parent", familyId: FAMILY_ID })
    );
    await assertFails(getDoc(doc(strangerDb, `userProfiles/${PARENT_UID}`)));
  });

  await test("كل مستخدم يقدر يقرا بروفايله هو بس", async () => {
    await assertSucceeds(getDoc(doc(parentDb, `userProfiles/${PARENT_UID}`)));
    await assertFails(getDoc(doc(childDb, `userProfiles/${PARENT_UID}`)));
  });

  /* ================================================================ */
  section("🧪 محاولة تزوير الدور من الـ client نفسه");
  /* ================================================================ */

  await test("مستخدم بدور Parent مزوّر في بيانات المستند نفسه (مش في userProfiles) لسه Deny لو دوره الحقيقي Child", async () => {
    // نفس childCtx (userProfiles.role=Child) بيحاول يكتب مستند فيه حقل
    // role:"Parent" — الـ Rule بتتحقق من مستند userProfiles الحقيقي بتاعه
    // مش من أي حقل جوه الـ payload اللي هو بعتها، فمفروض يترفض برضه.
    await assertFails(
      setDoc(doc(childDb, `families/${FAMILY_ID}/expenses/spoofed1`), {
        amount: 1, family_id: FAMILY_ID, role: "Parent",
      })
    );
  });

  /* ================================================================ */
  section("🔗 pendingLinkRequests — آلية الربط اليدوي (§8.3)");
  /* ================================================================ */

  await test("مستخدم جديد يقدر يسجّل طلب ربط لنفسه (uid == نفسه)", async () => {
    await assertSucceeds(
      setDoc(doc(unlinkedDb, "pendingLinkRequests/childUserNoLink"), {
        identifier: "+201234567890",
        identifierType: "phone",
        requestedAt: Date.now(),
      })
    );
  });

  await test("مستخدم ميقدرش يسجّل طلب ربط لمستخدم تاني (uid مختلف)", async () => {
    await assertFails(
      setDoc(doc(unlinkedDb, "pendingLinkRequests/someoneElseUid"), {
        identifier: "+201111111111",
        identifierType: "phone",
        requestedAt: Date.now(),
      })
    );
  });

  await test("الأب/الأم يقدر يقرا طلب ربط عشان يكمله (بحث/ربط)", async () => {
    await assertSucceeds(getDoc(doc(parentDb, "pendingLinkRequests/childUserNoLink")));
  });

  await test("ابن مربوط بالفعل (له دور Child) ميقدرش يقرا طلبات ربط غيره", async () => {
    await assertFails(getDoc(doc(childDb, "pendingLinkRequests/childUserNoLink")));
  });

  await testEnv.cleanup();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed (of ${passed + failed})`);
  console.log("=".repeat(60));

  if (failed > 0) {
    console.log("\nFAILED TESTS:");
    for (const f of failures) console.log(`  - ${f.name}: ${f.err.message}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Fatal error running security rules tests:", err);
  process.exitCode = 1;
});
