import React, { useEffect, useRef, useState } from 'react';
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
  SettingsIcon,
  ShirtIcon,
  StarIcon,
  ToolIcon,
} from '../utils/icons/TablerIcons';
import { playSound } from '../../utils/sound';
import { chooseUiStyle, getUiStyle, UiStyle } from '../../utils/uistyle';

const THEMES: Array<{ id: UiStyle; label: () => string; description: () => string }> = [
  {
    id: 'tactical',
    label: () => Locale.ui_theme_tactical || 'Tactical',
    description: () => Locale.ui_theme_tactical_hint || 'Graphite HUD, sharp and angled',
  },
  {
    id: 'delperro',
    label: () => Locale.ui_theme_delperro || 'DelPerroSands',
    description: () => Locale.ui_theme_delperro_hint || 'Navy panels, one orange outline',
  },
  {
    id: 'glass',
    label: () => Locale.ui_theme_glass || 'Glass',
    description: () => Locale.ui_theme_glass_hint || 'Translucent, soft and rounded',
  },
  {
    id: 'minimal',
    label: () => Locale.ui_theme_minimal || 'Minimal',
    description: () => Locale.ui_theme_minimal_hint || 'Flat and quiet, lightest to render',
  },
  {
    id: 'midnight',
    label: () => Locale.ui_theme_midnight || 'Midnight',
    description: () => Locale.ui_theme_midnight_hint || 'Navy panels with a blue glow',
  },
  {
    id: 'outline',
    label: () => Locale.ui_theme_outline || 'Outline',
    description: () => Locale.ui_theme_outline_hint || 'Thin outlines over the open game',
  },
];

// The gear at the end of the toolbar: a small popover to switch themes, applied straight away.
const SettingsMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<UiStyle>(getUiStyle);
  const ref = useRef<HTMLDivElement>(null);

  // close on any click outside the popover
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const toggle = () => {
    playSound('toggle');
    setTheme(getUiStyle());
    setOpen((previous) => !previous);
  };

  const pick = (id: UiStyle) => {
    if (id === theme) return;

    playSound('toggle');
    chooseUiStyle(id);
    setTheme(id);
  };

  return (
    <div className="toolbar-settings" ref={ref}>
      <button
        className="toolbar-button"
        data-active={open}
        title={Locale.ui_settings || 'Settings'}
        onClick={toggle}
      >
        <SettingsIcon />
      </button>
      {open && (
        <div className="settings-popover">
          <span className="field-label">{Locale.ui_theme || 'Theme'}</span>
          <div className="settings-themes">
            {THEMES.map((entry) => (
              <button
                key={entry.id}
                className="settings-theme"
                data-theme={entry.id}
                data-active={theme === entry.id}
                onClick={() => pick(entry.id)}
              >
                <span className="settings-theme-swatch" />
                <span className="settings-theme-text">
                  <span className="settings-theme-name">{entry.label()}</span>
                  <span className="settings-theme-hint">{entry.description()}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
      <SettingsMenu />
    </div>
  );
};
