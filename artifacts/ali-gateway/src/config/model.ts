/**
 * Feature flag — controls which UI model is rendered at /dashboard.
 *
 *   "model_1"  →  original classic interface (quiz / knowledge / sections grid)
 *   "model_2"  →  royal green + gold glassmorphism multi-tab interface (new)
 *
 * Change this single value to switch instantly. No data or API logic is touched.
 */
export const CURRENT_MODEL: "model_1" | "model_2" = "model_2";
