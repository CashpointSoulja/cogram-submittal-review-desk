// Reviewer workflow: every flag needs a confirm or override before a decision is allowed.
export const STATUSES = [
  { id: 'incoming', label: 'Incoming' },
  { id: 'in-review', label: 'In Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'revise-resubmit', label: 'Revise & Resubmit' },
];
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));
export const DECISIONS = ['approved', 'rejected', 'revise-resubmit'];
export const MIN_RATIONALE = 15;

export function resolveFlag(resolutions, flag, action, note = '', at = new Date().toISOString()) {
  if (!['confirm', 'override'].includes(action)) throw new Error(`Unknown action ${action}`);
  const trimmed = note.trim();
  if (action === 'override' && !trimmed) throw new Error('An override needs a note explaining why the flag is wrong.');
  if (flag.severity === 'review' && !trimmed) throw new Error('Judgment items need a note either way.');
  return { ...resolutions, [flag.key]: { action, note: trimmed, at } };
}

export function clearResolution(resolutions, key) {
  const next = { ...resolutions };
  delete next[key];
  return next;
}

export function unresolved(flags, resolutions) {
  return flags.filter((f) => !resolutions[f.key]);
}

export function standing(flags, resolutions) {
  return flags.filter((f) => resolutions[f.key]?.action === 'confirm');
}

export function decisionBlockers(flags, resolutions, decision, rationale = '') {
  const reasons = [];
  if (!DECISIONS.includes(decision)) reasons.push('Choose approve, reject or revise & resubmit.');
  const open = unresolved(flags, resolutions);
  if (open.length) reasons.push(`${open.length} flag${open.length > 1 ? 's' : ''} still need${open.length > 1 ? '' : 's'} a confirm or override.`);
  if (decision === 'approved') {
    const bad = standing(flags, resolutions).filter((f) => f.severity !== 'minor');
    if (bad.length) reasons.push(`Cannot approve with ${bad.length} confirmed issue${bad.length > 1 ? 's' : ''} standing.`);
  }
  if (rationale.trim().length < MIN_RATIONALE) reasons.push(`Write a rationale (at least ${MIN_RATIONALE} characters).`);
  return reasons;
}

export function applyDecision(submittal, flags, resolutions, decision, rationale, reviewer, at = new Date().toISOString()) {
  const reasons = decisionBlockers(flags, resolutions, decision, rationale);
  if (reasons.length) throw new Error(reasons.join(' '));
  return {
    ...submittal,
    status: decision,
    review: { decision, rationale: rationale.trim(), reviewer, decidedAt: at, resolutions },
  };
}

export function startReview(submittal) {
  return submittal.status === 'incoming' ? { ...submittal, status: 'in-review' } : submittal;
}
