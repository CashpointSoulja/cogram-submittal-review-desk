// Modelled metrics. Minute estimates are stated assumptions, not measurements.
import { addDays } from './dates.js';

export const TIME_MODEL = {
  manualBase: 20, manualPerClause: 8, manualPerDocument: 3, manualQuantities: 15,
  assistedBase: 8, assistedPerFlag: 4, assistedPerJudgment: 6,
};

export function reviewMinutes(s, result, m = TIME_MODEL) {
  const docsCount = (s.attachments || []).length + (s.certificates || []).length;
  const manual = m.manualBase + m.manualPerClause * (s.clauses || []).length + m.manualPerDocument * docsCount + (s.quantities ? m.manualQuantities : 0);
  const judgments = result.flags.filter((f) => f.severity === 'review').length;
  const assisted = m.assistedBase + m.assistedPerFlag * (result.flags.length - judgments) + m.assistedPerJudgment * judgments;
  return { manual, assisted: Math.min(assisted, manual), saved: Math.max(0, manual - assisted) };
}

export function timeSaved(list, triaged, m = TIME_MODEL) {
  const rows = list.map((s) => ({ id: s.id, ...reviewMinutes(s, triaged[s.id], m) }));
  const total = rows.reduce((t, r) => ({ manual: t.manual + r.manual, assisted: t.assisted + r.assisted, saved: t.saved + r.saved }), { manual: 0, assisted: 0, saved: 0 });
  return { rows, ...total, n: rows.length, perSubmittal: rows.length ? total.saved / rows.length : 0 };
}

export function decidedOn(s) {
  return s.review?.decidedAt ? s.review.decidedAt.slice(0, 10) : null;
}

export function burndown(list, from, to, stepDays = 7) {
  const points = [];
  for (let d = from; d <= to; d = addDays(d, stepDays)) {
    const open = list.filter((s) => s.submittedOn <= d && (!decidedOn(s) || decidedOn(s) > d)).length;
    const received = list.filter((s) => s.submittedOn <= d).length;
    points.push({ date: d, open, received, closed: received - open });
  }
  return points;
}

export function firstPass(list) {
  const packages = {};
  for (const s of list) (packages[s.package] ||= []).push(s);
  const firsts = Object.values(packages).map((subs) => subs.slice().sort((a, b) => (a.submittedOn < b.submittedOn ? -1 : 1))[0])
    .filter((s) => !s.priorRevisions?.length);
  const decided = firsts.filter((s) => ['approved', 'rejected', 'revise-resubmit'].includes(s.status));
  const accepted = decided.filter((s) => s.status === 'approved');
  return { decided: decided.length, accepted: accepted.length, rate: decided.length ? accepted.length / decided.length : null, ids: decided.map((s) => s.id) };
}

export function readyForReview(list, triaged) {
  const open = list.filter((s) => ['incoming', 'in-review'].includes(s.status));
  const clean = open.filter((s) => triaged[s.id].counts.blocker + triaged[s.id].counts.major === 0);
  return { open: open.length, clean: clean.length };
}
