import { expect, test } from '@playwright/test';

test('le catalogue s’affiche et la recherche fonctionne', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/mange|prépare|goûter/);
  await expect(page.getByText(/^\d+ recettes$/)).toBeVisible();
  await page.getByRole('searchbox', { name: /Rechercher/ }).fill('creme brulee');
  await expect(page.getByRole('link', { name: 'Crème brûlée' })).toBeVisible();
});

test('on ouvre une recette, on la note et on ajuste les portions', async ({ page }, info) => {
  // Une recette différente par projet : recliquer la même étoile effacerait la note.
  const title = info.project.name === 'mobile' ? 'Croziflette' : 'Tartiflette';
  await page.goto(`/?q=${title.toLowerCase()}`);
  await page.getByRole('link', { name: title }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  // Recliquer la note actuelle l'efface : on part toujours de 3 puis on passe à 5 (rejouable).
  const five = page.getByRole('radio', { name: '5 étoiles' });
  const three = page.getByRole('radio', { name: '3 étoiles' });
  if ((await three.getAttribute('aria-checked')) !== 'true') {
    await three.click();
    await expect(three).toHaveAttribute('aria-checked', 'true');
  }
  await five.click();
  await expect(page.getByText('Noté 5/5')).toBeVisible();
  await expect(five).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: /Je l'ai fait/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Une personne de plus' }).click();
  await expect(page.getByText('5 pers.')).toBeVisible();
});

test('le frigo filtre les recettes', async ({ page }) => {
  await page.goto('/frigo');
  const input = page.getByRole('combobox', { name: 'Ingrédient à ajouter' });
  for (const name of ['lardons', 'pâte brisée', 'crème fraîche', 'œuf', 'lait']) {
    await input.fill(name);
    await input.press('Enter');
    await expect(page.getByText(`${name} ajouté au frigo`)).toBeVisible();
  }
  await page.getByRole('button', { name: /Voir ce que je peux cuisiner/ }).click();
  await expect(page.getByText(/faisables avec ton frigo/)).toBeVisible();
  await expect(page.getByText('✅ Tout est dans ton frigo').first()).toBeVisible();
});

test('le plat aléatoire propose une recette', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: /Surprends-moi/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: /Surprends-moi/ });
  await expect(dialog.getByRole('heading', { level: 3 })).toBeVisible();
  await dialog.getByRole('button', { name: /C'est parti/ }).click();
  await expect(page).toHaveURL(/\/recette\/\d+/);
});

test('la découverte de la semaine est proposée', async ({ page }) => {
  await page.goto('/decouverte');
  await expect(page.getByText(/Découverte de la semaine/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /ingrédients que tu ne cuisines jamais/ })).toBeVisible();
});
