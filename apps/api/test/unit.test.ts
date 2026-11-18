import { describe, expect, it } from 'vitest';
import { deriveDiets } from '../src/lib/diets';
import { guessAisle, isStaple, nameVariants } from '../src/lib/ingredients';
import { SEED_RECIPES, toCatalogRecipe } from '../src/seed/catalog';
import { mealToRecipe, parseMeasure, translateIngredient } from '../src/seed/mealdb';

describe('rayons et basiques', () => {
  it('classe les ingrédients courants', () => {
    expect(guessAisle('Courgette')).toBe('fruits-legumes');
    expect(guessAisle('blanc de poulet')).toBe('viandes-poissons');
    expect(guessAisle('crème fraîche')).toBe('cremerie');
    expect(guessAisle('lait de coco')).toBe('epicerie');
    expect(guessAisle('champignons de Paris')).toBe('fruits-legumes');
    expect(guessAisle('sauce poisson')).toBe('epices');
    expect(guessAisle('spaghetti')).toBe('feculents');
  });
  it('reconnaît les basiques', () => {
    expect(isStaple("Huile d'olive")).toBe(true);
    expect(isStaple('tomate')).toBe(false);
  });
  it('tolère le pluriel', () => {
    expect(nameVariants('oeufs')).toContain('oeuf');
    expect(nameVariants('poireaux')).toContain('poireau');
    expect(nameVariants('tomate')).toContain('tomates');
  });
});

describe('régimes déduits', () => {
  it('détecte végétarien, vegan, sans gluten, sans lactose', () => {
    expect(deriveDiets(['pois chiches', 'tahini', 'citron', "huile d'olive"])).toEqual([
      'vegetarien',
      'vegan',
      'sans-gluten',
      'sans-lactose',
    ]);
    expect(deriveDiets(['spaghetti', 'guanciale', 'pecorino'])).toEqual([]);
    expect(deriveDiets(['lait de coco', 'riz'])).toContain('vegan');
    expect(deriveDiets(['œuf', 'farine de sarrasin'])).toEqual(['vegetarien', 'sans-gluten', 'sans-lactose']);
  });
});

describe('seed', () => {
  it('contient plus de 150 recettes valides et uniques', () => {
    expect(SEED_RECIPES.length).toBeGreaterThan(150);
    const slugs = new Set<string>();
    for (const seed of SEED_RECIPES) {
      const r = toCatalogRecipe(seed);
      expect(r.ingredients.length, r.title).toBeGreaterThan(0);
      expect(r.steps.length, r.title).toBeGreaterThan(0);
      expect(
        r.ingredients.every((i) => i.name.length > 0),
        r.title,
      ).toBe(true);
      expect(slugs.has(r.slug), `doublon : ${r.slug}`).toBe(false);
      slugs.add(r.slug);
    }
  });
  it('couvre tous les moods et de nombreuses cuisines', () => {
    const moods = new Set(SEED_RECIPES.flatMap((r) => r.m));
    expect(moods.size).toBe(7);
    expect(new Set(SEED_RECIPES.map((r) => r.k)).size).toBeGreaterThan(20);
  });
});

describe('import TheMealDB', () => {
  it('lit les mesures anglaises', () => {
    expect(parseMeasure('2 tbs')).toMatchObject({ quantity: 2, unit: 'c. à s.' });
    expect(parseMeasure('200g')).toMatchObject({ quantity: 200, unit: 'g' });
    expect(parseMeasure('1/2 cup')).toMatchObject({ quantity: 120, unit: 'ml' });
    expect(parseMeasure('1 1/2 tsp')).toMatchObject({ quantity: 1.5, unit: 'c. à c.' });
    expect(parseMeasure('Pinch')).toMatchObject({ quantity: 1, unit: 'pincée' });
    expect(parseMeasure('to taste')).toMatchObject({ quantity: null, note: 'to taste' });
  });
  it('traduit les ingrédients connus', () => {
    expect(translateIngredient('Chicken Breasts')).toBe('blanc de poulet');
    expect(translateIngredient('Onions')).toBe('oignon');
    expect(translateIngredient('Zaatar mix')).toBe('zaatar mix');
  });
  it('convertit une recette', () => {
    const r = mealToRecipe({
      idMeal: '52772',
      strMeal: 'Teriyaki Chicken Casserole',
      strCategory: 'Chicken',
      strArea: 'Japanese',
      strInstructions: 'Preheat oven.\r\nMix the sauce.\r\nBake 30 minutes.',
      strMealThumb: 'https://www.themealdb.com/images/media/meals/x.jpg',
      strTags: 'Meat,Casserole',
      strIngredient1: 'soy sauce',
      strMeasure1: '3/4 cup',
      strIngredient2: 'Chicken Breasts',
      strMeasure2: '2',
      strIngredient3: '',
      strMeasure3: '',
    });
    expect(r).toMatchObject({ category: 'plat', cuisine: 'japonaise', lang: 'en', source: 'themealdb' });
    expect(r.steps).toHaveLength(3);
    expect(r.ingredients.map((i) => i.name)).toEqual(['sauce soja', 'blanc de poulet']);
    expect(r.moods).toContain('exotique');
  });
});
