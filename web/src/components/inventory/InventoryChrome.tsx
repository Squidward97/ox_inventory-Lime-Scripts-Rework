import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectRightInventory } from '../../store/inventory';
import { InventoryType } from '../../typings';
import { Locale } from '../../store/locale';
import { ItemCategory, setCategory, setSearch } from '../../store/filters';
import {
  FoodIcon,
  GridIcon,
  PistolOutlineIcon,
  MouseGlyph,
  SearchIcon,
  ShirtIcon,
  StarIcon,
  ToolIcon,
} from '../utils/icons/TablerIcons';
import { playSound } from '../../utils/sound';

const CATEGORIES: Array<{ id: ItemCategory; icon: React.ReactNode; label: () => string }> = [
  { id: 'all', icon: <GridIcon />, label: () => Locale.ui_filter_all || 'All items' },
  { id: 'food', icon: <FoodIcon />, label: () => Locale.ui_filter_food || 'Food & drink' },
  { id: 'weapons', icon: <PistolOutlineIcon />, label: () => Locale.ui_filter_weapons || 'Weapons' },
  { id: 'clothing', icon: <ShirtIcon />, label: () => Locale.ui_filter_clothing || 'Clothing' },
  { id: 'tools', icon: <ToolIcon />, label: () => Locale.ui_filter_tools || 'Tools' },
  { id: 'favourites', icon: <StarIcon />, label: () => Locale.ui_filter_favourites || 'Favourites' },
];

const Plus = () => <span className="key-hint-plus">+</span>;

// What to do with the inventory on the right, shown as the footer's left label.
const contextHint = (type: string) => {
  switch (type) {
    case '':
      return '';
    case InventoryType.SHOP:
      return Locale.ui_hint_shop || 'Buy from a card, or drag an item into your pockets';
    case InventoryType.CRAFTING:
      return Locale.ui_hint_crafting || 'Craft from a card, or drag a recipe into your pockets';
    default:
      return Locale.ui_hint_take || 'Drag items to your pockets · Ctrl + click to take';
  }
};

// Footer per the style guide: a faint context label on the left, every input on the right.
export const InventoryKeyHints: React.FC = () => {
  const rightInventory = useAppSelector(selectRightInventory);
  const hints: Array<{ keys: React.ReactNode; label: string }> = [
    { keys: <MouseGlyph button="right" />, label: Locale.ui_hint_options || 'Options' },
    {
      keys: (
        <>
          <span className="keycap">Alt</span>
          <Plus />
          <MouseGlyph button="left" />
        </>
      ),
      label: Locale.ui_hint_use || 'Use',
    },
    {
      keys: (
        <>
          <span className="keycap">Ctrl</span>
          <Plus />
          <MouseGlyph button="left" />
        </>
      ),
      label: Locale.ui_hint_quick_move || 'Quick move',
    },
    {
      keys: (
        <>
          <span className="keycap">Ctrl</span>
          <Plus />
          <span className="keycap">Shift</span>
          <Plus />
          <MouseGlyph button="left" />
        </>
      ),
      label: Locale.ui_hint_move_half || 'Move half',
    },
    {
      keys: (
        <>
          <span className="keycap">Shift</span>
          <Plus />
          <span className="keycap">{Locale.ui_hint_drag || 'Drag'}</span>
        </>
      ),
      label: Locale.ui_hint_split || 'Split',
    },
    { keys: <span className="keycap">Esc</span>, label: Locale.ui_close || 'Close' },
  ];

  return (
    <div className="key-hints">
      <span className="key-hints-context">{contextHint(rightInventory.type)}</span>
      <div className="key-hints-list">
        {hints.map((hint, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="key-hints-divider" />}
            <div className="key-hint">
              <span className="key-hint-keys">{hint.keys}</span>
              <span className="key-hint-label">{hint.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export const InventoryToolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { search, category } = useAppSelector((state) => state.filters);
  return (
    <div className="toolbar">
      <label className="toolbar-search">
        <SearchIcon className="icon" />
        <input
          type="text"
          value={search}
          placeholder={Locale.ui_search || 'Search...'}
          onChange={(event) => dispatch(setSearch(event.target.value))}
          onKeyDown={(event) => event.key === 'Escape' && event.currentTarget.blur()}
        />
      </label>
      <div className="toolbar-filters">
        {CATEGORIES.map((entry) => (
          <button
            key={entry.id}
            className="toolbar-button"
            data-active={category === entry.id}
            title={entry.label()}
            onClick={() => {
              playSound('toggle');
              dispatch(setCategory(category === entry.id && entry.id !== 'all' ? 'all' : entry.id));
            }}
          >
            {entry.icon}
          </button>
        ))}
      </div>
    </div>
  );
};
