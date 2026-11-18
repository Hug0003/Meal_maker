/** Normalise un nom d'ingrédient : minuscules, sans accents, espaces simplifiés. */
export function normalizeName(name: string): string {
  return name
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

/** Ajuste une quantité au nombre de portions demandé. */
export function scaleQuantity(quantity: number | null, from: number, to: number): number | null {
  if (quantity == null || !from) return quantity;
  return quantity * (to / from);
}

/** Affichage humain d'une quantité : 0.5 → ½, 1.3 → 1,3, 333 → 335. */
export function formatQuantity(q: number | null): string {
  if (q == null) return '';
  const whole = Math.floor(q);
  const frac = q - whole;
  if (whole < 10) {
    for (const [sym, val] of Object.entries(FRACTIONS)) {
      if (Math.abs(frac - val) < 0.02) return whole ? `${whole}${sym}` : sym;
    }
  }
  if (q >= 100) return String(Math.round(q / 5) * 5);
  if (q >= 10) return String(Math.round(q));
  return String(Math.round(q * 10) / 10).replace('.', ',');
}

/** Formate une durée en minutes : 90 → « 1 h 30 ». */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** Détecte les durées dans une étape (« 20 min », « 1 h 30 », « 2 heures ») pour proposer un minuteur. */
export function detectTimers(step: string): { label: string; seconds: number }[] {
  const out: { label: string; seconds: number }[] = [];
  const re =
    /(\d+(?:[.,]\d+)?)\s*(?:h|heures?)\b\s*(\d{1,2})?|(\d+)\s*(?:à\s*\d+\s*)?(min(?:utes?)?|secondes?)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(step))) {
    if (m[1]) {
      const hours = parseFloat(m[1].replace(',', '.'));
      const mins = m[2] ? parseInt(m[2], 10) : 0;
      out.push({ label: m[0].trim(), seconds: Math.round(hours * 3600 + mins * 60) });
    } else if (m[3]) {
      const n = parseInt(m[3], 10);
      const unit = m[4].toLowerCase();
      out.push({ label: m[0].trim(), seconds: unit.startsWith('min') ? n * 60 : n });
    }
  }
  return out.filter((t) => t.seconds > 0 && t.seconds <= 24 * 3600);
}

/** Semaine ISO au format 2026-W47. */
export function isoWeek(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Saison courante selon le mois (1-12). */
export function currentSeason(month = new Date().getMonth() + 1): 'printemps' | 'ete' | 'automne' | 'hiver' {
  if (month >= 3 && month <= 5) return 'printemps';
  if (month >= 6 && month <= 8) return 'ete';
  if (month >= 9 && month <= 11) return 'automne';
  return 'hiver';
}

/** Hash déterministe d'une chaîne (FNV-1a 32 bits). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const UNIT_ALIASES: Record<string, string> = {
  g: 'g',
  gr: 'g',
  kg: 'kg',
  ml: 'ml',
  cl: 'cl',
  dl: 'dl',
  l: 'l',
  cas: 'c. à s.',
  cs: 'c. à s.',
  cac: 'c. à c.',
  cc: 'c. à c.',
  pincee: 'pincée',
  pincée: 'pincée',
  gousse: 'gousse',
  gousses: 'gousse',
  tranche: 'tranche',
  tranches: 'tranche',
  boite: 'boîte',
  boîte: 'boîte',
  botte: 'botte',
  sachet: 'sachet',
  sachets: 'sachet',
  brin: 'brin',
  brins: 'brin',
  feuille: 'feuille',
  feuilles: 'feuille',
  verre: 'verre',
  bol: 'bol',
  poignee: 'poignée',
  poignée: 'poignée',
  pot: 'pot',
  filet: 'filet',
  morceau: 'morceau',
  branche: 'branche',
  branches: 'branche',
  tasse: 'tasse',
  rouleau: 'rouleau',
  pave: 'pavé',
  pavé: 'pavé',
  cube: 'cube',
  zeste: 'zeste',
  boule: 'boule',
  boules: 'boule',
};

export interface ParsedIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
  note: string | null;
  optional: boolean;
}

/**
 * Lit une ligne d'ingrédient compacte : « 200 g|lardons|fumés », « 2|oignon », « |sel », « ?|persil » (optionnel).
 */
export function parseIngredientLine(line: string): ParsedIngredient {
  const [rawQty = '', rawName = '', rawNote = ''] = line.split('|');
  let qtyPart = rawQty.trim();
  let optional = false;
  if (qtyPart.startsWith('?')) {
    optional = true;
    qtyPart = qtyPart.slice(1).trim();
  }
  let quantity: number | null = null;
  let unit: string | null = null;
  if (qtyPart) {
    const m = qtyPart.match(/^(\d+(?:[.,]\d+)?|[½¼¾⅓⅔])(?:\s*(.+))?$/);
    if (m) {
      quantity = FRACTIONS[m[1]] ?? parseFloat(m[1].replace(',', '.'));
      if (m[2]) {
        const u = m[2].trim().toLowerCase();
        unit = UNIT_ALIASES[u] ?? m[2].trim();
      }
    } else {
      unit = qtyPart;
    }
  }
  return { quantity, unit, name: rawName.trim(), note: rawNote.trim() || null, optional };
}

/** Additionne des quantités d'un même ingrédient quand les unités sont compatibles. */
export function mergeQuantities(parts: { quantity: number | null; unit: string | null }[]): string {
  const toBase: Record<string, [string, number]> = {
    kg: ['g', 1000],
    g: ['g', 1],
    l: ['ml', 1000],
    dl: ['ml', 100],
    cl: ['ml', 10],
    ml: ['ml', 1],
  };
  const sums = new Map<string, number>();
  for (const p of parts) {
    if (p.quantity == null) continue;
    const [unit, factor] = p.unit && toBase[p.unit] ? toBase[p.unit] : [p.unit ?? '', 1];
    sums.set(unit, (sums.get(unit) ?? 0) + p.quantity * factor);
  }
  const out: string[] = [];
  for (const [unit, total] of sums) {
    if (unit === 'g' && total >= 1000) out.push(`${formatQuantity(total / 1000)} kg`);
    else if (unit === 'ml' && total >= 1000) out.push(`${formatQuantity(total / 1000)} l`);
    else out.push(`${formatQuantity(total)}${unit ? ' ' + unit : ''}`);
  }
  return out.join(' + ');
}
