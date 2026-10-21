import { store } from '../store';
import { Inventory, InventoryType, Slot } from '../typings';
import { fetchNui } from '../utils/fetchNui';
import { playSound } from '../utils/sound';

export const onGive = (item: Slot, fromType?: Inventory['type']) => {
  const {
    inventory: { itemAmount },
  } = store.getState();
  playSound('use');
  fetchNui('giveItem', {
    slot: item.slot,
    count: itemAmount,
    fromType: fromType === InventoryType.BACKPACK ? fromType : undefined,
  });
};
