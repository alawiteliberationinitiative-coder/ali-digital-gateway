/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          ALI DIGITAL GATEWAY — مفتاح النموذج النشط                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  غيّر DEFAULT_MODEL لتحديد النموذج الافتراضي عند النشر للإنتاج.          ║
 * ║  في بيئة التطوير (Replit) يمكن التبديل من الزر العائم الذهبي.            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 *   "MODEL_1"  →  الواجهة الكلاسيكية  (اختبارات / معرفة / شبكة أقسام)
 *   "MODEL_2"  →  الواجهة الزجاجية الملكية  (أخضر ملكي + ذهبي، تبويبات)
 */

export type ActiveModel = "MODEL_1" | "MODEL_2";

/** النموذج الافتراضي المُستخدم في الإنتاج وكقيمة احتياطية */
export const DEFAULT_MODEL: ActiveModel = "MODEL_2";

/** مفتاح حفظ الاختيار في المتصفح (يُستخدم في التطوير فقط) */
export const DEV_STORAGE_KEY = "ali_active_model";

/**
 * يقرأ النموذج النشط:
 * - في الإنتاج: يعيد DEFAULT_MODEL دائماً (localStorage لا يُستخدم)
 * - في التطوير: يتحقق من localStorage أولاً، ثم يرجع إلى DEFAULT_MODEL
 */
function resolveActiveModel(): ActiveModel {
  if (import.meta.env.DEV) {
    const stored = localStorage.getItem(DEV_STORAGE_KEY);
    if (stored === "MODEL_1" || stored === "MODEL_2") return stored;
  }
  return DEFAULT_MODEL;
}

export const ACTIVE_MODEL: ActiveModel = resolveActiveModel();
