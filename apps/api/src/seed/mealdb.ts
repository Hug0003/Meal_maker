import type { CategoryId, MoodId, ParsedIngredient } from '@meal/shared';
import { normalizeName } from '@meal/shared';
import { invalidate } from '../lib/cache';
import { prisma } from '../lib/db';
import { deriveDiets } from '../lib/diets';
import { slugify } from '../lib/recipes';
import { upsertCatalogRecipe, type CatalogRecipe } from './upsert';

/**
 * Import de TheMealDB (https://www.themealdb.com, clé publique de test « 1 »).
 * Les titres et les étapes restent en anglais (marqués lang = en) ; les ingrédients sont traduits
 * quand ils sont connus, pour que le frigo et la liste de courses fonctionnent avec tout le catalogue.
 */
const API = 'https://www.themealdb.com/api/json/v1/1';

interface Meal {
  idMeal: string;
  strMeal: string;
  strCategory: string | null;
  strArea: string | null;
  strInstructions: string | null;
  strMealThumb: string | null;
  strTags: string | null;
  [key: string]: string | null;
}

const AREAS: Record<string, string> = {
  American: 'américaine',
  British: 'britannique',
  Canadian: 'canadienne',
  Chinese: 'chinoise',
  Croatian: 'croate',
  Dutch: 'néerlandaise',
  Egyptian: 'égyptienne',
  Filipino: 'philippine',
  French: 'française',
  Greek: 'grecque',
  Indian: 'indienne',
  Irish: 'irlandaise',
  Italian: 'italienne',
  Jamaican: 'jamaïcaine',
  Japanese: 'japonaise',
  Kenyan: 'kényane',
  Malaysian: 'malaisienne',
  Mexican: 'mexicaine',
  Moroccan: 'marocaine',
  Polish: 'polonaise',
  Portuguese: 'portugaise',
  Russian: 'russe',
  Spanish: 'espagnole',
  Thai: 'thaïlandaise',
  Tunisian: 'tunisienne',
  Turkish: 'turque',
  Ukrainian: 'ukrainienne',
  Vietnamese: 'vietnamienne',
  Norwegian: 'norvégienne',
  Saudi: 'saoudienne',
  Syrian: 'syrienne',
  Algerian: 'algérienne',
  Argentinian: 'argentine',
  Australian: 'australienne',
  Venezulan: 'vénézuélienne',
  Slovakian: 'slovaque',
  Uruguayan: 'uruguayenne',
};
const EUROPEAN = new Set([
  'française',
  'britannique',
  'irlandaise',
  'italienne',
  'espagnole',
  'néerlandaise',
  'polonaise',
  'croate',
  'portugaise',
  'grecque',
  'norvégienne',
  'slovaque',
  'américaine',
  'canadienne',
  'australienne',
]);

const CATEGORY: Record<string, { c: CategoryId; e: string }> = {
  Beef: { c: 'plat', e: '🥩' },
  Chicken: { c: 'plat', e: '🍗' },
  Dessert: { c: 'dessert', e: '🍰' },
  Lamb: { c: 'plat', e: '🐑' },
  Miscellaneous: { c: 'plat', e: '🍽️' },
  Pasta: { c: 'plat', e: '🍝' },
  Pork: { c: 'plat', e: '🐖' },
  Seafood: { c: 'plat', e: '🦐' },
  Side: { c: 'accompagnement', e: '🥔' },
  Starter: { c: 'entree', e: '🥗' },
  Vegan: { c: 'plat', e: '🌱' },
  Vegetarian: { c: 'plat', e: '🥕' },
  Breakfast: { c: 'petit-dej', e: '🍳' },
  Goat: { c: 'plat', e: '🐐' },
};
const COLORS = ['tomato', 'mango', 'mint', 'berry', 'sky', 'grape', 'peach', 'lime'];

/** Traductions anglais → français des ingrédients les plus courants de TheMealDB. */
const EN_FR: Record<string, string> = {
  'all spice': 'quatre-épices',
  allspice: 'quatre-épices',
  almonds: 'amande',
  'almond milk': "lait d'amande",
  anchovy: 'anchois',
  'anchovy fillet': 'anchois',
  apple: 'pomme',
  apples: 'pomme',
  apricot: 'abricot',
  asparagus: 'asperges vertes',
  aubergine: 'aubergine',
  avocado: 'avocat',
  bacon: 'bacon',
  'baking powder': 'levure chimique',
  'baking soda': 'bicarbonate',
  'bicarbonate of soda': 'bicarbonate',
  banana: 'banane',
  bananas: 'banane',
  basil: 'basilic',
  'basil leaves': 'basilic',
  'basmati rice': 'riz basmati',
  'bay leaf': 'laurier',
  'bay leaves': 'laurier',
  beef: 'bœuf',
  'beef brisket': 'poitrine de bœuf',
  'beef fillet': 'filet de bœuf',
  'beef stock': 'bouillon de bœuf',
  'beef stock concentrate': 'bouillon de bœuf',
  'minced beef': 'bœuf haché',
  'black pepper': 'poivre',
  'black beans': 'haricots noirs',
  'black olives': 'olives noires',
  blackberries: 'mûre',
  blueberries: 'myrtille',
  bread: 'pain',
  breadcrumbs: 'chapelure',
  broccoli: 'brocoli',
  'brown sugar': 'cassonade',
  'dark brown sugar': 'cassonade',
  'light brown soft sugar': 'cassonade',
  'dark brown soft sugar': 'cassonade',
  butter: 'beurre',
  'unsalted butter': 'beurre',
  'salted butter': 'beurre',
  buttermilk: 'babeurre',
  cabbage: 'chou blanc',
  'caster sugar': 'sucre',
  'granulated sugar': 'sucre',
  sugar: 'sucre',
  'icing sugar': 'sucre glace',
  cardamom: 'cardamome',
  carrot: 'carotte',
  carrots: 'carotte',
  cauliflower: 'chou-fleur',
  'cayenne pepper': 'piment de Cayenne',
  celery: 'céleri',
  cheddar: 'cheddar',
  'cheddar cheese': 'cheddar',
  cheese: 'fromage',
  cherry: 'cerise',
  'cherry tomatoes': 'tomate cerise',
  chicken: 'poulet',
  'chicken breast': 'blanc de poulet',
  'chicken breasts': 'blanc de poulet',
  'chicken thighs': 'haut de cuisse de poulet',
  'chicken legs': 'cuisse de poulet',
  'chicken stock': 'bouillon de volaille',
  'chicken stock cube': 'bouillon de volaille',
  chickpeas: 'pois chiches',
  'chili powder': 'piment en poudre',
  'chilli powder': 'piment en poudre',
  chilli: 'piment',
  'red chilli': 'piment',
  'green chilli': 'piment vert',
  'chilli flakes': 'piment en flocons',
  chives: 'ciboulette',
  chorizo: 'chorizo',
  cinnamon: 'cannelle',
  'cinnamon stick': 'cannelle',
  'ground cinnamon': 'cannelle',
  clams: 'palourde',
  cloves: 'clou de girofle',
  cocoa: 'cacao',
  'cocoa powder': 'cacao',
  'coconut milk': 'lait de coco',
  'coconut cream': 'crème de coco',
  cod: 'cabillaud',
  coriander: 'coriandre',
  'coriander leaves': 'coriandre',
  'ground coriander': 'coriandre en poudre',
  'coriander seeds': 'graines de coriandre',
  corn: 'maïs',
  sweetcorn: 'maïs',
  cornflour: 'fécule de maïs',
  cornstarch: 'fécule de maïs',
  courgettes: 'courgette',
  zucchini: 'courgette',
  cream: 'crème liquide',
  'double cream': 'crème liquide',
  'heavy cream': 'crème liquide',
  'single cream': 'crème liquide',
  'sour cream': 'crème aigre',
  'creme fraiche': 'crème fraîche',
  'cream cheese': 'fromage frais',
  cucumber: 'concombre',
  cumin: 'cumin',
  'ground cumin': 'cumin',
  'cumin seeds': 'cumin',
  curry: 'curry',
  'curry powder': 'curry',
  'dark chocolate': 'chocolat noir',
  'milk chocolate': 'chocolat au lait',
  'chocolate chips': 'pépites de chocolat',
  dill: 'aneth',
  egg: 'œuf',
  eggs: 'œuf',
  'egg yolks': "jaune d'œuf",
  'egg yolk': "jaune d'œuf",
  'egg white': "blanc d'œuf",
  'egg whites': "blanc d'œuf",
  eggplant: 'aubergine',
  fennel: 'fenouil',
  'fennel seeds': 'graines de fenouil',
  feta: 'feta',
  'fish sauce': 'sauce poisson',
  flour: 'farine',
  'plain flour': 'farine',
  'self-raising flour': 'farine',
  'all purpose flour': 'farine',
  'strong white bread flour': 'farine',
  'garam masala': 'garam masala',
  garlic: 'ail',
  'garlic clove': 'ail',
  'garlic powder': 'ail en poudre',
  ginger: 'gingembre',
  'ground ginger': 'gingembre en poudre',
  'ginger paste': 'gingembre',
  gruyère: 'gruyère',
  gruyere: 'gruyère',
  ham: 'jambon',
  honey: 'miel',
  'kidney beans': 'haricots rouges',
  lamb: 'agneau',
  'lamb mince': 'agneau haché',
  'minced lamb': 'agneau haché',
  'lamb shoulder': "épaule d'agneau",
  leek: 'poireau',
  leeks: 'poireau',
  lemon: 'citron',
  'lemon juice': 'citron',
  'lemon zest': 'citron',
  lemons: 'citron',
  lentils: 'lentilles',
  'red lentils': 'lentilles corail',
  lettuce: 'salade',
  lime: 'citron vert',
  'lime juice': 'citron vert',
  mango: 'mangue',
  'maple syrup': "sirop d'érable",
  mayonnaise: 'mayonnaise',
  milk: 'lait',
  mint: 'menthe',
  mozzarella: 'mozzarella',
  'mozzarella balls': 'mozzarella',
  mushrooms: 'champignons',
  mushroom: 'champignons',
  mussels: 'moule',
  mustard: 'moutarde',
  'dijon mustard': 'moutarde',
  'english mustard': 'moutarde',
  'mustard seeds': 'graines de moutarde',
  nutmeg: 'muscade',
  'olive oil': "huile d'olive",
  'extra virgin olive oil': "huile d'olive",
  oil: 'huile',
  'vegetable oil': 'huile neutre',
  'sunflower oil': 'huile de tournesol',
  'sesame seed oil': 'huile de sésame',
  'sesame oil': 'huile de sésame',
  olives: 'olives',
  onion: 'oignon',
  onions: 'oignon',
  'red onion': 'oignon rouge',
  'red onions': 'oignon rouge',
  'spring onions': 'oignon nouveau',
  'spring onion': 'oignon nouveau',
  'green onion': 'oignon nouveau',
  shallots: 'échalote',
  shallot: 'échalote',
  orange: 'orange',
  oregano: 'origan',
  paprika: 'paprika',
  'smoked paprika': 'paprika fumé',
  parmesan: 'parmesan',
  'parmesan cheese': 'parmesan',
  parsley: 'persil',
  'flat leaf parsley': 'persil plat',
  pasta: 'pâtes',
  spaghetti: 'spaghetti',
  penne: 'penne',
  'penne rigate': 'penne',
  linguine: 'linguine',
  lasagne: 'lasagne',
  'lasagne sheets': 'lasagne',
  tagliatelle: 'tagliatelle',
  peanuts: 'cacahuète',
  'peanut butter': 'beurre de cacahuète',
  pear: 'poire',
  peas: 'petits pois',
  pecan: 'noix de pécan',
  'pecan nuts': 'noix de pécan',
  pepper: 'poivre',
  'red pepper': 'poivron rouge',
  'green pepper': 'poivron vert',
  'yellow pepper': 'poivron jaune',
  'pine nuts': 'pignons de pin',
  pineapple: 'ananas',
  pork: 'porc',
  'pork chops': 'côte de porc',
  'pork shoulder': 'épaule de porc',
  potatoes: 'pomme de terre',
  potato: 'pomme de terre',
  'floury potatoes': 'pomme de terre',
  'new potatoes': 'pomme de terre',
  prawns: 'crevette',
  'king prawns': 'crevette',
  raisins: 'raisins secs',
  raspberries: 'framboise',
  rice: 'riz',
  'long grain rice': 'riz',
  'arborio risotto rice': 'riz arborio',
  'jasmine rice': 'riz jasmin',
  'rice vinegar': 'vinaigre de riz',
  ricotta: 'ricotta',
  rosemary: 'romarin',
  saffron: 'safran',
  sage: 'sauge',
  salmon: 'saumon',
  'smoked salmon': 'saumon fumé',
  salt: 'sel',
  'sea salt': 'fleur de sel',
  sausages: 'saucisse',
  'sesame seeds': 'graines de sésame',
  'soy sauce': 'sauce soja',
  'dark soy sauce': 'sauce soja',
  'soya sauce': 'sauce soja',
  spinach: 'épinards frais',
  'star anise': 'badiane',
  'stir-fry vegetables': 'légumes pour wok',
  strawberries: 'fraise',
  'sun-dried tomatoes': 'tomates séchées',
  'sweet potatoes': 'patate douce',
  'sweet potato': 'patate douce',
  thyme: 'thym',
  tofu: 'tofu ferme',
  tomato: 'tomate',
  tomatoes: 'tomate',
  'chopped tomatoes': 'tomates concassées',
  'canned tomatoes': 'tomates concassées',
  'plum tomatoes': 'tomate',
  'tomato puree': 'concentré de tomate',
  'tomato paste': 'concentré de tomate',
  'tomato ketchup': 'ketchup',
  ketchup: 'ketchup',
  tuna: 'thon',
  turmeric: 'curcuma',
  'turmeric powder': 'curcuma',
  vanilla: 'vanille',
  'vanilla extract': 'extrait de vanille',
  'vegetable stock': 'bouillon de légumes',
  'vegetable stock cube': 'bouillon de légumes',
  vinegar: 'vinaigre',
  'white wine vinegar': 'vinaigre de vin blanc',
  'red wine vinegar': 'vinaigre de vin rouge',
  'balsamic vinegar': 'vinaigre balsamique',
  'cider vinegar': 'vinaigre de cidre',
  walnuts: 'noix',
  water: 'eau',
  'white wine': 'vin blanc',
  'red wine': 'vin rouge',
  'worcestershire sauce': 'sauce worcestershire',
  yogurt: 'yaourt nature',
  'greek yogurt': 'yaourt grec',
  'natural yogurt': 'yaourt nature',
  yeast: 'levure de boulanger',
  'egg noodles': 'nouilles aux œufs',
  'rice noodles': 'nouilles de riz',
  noodles: 'nouilles',
  'oyster sauce': 'sauce huître',
  'hoisin sauce': 'sauce hoisin',
  'sweet chilli sauce': 'sauce chili douce',
  'tabasco sauce': 'tabasco',
  coconut: 'noix de coco',
  'desiccated coconut': 'noix de coco râpée',
  pumpkin: 'potiron',
  squash: 'courge',
  'butternut squash': 'courge butternut',
  beetroot: 'betterave',
  turnips: 'navet',
  parsnip: 'panais',
  parsnips: 'panais',
  kale: 'kale',
  cranberries: 'cranberries séchées',
  dates: 'datte',
  figs: 'figue',
  gelatine: 'gélatine',
  duck: 'canard',
  'duck legs': 'cuisse de canard',
  turkey: 'dinde',
  veal: 'veau',
  'goat meat': 'chèvre (viande)',
  haddock: 'haddock',
  'white fish': 'poisson blanc',
  'white fish fillets': 'poisson blanc',
  mackerel: 'maquereau',
  sardines: 'sardine',
  squid: 'calamar',
  scallops: 'noix de Saint-Jacques',
  crab: 'crabe',
  lobster: 'homard',
  oats: "flocons d'avoine",
  'rolled oats': "flocons d'avoine",
  couscous: 'semoule',
  'bulgur wheat': 'boulgour',
  quinoa: 'quinoa',
  polenta: 'polenta',
  tortillas: 'tortilla de blé',
  'flour tortilla': 'tortilla de blé',
  'pita bread': 'pain pita',
  'naan bread': 'naan',
  'puff pastry': 'pâte feuilletée',
  'shortcrust pastry': 'pâte brisée',
  'filo pastry': 'pâte filo',
  'condensed milk': 'lait concentré',
  mascarpone: 'mascarpone',
  'goats cheese': 'fromage de chèvre',
  'blue cheese': 'fromage bleu',
  'stilton cheese': 'stilton',
  brie: 'brie',
  halloumi: 'halloumi',
  paneer: 'paneer',
  ghee: 'ghee',
  lard: 'saindoux',
  sherry: 'xérès',
  brandy: 'cognac',
  rum: 'rhum',
  'almond extract': "extrait d'amande",
  'ground almonds': "poudre d'amande",
  'flaked almonds': 'amandes effilées',
  hazelnuts: 'noisette',
  pistachios: 'pistache',
  'cashew nuts': 'noix de cajou',
  cashews: 'noix de cajou',
  'mixed spice': "mélange d'épices",
  'five spice powder': 'cinq-épices',
  'harissa spice': 'harissa',
  'ras el hanout': 'ras el hanout',
  tahini: 'tahini',
  miso: 'miso',
  mirin: 'mirin',
  sake: 'saké',
  jalapeno: 'jalapeño',
  'scotch bonnet': 'piment antillais',
  'green beans': 'haricots verts',
  'broad beans': 'fèves',
  'baby plum tomatoes': 'tomate cerise',
  'little gem lettuce': 'sucrine',
  rocket: 'roquette',
  watercress: 'cresson',
  'bean sprouts': 'pousses de soja',
  'bok choy': 'pak choi',
  'pak choi': 'pak choi',
  lemongrass: 'citronnelle',
  'kaffir lime leaves': 'combava',
  'thai green curry paste': 'pâte de curry vert',
  'thai red curry paste': 'pâte de curry rouge',
  'red curry paste': 'pâte de curry rouge',
  'peanut oil': "huile d'arachide",
  'coconut oil': 'huile de coco',
  treacle: 'mélasse',
  'golden syrup': 'sirop de sucre roux',
  custard: 'crème anglaise',
  jam: 'confiture',
  'strawberry jam': 'confiture de fraise',
  'raspberry jam': 'confiture de framboise',
  'self raising flour': 'farine',
  'baking powder ': 'levure chimique',
  chestnuts: 'châtaigne',
  prunes: 'pruneau',
  sultanas: 'raisins secs',
  currants: 'raisins secs',
  'mixed peel': 'écorces confites',
  'mint leaves': 'menthe',
  tarragon: 'estragon',
  'tarragon leaves': 'estragon',
  cayenne: 'piment de Cayenne',
  fenugreek: 'fenugrec',
  'black treacle': 'mélasse',
  capers: 'câpres',
  gherkins: 'cornichons',
  'mussels ': 'moule',
  'beef shin': 'jarret de bœuf',
  'stewing beef': 'bœuf à braiser',
  'braising steak': 'bœuf à braiser',
  'sirloin steak': 'faux-filet',
  'ribeye steak': 'entrecôte',
  'rump steak': 'rumsteck',
  'chicken thigh': 'haut de cuisse de poulet',
  'chicken wings': 'aile de poulet',
  'whole chicken': 'poulet',
  'pork belly': 'poitrine de porc',
  'pork tenderloin': 'filet mignon de porc',
  'italian sausage': 'saucisse italienne',
  cilantro: 'coriandre',
  'melted butter': 'beurre',
  scallions: 'oignon nouveau',
  'ground beef': 'bœuf haché',
  'corn flour': 'fécule de maïs',
  'kosher salt': 'sel',
  'tinned tomatos': 'tomates concassées',
  'tinned tomatoes': 'tomates concassées',
  'sesame seed': 'graines de sésame',
  'muscovado sugar': 'cassonade',
  'dried oregano': 'origan',
  'egg plants': 'aubergine',
  'clear honey': 'miel',
  hotsauce: 'sauce piquante',
  'hot sauce': 'sauce piquante',
  'tomato sauce': 'sauce tomate',
  'dry sherry': 'xérès',
  'ground pork': 'porc haché',
  'minced garlic': 'ail',
  'garlic cloves': 'ail',
  'fresh ginger': 'gingembre',
  'red pepper flakes': 'piment en flocons',
  'green chillies': 'piment vert',
  'red chillies': 'piment',
  'thyme leaves': 'thym',
  'parsley leaves': 'persil',
  'fresh basil': 'basilic',
  'ground turmeric': 'curcuma',
  'ground nutmeg': 'muscade',
  'free-range eggs': 'œuf',
  'free-range egg, beaten': 'œuf',
  'large eggs': 'œuf',
  'beef mince': 'bœuf haché',
  'pork mince': 'porc haché',
  'chicken thighs ': 'haut de cuisse de poulet',
  'boneless chicken thighs': 'haut de cuisse de poulet',
  'grated parmesan': 'parmesan',
  'parmigiano-reggiano': 'parmesan',
  'bread flour': 'farine',
  'whole milk': 'lait',
  'semi-skimmed milk': 'lait',
  'heavy whipping cream': 'crème liquide',
  'whipping cream': 'crème liquide',
  'sour cream ': 'crème aigre',
  'light brown sugar': 'cassonade',
  'demerara sugar': 'cassonade',
  'superfine sugar': 'sucre',
  'powdered sugar': 'sucre glace',
  'vanilla essence': 'extrait de vanille',
  'lemon juice ': 'citron',
  'juice of 1 lemon': 'citron',
  'lime zest': 'citron vert',
  'orange zest': 'orange',
  'orange juice': 'orange',
  'chopped onion': 'oignon',
  'white onion': 'oignon',
  'yellow onion': 'oignon',
  'brown onion': 'oignon',
  'baby spinach': 'épinards frais',
  'mixed herbs': 'herbes de provence',
  'chicken stock ': 'bouillon de volaille',
  'fish stock': 'fumet de poisson',
  'tomato purée': 'concentré de tomate',
  'garlic sauce': "sauce à l'ail",
  'soy sauce ': 'sauce soja',
  'light soy sauce': 'sauce soja',
  'chinese five spice': 'cinq-épices',
  pancetta: 'pancetta',
  prosciutto: 'jambon de Parme',
  'parma ham': 'jambon de Parme',
  salami: 'salami',
  pepperoni: 'pepperoni',
  'black pudding': 'boudin noir',
};

/** Traduit un nom d'ingrédient anglais (sinon le garde, en minuscules). */
export function translateIngredient(name: string): string {
  const key = name.trim().toLowerCase().replace(/\s+/g, ' ');
  return EN_FR[key] ?? EN_FR[key.replace(/s$/, '')] ?? key;
}

const UNITS: [RegExp, string, number][] = [
  [/^(tbsp|tbs|tblsp|tablespoons?)$/i, 'c. à s.', 1],
  [/^(tsp|teaspoons?)$/i, 'c. à c.', 1],
  [/^(g|grams?|gr)$/i, 'g', 1],
  [/^(kg|kilograms?)$/i, 'kg', 1],
  [/^(ml|millilitres?|milliliters?)$/i, 'ml', 1],
  [/^(l|litres?|liters?)$/i, 'l', 1],
  [/^(cups?)$/i, 'ml', 240],
  [/^(lbs?|pounds?)$/i, 'g', 454],
  [/^(oz|ounces?)$/i, 'g', 28],
  [/^(cloves?)$/i, 'gousse', 1],
  [/^(pinch)$/i, 'pincée', 1],
  [/^(slices?)$/i, 'tranche', 1],
  [/^(cans?|tins?)$/i, 'boîte', 1],
];

/** Lit une mesure TheMealDB (« 2 tbs », « 200g », « 1/2 cup », « Pinch ») en quantité + unité. */
export function parseMeasure(measure: string): {
  quantity: number | null;
  unit: string | null;
  note: string | null;
} {
  const m = measure.trim();
  if (!m) return { quantity: null, unit: null, note: null };
  const match = m.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?\.?(.*)$/);
  if (!match) {
    const unit = UNITS.find(([re]) => re.test(m));
    return unit
      ? { quantity: 1, unit: unit[1], note: null }
      : { quantity: null, unit: null, note: m.toLowerCase() };
  }
  const [, num, rawUnit, rest] = match;
  let quantity = 0;
  for (const part of num.split(/\s+/)) {
    if (part.includes('/')) {
      const [a, b] = part.split('/').map(Number);
      quantity += b ? a / b : 0;
    } else quantity += parseFloat(part.replace(',', '.'));
  }
  if (!rawUnit) return { quantity, unit: null, note: rest.trim() || null };
  const unit = UNITS.find(([re]) => re.test(rawUnit));
  if (unit) {
    const q = Math.round(quantity * unit[2] * 100) / 100;
    return { quantity: q, unit: unit[1], note: rest.trim() || null };
  }
  return { quantity, unit: null, note: `${rawUnit}${rest}`.trim().toLowerCase() || null };
}

function splitSteps(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(step\s*\d+[:.)]?|\d+[.)])\s*/i, '').trim())
    .filter((l) => l.length > 3);
  if (lines.length >= 2) return lines.slice(0, 30);
  // Un seul paragraphe : on regroupe les phrases deux par deux.
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const steps: string[] = [];
  for (let i = 0; i < sentences.length; i += 2)
    steps.push(
      sentences
        .slice(i, i + 2)
        .join(' ')
        .trim(),
    );
  return steps.filter(Boolean).slice(0, 30);
}

export function mealToRecipe(meal: Meal): CatalogRecipe {
  const ingredients: ParsedIngredient[] = [];
  for (let n = 1; n <= 20; n++) {
    const name = meal[`strIngredient${n}`]?.trim();
    if (!name) continue;
    const measure = parseMeasure(meal[`strMeasure${n}`] ?? '');
    ingredients.push({ name: translateIngredient(name), ...measure, optional: false });
  }
  const cat = CATEGORY[meal.strCategory ?? ''] ?? { c: 'plat' as CategoryId, e: '🍽️' };
  const title = meal.strMeal.trim();
  const category: CategoryId = /soup|broth|chowder/i.test(title) ? 'soupe' : cat.c;
  const cuisine = AREAS[meal.strArea ?? ''] ?? 'monde';
  const tags = (meal.strTags ?? '').toLowerCase();
  const moods = new Set<MoodId>();
  if (category === 'dessert' || /treat|cake|pudding|sweet|chocolate/.test(tags)) moods.add('gourmand');
  if (['Vegetarian', 'Vegan', 'Seafood'].includes(meal.strCategory ?? '') || /healthy|light/.test(tags))
    moods.add('healthy');
  if (
    ['Beef', 'Pork', 'Lamb', 'Pasta', 'Goat'].includes(meal.strCategory ?? '') ||
    /warming|comfort|stew|pie/.test(tags + title.toLowerCase())
  )
    moods.add('reconfort');
  if (!EUROPEAN.has(cuisine) || /spicy|curry/.test(tags + title.toLowerCase())) moods.add('exotique');
  if (/party|christmas|celebration|bbq|alcoholic/.test(tags)) moods.add('festif');
  const prepMinutes = Math.min(45, 5 + ingredients.length * 2);
  const cookMinutes = ['Beef', 'Lamb', 'Pork', 'Goat'].includes(meal.strCategory ?? '')
    ? 60
    : category === 'dessert'
      ? 30
      : 25;
  if (prepMinutes + cookMinutes <= 35) moods.add('rapide');
  const id = Number(meal.idMeal);
  return {
    slug: `${slugify(title)}-${meal.idMeal}`,
    externalId: `themealdb:${meal.idMeal}`,
    title,
    description: `Recette ${cuisine === 'monde' ? 'du monde' : cuisine} issue de TheMealDB.`,
    emoji: cat.e,
    color: COLORS[id % COLORS.length],
    imageUrl: meal.strMealThumb ? `${meal.strMealThumb}/medium` : null,
    category,
    cuisine,
    moods: [...moods],
    diets: deriveDiets(ingredients.map((i) => i.name)),
    seasons: [],
    prepMinutes,
    cookMinutes,
    servings: 4,
    difficulty: ingredients.length > 12 ? 2 : 1,
    cost: ['Beef', 'Lamb', 'Seafood'].includes(meal.strCategory ?? '') ? 2 : 1,
    tips: null,
    steps: splitSteps(meal.strInstructions ?? ''),
    source: 'themealdb',
    lang: 'en',
    ingredients,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'meal-maker-import' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return (await res.json()) as T;
}

export async function importMealDb(): Promise<number> {
  const meals = new Map<string, Meal>();
  for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
    const data = await fetchJson<{ meals: Meal[] | null }>(`${API}/search.php?f=${letter}`);
    for (const meal of data.meals ?? []) meals.set(meal.idMeal, meal);
  }
  let count = 0;
  const unknown = new Map<string, number>();
  for (const meal of meals.values()) {
    const recipe = mealToRecipe(meal);
    if (!recipe.steps.length || !recipe.ingredients.length) continue;
    for (const ing of recipe.ingredients) {
      if (
        !/[àâçéèêëîïôûùüÿœ]/i.test(ing.name) &&
        normalizeName(ing.name) === ing.name.toLowerCase() &&
        !Object.values(EN_FR).includes(ing.name)
      ) {
        unknown.set(ing.name, (unknown.get(ing.name) ?? 0) + 1);
      }
    }
    await upsertCatalogRecipe(prisma, recipe);
    count++;
  }
  await invalidate();
  console.log(`TheMealDB : ${count} recettes importées.`);
  const top = [...unknown.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  if (top.length)
    console.log(
      'Ingrédients non traduits les plus fréquents :',
      top.map(([n, c]) => `${n} (${c})`).join(', '),
    );
  return count;
}
