export function normalizeRemark(value) {
  if (value == null || value === '') return { ok: true, remark: '' };
  if (typeof value !== 'string') return { ok: false, message: 'Remark must be text.' };
  if (value.length > 1000) return { ok: false, message: 'Remark cannot exceed 1000 characters.' };
  return { ok: true, remark: value };
}

export function remarkForMessage(remark) {
  if (typeof remark !== 'string' || !remark.trim()) return '';
  const max = 500;
  if (remark.length <= max) return `Remark: ${remark.replace(/\s+$/, '')}`;
  return `Remark: ${remark.slice(0, max).replace(/\s+$/, '')}...\nFull remark is available in the Trading Portal.`;
}
