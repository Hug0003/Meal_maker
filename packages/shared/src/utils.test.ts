import { describe, expect, it } from 'vitest';
import {
  detectTimers,
  formatDuration,
  formatQuantity,
  isoWeek,
  mergeQuantities,
  normalizeName,
  parseIngredientLine,
  scaleQuantity,
} from './utils';

describe('parseIngredientLine', () => {
  it('lit quantité, unité, nom et note', () => {
    expect(parseIngredientLine('200 g|lardons|fumés')).toEqual({
      quantity: 200,
      unit: 'g',
      name: 'lardons',
      note: 'fumés',
      optional: false,
    });
  });
  it('gère les quantités sans unité, les fractions et les optionnels', () => {
    expect(parseIngredientLine('2|oignon').quantity).toBe(2);
    expect(parseIngredientLine('½ cas|sucre')).toMatchObject({ quantity: 0.5, unit: 'c. à s.' });
    expect(parseIngredientLine('?|persil')).toMatchObject({ quantity: null, optional: true, name: 'persil' });
  });
});

describe('quantités', () => {
  it('ajuste aux portions', () => expect(scaleQuantity(200, 4, 6)).toBe(300));
  it('formate joliment', () => {
    expect(formatQuantity(0.5)).toBe('½');
    expect(formatQuantity(1.25)).toBe('1¼');
    expect(formatQuantity(333)).toBe('335');
    expect(formatQuantity(1.33333)).toBe('1⅓');
    expect(formatQuantity(2.4)).toBe('2,4');
  });
  it('fusionne les unités compatibles', () => {
    expect(
      mergeQuantities([
        { quantity: 800, unit: 'g' },
        { quantity: 0.4, unit: 'kg' },
      ]),
    ).toBe('1,2 kg');
    expect(
      mergeQuantities([
        { quantity: 2, unit: null },
        { quantity: 1, unit: null },
      ]),
    ).toBe('3');
  });
});

describe('divers', () => {
  it('normalise les noms', () => {
    expect(normalizeName('  Crème   Brûlée ')).toBe('creme brulee');
    expect(normalizeName('Œufs')).toBe('oeufs');
  });
  it('formate les durées', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(90)).toBe('1 h 30');
  });
  it('détecte les minuteurs', () => {
    expect(detectTimers('Laisser mijoter 20 min puis cuire 1 h 30.').map((t) => t.seconds)).toEqual([
      1200, 5400,
    ]);
    expect(detectTimers('Cuire 10 à 12 minutes.').map((t) => t.seconds)).toEqual([600]);
  });
  it('calcule la semaine ISO', () => {
    expect(isoWeek(new Date(2026, 10, 18))).toBe('2026-W47');
    expect(isoWeek(new Date(2027, 0, 1))).toBe('2026-W53');
  });
});
