export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

export function playerImageUrl(name: string, url?: string): string {
  if (url && url.length > 0) return url;
  const letter = (name || '?').charAt(0).toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#334155" rx="999"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="18" font-weight="bold" font-family="sans-serif">${letter}</text></svg>`
  )}`;
}

export function teamLogoUrl(name: string, url?: string): string {
  if (url && url.length > 0) return url;
  const letter = (name || '?').charAt(0).toUpperCase();
  const initials = (name || '?').split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#1e293b" rx="12"/><text x="24" y="30" text-anchor="middle" fill="white" font-size="20" font-weight="bold" font-family="sans-serif">${initials || letter}</text></svg>`
  )}`;
}

// Rachão interno (ex.: "JOGO ENTRE NOS") — não conta para estatísticas
export function isIntraSquadMatch(m: { homeTeam?: string; awayTeam?: string }): boolean {
  const h = (m.homeTeam || '').toLowerCase();
  const a = (m.awayTeam || '').toLowerCase();
  return h.includes('jogo entre nos') || a.includes('jogo entre nos');
}

const MONTHS_SHORT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

export function parseMatchDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // DD/MM/AAAA
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/').map(Number);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m - 1, d);
    return null;
  }
  // DD MMM
  const parts = dateStr.split(' ');
  if (parts.length >= 2) {
    const day = parseInt(parts[0]);
    const monthIdx = MONTHS_SHORT.indexOf(parts[1].toUpperCase());
    if (!isNaN(day) && monthIdx >= 0) {
      const year = new Date().getFullYear();
      return new Date(year, monthIdx, day);
    }
  }
  return null;
}

export function normalizeMatchDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  if (dateStr.includes('/')) return dateStr; // já está no formato DD/MM/AAAA
  const d = parseMatchDate(dateStr);
  if (!d) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export async function hashPin(pin: string): Promise<string> {  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
