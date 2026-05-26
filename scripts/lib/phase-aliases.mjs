// phase-aliases.mjs — Canonical phase name normalization
//
// 写入端只允许 canonical；读取端透过 normalizePhase() 兼容 legacy alias。
// 不做一次性全仓替换，避免引入新 drift。

export const PHASE_ALIASES = {
  // legacy → canonical
  'phase_d': 'phase_d_1',      // 旧任务 enter_phase 用 phase_d
  'phase-d': 'phase_d_1',      // kebab-case 容错
};

/**
 * Normalize a phase name to canonical form.
 * @param {string} value — raw phase name from events/task.yaml/human input
 * @returns {string} — canonical phase name
 */
export function normalizePhase(value) {
  if (!value || typeof value !== 'string') return value;
  const canonical = PHASE_ALIASES[value.toLowerCase()];
  return canonical || value;
}

/**
 * Check if a phase name is canonical (not an alias).
 * @param {string} value
 * @returns {boolean}
 */
export function isCanonicalPhase(value) {
  if (!value || typeof value !== 'string') return false;
  return !PHASE_ALIASES[value.toLowerCase()];
}

/**
 * Get the canonical successor phase.
 * @param {string} phase — canonical phase name
 * @returns {string|null}
 */
export function nextPhase(phase) {
  const ORDER = ['phase_a', 'phase_b', 'phase_c', 'phase_d_1', 'phase_d_2', 'phase_d_3', 'phase_f'];
  const idx = ORDER.indexOf(phase);
  return idx >= 0 && idx < ORDER.length - 1 ? ORDER[idx + 1] : null;
}
