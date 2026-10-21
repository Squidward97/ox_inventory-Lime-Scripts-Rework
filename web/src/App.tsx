import InventoryComponent from './components/inventory';
import useNuiEvent from './hooks/useNuiEvent';
import { Items } from './store/items';
import { Locale } from './store/locale';
import { setImagePath } from './store/imagepath';
import { setupInventory, setUtilityConfig } from './store/inventory';
import { Inventory, UtilitySlotConfig } from './typings';
import { useAppDispatch } from './store';
import { debugData } from './utils/debugData';
import DragPreview from './components/utils/DragPreview';
import { fetchNui } from './utils/fetchNui';
import { useDragDropManager } from 'react-dnd';
import KeyPress from './components/utils/KeyPress';
import { setSoundVolume } from './utils/sound';
import { startInspect } from './store/inspect';
import { isEnvBrowser } from './utils/misc';
import { applyUiStyle, isUiStyle } from './utils/uistyle';
import { useEffect } from 'react';

debugData<UtilitySlotConfig[]>([
  {
    action: 'setupUtility',
    data: [
      { slot: 51, role: 'backpack', label: 'Backpack', items: ['backpack', 'duffelbag'] },
      { slot: 52, role: 'phone', label: 'Phone', items: ['phone'] },
      { slot: 53, role: 'utility', label: 'Utility 1', weapons: false },
      { slot: 54, role: 'radio', label: 'Radio', items: ['radio'] },
      { slot: 55, role: 'armour', label: 'Armor', items: ['armour'] },
      { slot: 56, role: 'utility', label: 'Utility 2', weapons: false },
      { slot: 57, role: 'hotkey', label: 'Hotkey 1', hotkey: 1 },
      { slot: 58, role: 'hotkey', label: 'Hotkey 2', hotkey: 2 },
      { slot: 59, role: 'hotkey', label: 'Hotkey 3', hotkey: 3 },
      { slot: 60, role: 'hotkey', label: 'Hotkey 4', hotkey: 4 },
      { slot: 61, role: 'hotkey', label: 'Hotkey 5', hotkey: 5 },
    ],
  },
]);

const mockShop = {
  id: 'shop',
  type: 'shop',
  slots: 8,
  label: '24/7 Supermarket',
  items: [
    { slot: 1, name: 'water', weight: 500, price: 15, count: 50 },
    { slot: 2, name: 'burger', weight: 220, price: 35, count: 24 },
    { slot: 3, name: 'sprunk', weight: 350, price: 12 },
    {
      slot: 4,
      name: 'bandage',
      weight: 120,
      price: 120,
      count: 8,
      metadata: { description: 'Field dressing for light wounds' },
    },
    { slot: 5, name: 'lockpick', weight: 160, price: 400, currency: 'black_money', count: 3 },
    { slot: 6, name: 'radio', weight: 900, price: 3, currency: 'water', count: 5 },
    { slot: 7, name: 'phone', weight: 190, price: 850, count: 0 },
    {
      slot: 8,
      name: 'armour',
      weight: 3000,
      price: 2500,
      count: 2,
      metadata: { rarity: 'epic', description: 'Light ballistic vest' },
    },
  ],
};

// Recipes use what the mock pockets hold (iron 5, copper 12, a power saw at 75%), so some can be
// crafted and some show missing items. An ingredient under 1 is tool wear, 0 means the tool is
// only needed, not used.
const mockCrafting = {
  id: 'workbench',
  type: 'crafting',
  slots: 5,
  label: 'Workbench',
  items: [
    { slot: 1, name: 'lockpick', weight: 160, count: 1, duration: 4000, ingredients: { iron: 2, copper: 4 } },
    {
      slot: 2,
      name: 'radio',
      weight: 900,
      count: 1,
      duration: 6000,
      ingredients: { copper: 6, iron: 1, powersaw: 0 },
      metadata: { description: 'Short-range handheld radio' },
    },
    { slot: 3, name: 'bandage', weight: 120, count: 1, duration: 2000, ingredients: { water: 1 } },
    {
      slot: 4,
      name: 'armour',
      weight: 3000,
      count: 1,
      duration: 12000,
      ingredients: { iron: 10, copper: 8, powersaw: 0.15 },
      metadata: { rarity: 'epic', description: 'Light ballistic vest' },
    },
    {
      slot: 5,
      name: 'WEAPON_PISTOL',
      weight: 1100,
      count: 1,
      duration: 20000,
      ingredients: { iron: 12, copper: 20 },
      metadata: { rarity: 'rare' },
    },
  ],
};

// the browser preview opens the shop; ?right=crafting opens the workbench instead
const mockRightInventory =
  new URLSearchParams(window.location.search).get('right') === 'crafting' ? mockCrafting : mockShop;

debugData([
  {
    action: 'setupInventory',
    data: {
      leftInventory: {
        id: 'test',
        type: 'player',
        slots: 61,
        label: 'Bob Smith',
        weight: 3000,
        maxWeight: 50000,
        items: [
          {
            slot: 51,
            name: 'backpack',
            weight: 2500,
            count: 1,
            metadata: { id: 'BPK123456DEMO', rarity: 'legendary' },
          },
          { slot: 55, name: 'armour', weight: 3000, count: 1, metadata: { durability: 64, rarity: 'epic' } },
          { slot: 57, name: 'WEAPON_PISTOL', weight: 1100, count: 1, metadata: { durability: 91, ammo: 12, rarity: 'rare' } },
          { slot: 58, name: 'bandage', weight: 120, count: 3 },
          {
            slot: 1,
            name: 'iron',
            weight: 3000,
            metadata: {
              description: `name: Svetozar Miletic  \n Gender: Male`,
              ammo: 3,
              mustard: '60%',
              ketchup: '30%',
              mayo: '10%',
            },
            count: 5,
          },
          { slot: 2, name: 'powersaw', weight: 0, count: 1, metadata: { durability: 75 } },
          { slot: 3, name: 'copper', weight: 100, count: 12, metadata: { type: 'Special', rarity: 'uncommon' } },
          {
            slot: 4,
            name: 'water',
            weight: 100,
            count: 1,
            metadata: { description: 'Generic item description', rarity: 'uncommon' },
          },
          { slot: 5, name: 'water', weight: 100, count: 1 },
          {
            slot: 6,
            name: 'backwoods',
            weight: 100,
            count: 1,
            metadata: {
              label: 'Russian Cream',
              imageurl: 'https://i.imgur.com/2xHhTTz.png',
            },
          },
        ],
      },
      rightInventory: mockRightInventory,
      backpackInventory: {
        id: 'backpack-BPK123456DEMO',
        type: 'backpack',
        slots: 20,
        label: 'Tactical Pack',
        maxWeight: 20000,
        items: [
          { slot: 1, name: 'water', weight: 100, count: 4 },
          { slot: 2, name: 'bandage', weight: 120, count: 2 },
        ],
      },
    },
  },
]);

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const manager = useDragDropManager();

  // browser preview: ?inspect=57 opens the weapon inspection on that slot once the mock inventory is in
  useEffect(() => {
    const slot = Number(new URLSearchParams(window.location.search).get('inspect'));
    if (!isEnvBrowser() || !slot) return;

    const timer = setTimeout(() => dispatch(startInspect(slot)), 1200);
    return () => clearTimeout(timer);
  }, []);

  useNuiEvent<{
    locale: { [key: string]: string };
    items: typeof Items;
    leftInventory: Inventory;
    imagepath: string;
    uistyle?: string;
    uisound?: number;
  }>('init', ({ locale, items, leftInventory, imagepath, uistyle, uisound }) => {
    for (const name in locale) Locale[name] = locale[name];
    if (isUiStyle(uistyle)) applyUiStyle(uistyle);
    if (uisound !== undefined) setSoundVolume(uisound);
    for (const name in items) Items[name] = items[name];

    setImagePath(imagepath);
    dispatch(setupInventory({ leftInventory }));
  });

  useNuiEvent<UtilitySlotConfig[]>('setupUtility', (data) => dispatch(setUtilityConfig(data)));

  fetchNui('uiLoaded', {});

  useNuiEvent('closeInventory', () => {
    manager.dispatch({ type: 'dnd-core/END_DRAG' });
  });

  return (
    <div className="app-wrapper">
      <InventoryComponent />
      <DragPreview />
      <KeyPress />
    </div>
  );
};

addEventListener('dragstart', function (event) {
  event.preventDefault();
});

export default App;
