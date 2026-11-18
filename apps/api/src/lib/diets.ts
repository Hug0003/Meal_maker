import type { DietId } from '@meal/shared';
import { normalizeName } from '@meal/shared';

const MEAT_FISH =
  /boeuf|veau|porc|poulet|dinde|canard|agneau|lardon|jambon|saucisse|chorizo|bacon|steak|viande|poisson|saumon|thon|cabillaud|crevette|gambas|moule|calamar|encornet|lieu|sardine|maquereau|merguez|escalope|saint-jacques|truite|anchois|haddock|colin|lapin|pancetta|speck|coppa|magret|crabe|poulpe|seiche|dorade|\bbar\b|foie|pintade|guanciale|volaille|gigot|jarret|paleron|surimi|hareng|merlu|gelatine|nuoc|sauce poisson|worcestershire|fond de veau|bouillon de (boeuf|volaille|poulet)|dashi|bonite|chair a saucisse|cote de|rumsteck|bavette|joue de|travers|epaule d|cuisse|blanc de|filet mignon|hache|mortadelle|salami|rillette|andouille|boudin|pastrami|nduja|katsuobushi/;
const ANIMAL =
  /oeuf|lait(?! de coco| d'amande| d'avoine| de soja| vegetal)|beurre(?! de cacahuete| d'arachide)|creme(?! de coco)|fromage|parmesan|parmigiano|pecorino|mozzarella|feta|ricotta|mascarpone|yaourt|emmental|gruyere|comte|cheddar|chevre|reblochon|camembert|roquefort|gorgonzola|burrata|halloumi|skyr|petit-suisse|raclette|miel|beaufort|brie|paneer|tomme|ghee|meringue|boudoir|brioche|pate feuilletee|pate brisee|pate sablee|chocolat au lait|lait concentre/;
const LACTOSE =
  /lait(?! de coco| d'amande| d'avoine| de soja| vegetal)|beurre(?! de cacahuete| d'arachide)|creme(?! de coco)|fromage|parmesan|parmigiano|pecorino|mozzarella|feta|ricotta|mascarpone|yaourt|emmental|gruyere|comte|cheddar|chevre|reblochon|camembert|roquefort|gorgonzola|burrata|halloumi|skyr|petit-suisse|raclette|beaufort|brie|paneer|tomme|ghee|chocolat au lait|lait concentre|pate feuilletee|pate brisee|pate sablee|brioche/;
const GLUTEN =
  /farine(?! de riz| de sarrasin| de pois| de mais| de coco| d'amande| de chataigne)|pates|spaghetti|tagliatelle|penne|lasagne|nouilles?(?! de riz)|semoule|boulgour|couscous|pain|chapelure|biscuit|pate (feuilletee|brisee|sablee|a pizza|filo|brick)|feuilles? de brick|brioche|tortilla(?! de mais)|sauce soja|biere|gnocchi|ravioli|tortellini|udon|ramen|\bble\b|epeautre|orge|seigle|biscotte|speculoos|boudoir|crouton|wrap|naan|pita|blini|macaroni|fusilli|coquillette|orzo|linguine|farfalle|rigatoni|conchiglie|vermicelle(?! de riz)|fregola|panko|amaretti|gaufrette|cereales|muesli|granola|levure maltee|seitan|miso d'orge|cookies?|galette(?! de riz)|flocons d'avoine/;

/** Déduit les régimes compatibles à partir des noms d'ingrédients (approximation volontairement prudente). */
export function deriveDiets(ingredientNames: string[]): DietId[] {
  const names = ingredientNames.map(normalizeName);
  const has = (re: RegExp) => names.some((n) => re.test(n));
  const diets: DietId[] = [];
  const vegetarian = !has(MEAT_FISH);
  if (vegetarian) diets.push('vegetarien');
  if (vegetarian && !has(ANIMAL)) diets.push('vegan');
  if (!has(GLUTEN)) diets.push('sans-gluten');
  if (!has(LACTOSE)) diets.push('sans-lactose');
  return diets;
}
