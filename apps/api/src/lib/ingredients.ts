import type { AisleId } from '@meal/shared';
import { normalizeName } from '@meal/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

/** Basiques supposés toujours présents dans la cuisine : ignorés par le filtre « Mon frigo ». */
export const STAPLES = new Set(
  [
    'sel',
    'fleur de sel',
    'poivre',
    'poivre noir',
    'eau',
    'huile',
    "huile d'olive",
    'huile neutre',
    'huile de tournesol',
    'sucre',
    'sucre en poudre',
    'farine',
    'beurre',
    'vinaigre',
    'moutarde',
    'thym',
    'laurier',
    'herbes de provence',
  ].map(normalizeName),
);

// Règles testées dans l'ordre : la première qui correspond donne le rayon.
const AISLE_RULES: [AisleId, RegExp][] = [
  ['epices', /^(sauce|pate de curry|bouillon|fond de) /],
  [
    'epicerie',
    /lait de coco|creme de coco|concentre de tomate|tomates? (concassee|pelee|sechee)|coulis|pulpe de tomate|pate d'arachide|beurre de cacahuete|pois chiches? (cuits|en boite)|haricots? rouges?|haricots? blancs?|mais en boite|thon en boite/,
  ],
  ['surgeles', /surgele/],
  [
    'viandes-poissons',
    /boeuf|veau|porc|poulet|dinde|canard|agneau|lardon|jambon|saucisse|chorizo|bacon|steak|viande|poisson|saumon|thon|cabillaud|crevette|gambas|moule|calamar|encornet|lieu|sardine|maquereau|merguez|filet mignon|escalope|noix de saint|saint-jacques|truite|anchois|haddock|colin|lapin|pancetta|speck|coppa|magret|crabe|poulpe|seiche|dorade|\bbar\b|foie|chair a saucisse|pintade|guanciale|cuisse|hauts? de cuisse|blanc de volaille|volaille|epaule|gigot|jarret|paleron|joue|travers|cote de|rumsteck|bavette|haché|hache|surimi|hareng|merlu|rouget|crevettes/,
  ],
  [
    'cremerie',
    /lait|beurre|creme|fromage|parmesan|parmigiano|pecorino|mozzarella|feta|ricotta|mascarpone|yaourt|oeuf|emmental|gruyere|comte|cheddar|chevre|reblochon|camembert|roquefort|gorgonzola|burrata|halloumi|skyr|petit-suisse|raclette|mont d'or|tofu|tempeh|paneer|beaufort|brie|bleu|cancoillotte|morbier|saint-nectaire|tomme|kiri|boursin|philadelphia|cream cheese|pate (feuilletee|brisee|sablee|a pizza)|gnocchi|ravioli|tortellini/,
  ],
  [
    'feculents',
    /pates|spaghetti|tagliatelle|penne|riz|semoule|quinoa|boulgour|lentille|pois chiche|pois casse|haricots? secs?|nouille|polenta|couscous|lasagne|flocons|avoine|vermicelle|orzo|coquillette|macaroni|linguine|fusilli|farfalle|rigatoni|conchiglie|udon|soba|ramen|galette de riz|feuille de riz|sarrasin|epeautre|ble |millet|fregola|risotto|arborio|basmati|muesli|granola|cereales/,
  ],
  [
    'boulangerie',
    /pain|baguette|brioche|pita|naan|bun|focaccia|wrap|tortilla|crouton|chapelure|biscotte|blini|galette/,
  ],
  [
    'epices',
    /^sel|poivre|cumin|curry|paprika|cannelle|muscade|en poudre|curcuma|piment (d'espelette|de cayenne|en poudre)|herbes|origan|moutarde|vinaigre|sauce|ketchup|mayonnaise|harissa|ras el hanout|garam masala|vanille|cardamome|girofle|badiane|safran|tabasco|nuoc|sriracha|bouillon|fond de|pesto|tahin|miso|worcestershire|zaatar|za'atar|sumac|colombo|5 epices|cinq epices|thym|laurier|gochujang|mirin|sake|dashi|tamari|fenugrec|coriandre en poudre|graines de|bouquet garni|gomasio|furikake|levure maltee|pate de curry|pate de piment|aneth seche|fleur de sel|wasabi/,
  ],
  [
    'epicerie',
    /huile|sucre|miel|chocolat|cacao|levure|maizena|fecule|conserve|amande|noisette|noix|bpignon|cacahuete|pistache|raisin sec|olive|capre|cornichon|sirop|confiture|biscuit|speculoos|gelatine|agar|vin|biere|cidre|rhum|cognac|porto|calvados|kirsch|sesame|graine|cranberr|abricot sec|datte|pruneau|figue seche|coco rapee|noix de coco|pralin|caramel|nutella|pate a tartiner|cafe|the |amaretti|boudoir|meringue|vermouth|marsala|bicarbonate|extrait|eau de fleur|arome|colorant|chips|nachos|crackers|cacahouete|lait concentre|sucre glace|cassonade|vergeoise|stevia|sirop d'erable|tomates? cerises? sechees/,
  ],
  ['boissons', /jus|eau gazeuse|limonade|soda|tonic|ginger beer|kombucha/],
  [
    'fruits-legumes',
    /tomate|oignon|ail|echalote|carotte|courgette|aubergine|poivron|pomme|patate|champignon|epinard|salade|laitue|roquette|mache|concombre|radis|poireau|celeri|fenouil|chou|brocoli|haricot vert|petits? pois|asperge|artichaut|betterave|navet|panais|potiron|potimarron|butternut|courge|mais|avocat|citron|orange|poire|banane|fraise|framboise|myrtille|mangue|ananas|kiwi|peche|abricot|cerise|raisin|melon|pasteque|figue|grenade|fruit|persil|coriandre|basilic|menthe|ciboulette|aneth|estragon|romarin|sauge|gingembre|citronnelle|piment|endive|blette|cresson|edamame|pak choi|bok choy|germe|pousse|ciboule|cebette|legume|clementine|mandarine|pamplemousse|litchi|passion|rhubarbe|cassis|groseille|mure|prune|nectarine|coing|chataigne|marron|topinambour|rutabaga|igname|manioc|plantain|gombo|cerfeuil|oseille|kale|frisee|batavia|sucrine|scarole|trevise|radicchio|shiitake|pleurote|girolle|cepe|morille|truffe|lime|yuzu|combava|feve|pois gourmand|mesclun|jeunes pousses|herbe/,
  ],
];

export function guessAisle(name: string): AisleId {
  const n = normalizeName(name);
  for (const [aisle, re] of AISLE_RULES) if (re.test(n)) return aisle;
  return 'autre';
}

export function isStaple(name: string): boolean {
  return STAPLES.has(normalizeName(name));
}

type Db = PrismaClient | Prisma.TransactionClient;

/** Variantes singulier/pluriel d'un nom normalisé : « oeufs » ↔ « oeuf », « poireaux » ↔ « poireau ». */
export function nameVariants(normalized: string): string[] {
  const v = new Set([normalized]);
  if (/x$/.test(normalized)) v.add(normalized.slice(0, -1));
  if (/s$/.test(normalized)) v.add(normalized.slice(0, -1));
  else v.add(`${normalized}s`);
  if (/(eau|eu)$/.test(normalized)) v.add(`${normalized}x`);
  return [...v];
}

/** Trouve un ingrédient par nom normalisé (en tolérant le pluriel), ou le crée avec un rayon deviné. */
export async function findOrCreateIngredient(db: Db, name: string) {
  const clean = name.trim().replace(/\s+/g, ' ');
  const normalizedName = normalizeName(clean);
  const existing = await db.ingredient.findMany({
    where: { normalizedName: { in: nameVariants(normalizedName) } },
  });
  const exact = existing.find((i) => i.normalizedName === normalizedName);
  if (exact || existing[0]) return exact ?? existing[0];
  return db.ingredient.upsert({
    where: { normalizedName },
    update: {},
    create: {
      name: clean.charAt(0).toLowerCase() + clean.slice(1),
      normalizedName,
      aisle: guessAisle(clean),
      isStaple: isStaple(clean),
    },
  });
}
