const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLASH_OR_DASH_RE = /^(\d{2})[/-](\d{2})[/-](\d{4})$/;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function parseDateValue(value?: string | null): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (DATE_ONLY_RE.test(text)) {
    const date = new Date(`${text}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const slashOrDash = text.match(SLASH_OR_DASH_RE);
  if (slashOrDash) {
    const [, day, month, year] = slashOrDash;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateForInput(value?: string | null): string {
  const date = parseDateValue(value);
  if (!date) return '';
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join('-');
}

export function formatDateForDisplay(value?: string | null): string {
  const date = parseDateValue(value);
  if (!date) return '—';
  return [
    pad(date.getUTCDate()),
    pad(date.getUTCMonth() + 1),
    date.getUTCFullYear(),
  ].join('-');
}

export function formatDateForApi(value?: string | null): string {
  return formatDateForInput(value);
}
