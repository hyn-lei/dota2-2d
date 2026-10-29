import { ITEM_RECORDS, ITEM_RECORDS_META } from './item-records.js';

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

const definitions = ITEM_RECORDS.map(item => freezeDeep({
  ...item,
  ...(item.recipesAlternative ? {recipeAlternatives:item.recipesAlternative} : {}),
}));
export const ITEM_DATA_META = freezeDeep({...ITEM_RECORDS_META});
export const ITEMS = Object.freeze(definitions.filter(item => item.purchasable));
export const ITEM_BY_ID = Object.freeze(Object.fromEntries([
  ...definitions.map(item => [item.id,item]),
  ['staffwizardry',definitions.find(item => item.id === 'arcane')],
]));
