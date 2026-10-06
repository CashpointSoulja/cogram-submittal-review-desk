// Append-only audit trail with CSV and JSON export.
export const AUDIT_COLUMNS = ['at', 'actor', 'event', 'submittal', 'ref', 'severity', 'detail'];

export function auditEvent(at, actor, event, submittal, ref = '', severity = '', detail = '') {
  return { at, actor, event, submittal, ref, severity, detail };
}

export function triageEvents(s, result, at) {
  const events = [auditEvent(at, 'Triage rules v1.0', 'triage.run', s.id, s.revision, '', `${result.checksRun} checks run; ${result.flags.length} flagged; auto-approved: no`)];
  result.passes.forEach((p) => events.push(auditEvent(at, 'Triage rules v1.0', 'check.pass', s.id, `${p.code} ${p.key.split(':')[1]}`, 'pass', p.title)));
  result.flags.forEach((f) => events.push(auditEvent(at, 'Triage rules v1.0', 'check.flag', s.id, `${f.code} ${f.key.split(':')[1]}`, f.severity, f.title)));
  return events;
}

export function resolutionEvent(s, flag, res, reviewer) {
  return auditEvent(res.at, reviewer, `flag.${res.action}`, s.id, `${flag.code} ${flag.key.split(':')[1]}`, flag.severity, res.note || flag.title);
}

export function decisionEvent(s, review) {
  return auditEvent(review.decidedAt, review.reviewer, 'decision', s.id, review.decision, '', review.rationale);
}

export function csvCell(v) {
  const str = v == null ? '' : String(v);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCSV(events) {
  const rows = [AUDIT_COLUMNS.join(',')];
  for (const e of events) rows.push(AUDIT_COLUMNS.map((c) => csvCell(e[c])).join(','));
  return rows.join('\r\n') + '\r\n';
}

export function toJSON(events, meta = {}) {
  return JSON.stringify({ ...meta, columns: AUDIT_COLUMNS, count: events.length, events }, null, 2);
}

export function sortEvents(events) {
  return events.slice().sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}
