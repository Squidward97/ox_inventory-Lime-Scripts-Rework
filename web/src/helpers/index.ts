import { Inventory, InventoryType, ItemData, Slot, SlotWithItem, State } from '../typings';
import { isEqual } from 'lodash-es';
import { store } from '../store';
import { Items } from '../store/items';
import { imagepath } from '../store/imagepath';
import { fetchNui } from '../utils/fetchNui';
import { Locale } from '../store/locale';

export const canPurchaseItem = (item: Slot, inventory: { type: Inventory['type']; groups: Inventory['groups'] }) => {
  if (inventory.type !== 'shop' || !isSlotWithItem(item)) return true;

  if (item.count !== undefined && item.count === 0) return false;

  if (item.grade === undefined || !inventory.groups) return true;

  const leftInventory = store.getState().inventory.leftInventory;

  // Shop requires groups but player has none
  if (!leftInventory.groups) return false;

  const reqGroups = Object.keys(inventory.groups);

  if (Array.isArray(item.grade)) {
    for (let i = 0; i < reqGroups.length; i++) {
      const reqGroup = reqGroups[i];

      if (leftInventory.groups[reqGroup] !== undefined) {
        const playerGrade = leftInventory.groups[reqGroup];
        for (let j = 0; j < item.grade.length; j++) {
          const reqGrade = item.grade[j];

          if (playerGrade === reqGrade) return true;
        }
      }
    }

    return false;
  } else {
    for (let i = 0; i < reqGroups.length; i++) {
      const reqGroup = reqGroups[i];
      if (leftInventory.groups[reqGroup] !== undefined) {
        const playerGrade = leftInventory.groups[reqGroup];

        if (playerGrade >= item.grade) return true;
      }
    }

    return false;
  }
};

export const canCraftItem = (item: Slot, inventoryType: string) => {
  if (!isSlotWithItem(item) || inventoryType !== 'crafting') return true;
  if (!item.ingredients) return true;
  const leftInventory = store.getState().inventory.leftInventory;
  const ingredientItems = Object.entries(item.ingredients);

  const remainingItems = ingredientItems.filter((ingredient) => {
    const [item, count] = [ingredient[0], ingredient[1]];
    const globalItem = Items[item];

    if (count >= 1) {
      if (globalItem && globalItem.count >= count) return false;
    }

    const hasItem = leftInventory.items.find((playerItem) => {
      if (isSlotWithItem(playerItem) && playerItem.name === item) {
        if (count < 1) {
          if (playerItem.metadata?.durability >= count * 100) return true;

          return false;
        }
      }
    });

    return !hasItem;
  });

  return remainingItems.length === 0;
};

export const isSlotWithItem = (slot: Slot, strict: boolean = false): slot is SlotWithItem =>
  (slot.name !== undefined && slot.weight !== undefined) ||
  (strict && slot.name !== undefined && slot.count !== undefined && slot.weight !== undefined);

export const canStack = (sourceSlot: Slot, targetSlot: Slot) =>
  sourceSlot.name === targetSlot.name && isEqual(sourceSlot.metadata, targetSlot.metadata);

export const findAvailableSlot = (item: Slot, data: ItemData, items: Slot[], inventoryType?: Inventory['type']) => {
  const targets = inventoryType === InventoryType.PLAYER ? items.filter((slot) => !isUtilitySlot(slot.slot)) : items;

  if (!data.stack) return targets.find((target) => target.name === undefined);

  const stackableSlot = targets.find((target) => target.name === item.name && isEqual(target.metadata, item.metadata));

  return stackableSlot || targets.find((target) => target.name === undefined);
};

const getInventoryByType = (state: State, type: Inventory['type']): Inventory =>
  type === InventoryType.PLAYER
    ? state.leftInventory
    : type === InventoryType.BACKPACK
      ? state.backpackInventory
      : type === InventoryType.RIGHTBACKPACK
        ? state.rightBackpackInventory
        : state.rightInventory;

export const getTargetInventory = (
  state: State,
  sourceType: Inventory['type'],
  targetType?: Inventory['type']
): { sourceInventory: Inventory; targetInventory: Inventory } => ({
  sourceInventory: getInventoryByType(state, sourceType),
  targetInventory: targetType
    ? getInventoryByType(state, targetType)
    : sourceType === InventoryType.PLAYER || sourceType === InventoryType.BACKPACK
      ? state.rightInventory
      : state.leftInventory,
});

export const getUtilitySlotConfig = (slot: number) =>
  store.getState().inventory.utility.find((config) => config.slot === slot);

export const isUtilitySlot = (slot: number) => getUtilitySlotConfig(slot) !== undefined;

export const utilitySlotAccepts = (slot: number, itemName: string) => {
  const config = getUtilitySlotConfig(slot);

  if (!config) return true;

  const isWeapon = itemName.startsWith('WEAPON_');

  if (config.weapons === false && isWeapon) return false;

  if (!config.items && !config.weapons) return true;

  return !!(config.items?.includes(itemName) || (config.weapons && isWeapon));
};

export const getSlotHotkey = (slot: number, inventoryType: Inventory['type']): number | undefined => {
  if (inventoryType !== InventoryType.PLAYER) return undefined;

  const utility = store.getState().inventory.utility;

  if (!utility.length) return slot <= 5 ? slot : undefined;

  return utility.find((config) => config.slot === slot)?.hotkey;
};

export const isBackpackItem = (itemName: string) =>
  store
    .getState()
    .inventory.utility.some((config) => config.role === 'backpack' && config.items?.includes(itemName));

export const canPairInventories = (sourceType: Inventory['type'], targetType: Inventory['type']) => {
  if (sourceType === targetType) return true;

  if (sourceType === InventoryType.RIGHTBACKPACK || targetType === InventoryType.RIGHTBACKPACK)
    return (
      sourceType === InventoryType.PLAYER ||
      targetType === InventoryType.PLAYER ||
      sourceType === InventoryType.BACKPACK ||
      targetType === InventoryType.BACKPACK
    );

  return true;
};

export const canMoveBetweenSlots = (
  sourceType: Inventory['type'],
  sourceSlot: Slot,
  targetType: Inventory['type'],
  targetSlot: Slot
): boolean => {
  if (!canPairInventories(sourceType, targetType)) return false;

  if (!isSlotWithItem(sourceSlot)) return false;

  if (
    (targetType === InventoryType.CONTAINER ||
      targetType === InventoryType.BACKPACK ||
      targetType === InventoryType.RIGHTBACKPACK) &&
    (sourceSlot.metadata?.container !== undefined || isBackpackItem(sourceSlot.name))
  )
    return false;

  if (targetType === InventoryType.PLAYER && !utilitySlotAccepts(targetSlot.slot, sourceSlot.name)) return false;

  if (
    sourceType === InventoryType.PLAYER &&
    isUtilitySlot(sourceSlot.slot) &&
    isSlotWithItem(targetSlot) &&
    targetSlot.slot !== sourceSlot.slot &&
    !utilitySlotAccepts(sourceSlot.slot, targetSlot.name)
  )
    return false;

  return true;
};

export const itemDurability = (metadata: any, curTime: number) => {
  // sorry dunak
  // it's ok linden i fix inventory
  if (metadata?.durability === undefined) return;

  let durability = metadata.durability;

  if (durability > 100 && metadata.degrade)
    durability = ((metadata.durability - curTime) / (60 * metadata.degrade)) * 100;

  if (durability < 0) durability = 0;

  return durability;
};

export const getTotalWeight = (items: Inventory['items']) =>
  items.reduce((totalWeight, slot) => (isSlotWithItem(slot) ? totalWeight + slot.weight : totalWeight), 0);

export const isContainer = (inventory: Inventory) => inventory.type === InventoryType.CONTAINER;

export const getItemData = async (itemName: string) => {
  const resp: ItemData | null = await fetchNui('getItemData', itemName);

  if (resp?.name) {
    Items[itemName] = resp;
    return resp;
  }
};

export const getItemUrl = (item: string | SlotWithItem) => {
  const isObj = typeof item === 'object';

  if (isObj) {
    if (!item.name) return;

    const metadata = item.metadata;

    // @todo validate urls and support webp
    if (metadata?.imageurl) return `${metadata.imageurl}`;
    if (metadata?.image) return `${imagepath}/${metadata.image}.png`;
  }

  const itemName = isObj ? (item.name as string) : item;
  const itemData = Items[itemName];

  if (!itemData) return `${imagepath}/${itemName}.png`;
  if (itemData.image) return itemData.image;

  itemData.image = `${imagepath}/${itemName}.png`;

  return itemData.image;
};

export const formatWeight = (grams: number) =>
  grams >= 1000
    ? `${(grams / 1000).toLocaleString('en-us', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
    : `${grams.toLocaleString('en-us')} g`;

export const padCount = (n: number) => String(n).padStart(2, '0');

export const getItemLabel = (item: SlotWithItem) => item.metadata?.label || Items[item.name]?.label || item.name;

const INVENTORY_KIND_FALLBACK: Record<string, string> = {
  player: 'Pockets',
  otherplayer: 'Player',
  backpack: 'Backpack',
  rightbackpack: 'Backpack',
  shop: 'Shop',
  crafting: 'Crafting',
  container: 'Container',
  drop: 'Ground',
  newdrop: 'Ground',
  stash: 'Stash',
  trunk: 'Trunk',
  glovebox: 'Glovebox',
  policeevidence: 'Evidence',
  dumpster: 'Dumpster',
};

// Short noun for the eyebrow above an inventory; locale key ui_kind_<type> wins over the fallback.
export const getInventoryKind = (type: Inventory['type']) =>
  Locale[`ui_kind_${type}`] || INVENTORY_KIND_FALLBACK[type] || type;

export const getItemCategory = (name: string) =>
  Items[name]?.category ||
  (name.startsWith('WEAPON_') || name.startsWith('ammo') || name.startsWith('at_') ? 'weapons' : undefined);

export const getItemRarity = (item: SlotWithItem) => item.metadata?.rarity || Items[item.name]?.rarity || 'common';

// True when the toolbar search / category filter should fade this slot out.
export const isFilteredOut = (
  item: Slot,
  filters: { search: string; category: string; favourites: string[] }
) => {
  const search = filters.search.trim().toLowerCase();
  if (!search && filters.category === 'all') return false;
  if (!isSlotWithItem(item)) return true;

  if (search) {
    const label = getItemLabel(item).toLowerCase();
    if (!label.includes(search) && !item.name.toLowerCase().includes(search)) return true;
  }

  if (filters.category === 'favourites') return !filters.favourites.includes(item.name);
  if (filters.category !== 'all') return getItemCategory(item.name) !== filters.category;

  return false;
};

export const RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// 1-5; custom rarity names fall back to the first tier
export const getRarityTier = (rarity: string) => Math.max(1, RARITY_TIERS.indexOf(rarity) + 1);
