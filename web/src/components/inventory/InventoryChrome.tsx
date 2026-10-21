import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { Locale } from '../../store/locale';
import { ItemCategory, setCategory, setSearch } from '../../store/filters';
import {
  FoodIcon,
  GridIcon,
  InfoIcon,
  PistolOutlineIcon,
  MouseGlyph,
  SearchIcon,
  ShirtIcon,
  StarIcon,
  ToolIcon,
} from '../utils/icons/TablerIcons';

const CATEGORIES: Array<{ id: ItemCategory; icon: React.ReactNode; label: () => string }> = [
  { id: 'all', icon: <GridIcon />, label: () => Locale.ui_filter_all || 'All items' },
  { id: 'food', icon: <FoodIcon />, label: () => Locale.ui_filter_food || 'Food & drink' },
  { id: 'weapons', icon: <PistolOutlineIcon />, label: () => Locale.ui_filter_weapons || 'Weapons' },
  { id: 'clothing', icon: <ShirtIcon />, label: () => Locale.ui_filter_clothing || 'Clothing' },
  { id: 'tools', icon: <ToolIcon />, label: () => Locale.ui_filter_tools || 'Tools' },
  { id: 'favourites', icon: <StarIcon />, label: () => Locale.ui_filter_favourites || 'Favourites' },
];

const Plus = () => <span className="key-hint-plus">+</span>;

const KeyHints: React.FC = () => {
  const hints: Array<{ keys: React.ReactNode; label: string }> = [
    { keys: <MouseGlyph button="right" />, label: Locale.ui_rmb || 'Open item options' },
    {
      keys: (
        <>
          <span className="keycap">Alt</span>
          <Plus />
          <MouseGlyph button="left" />
        </>
      ),
      label: Locale.ui_alt_lmb || 'Use an item',
    },
    {
      keys: (
        <>
          <span className="keycap">Ctrl</span>
          <Plus />
          <MouseGlyph button="left" />
        </>
      ),
      label: Locale.ui_ctrl_lmb || 'Move a stack to the other inventory',
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
      label: Locale.ui_ctrl_shift_lmb || 'Move half a stack',
    },
    {
      keys: (
        <>
          <span className="keycap">Shift</span>
          <Plus />
          <span className="keycap">{Locale.ui_hint_drag || 'Drag'}</span>
        </>
      ),
      label: Locale.ui_shift_drag || 'Split a stack in half',
    },
    { keys: <span className="keycap">Esc</span>, label: Locale.ui_close || 'Close' },
  ];

  return (
    <ul className="key-hints-list divided">
      {hints.map((hint, index) => (
        <li className="key-hint" key={index}>
          <span className="key-hint-keys">{hint.keys}</span>
          <span className="key-hint-label">{hint.label}</span>
        </li>
      ))}
    </ul>
  );
};

export const InventoryToolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { search, category } = useAppSelector((state) => state.filters);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!infoOpen) return;

    const close = (event: MouseEvent) => {
      if (!infoRef.current?.contains(event.target as Node)) setInfoOpen(false);
    };

    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [infoOpen]);

  return (
    <div className="toolbar">
      <div className="toolbar-info" ref={infoRef}>
        <button
          className="toolbar-button"
          data-active={infoOpen}
          title={Locale.ui_usefulcontrols || 'Controls'}
          onClick={() => setInfoOpen((open) => !open)}
        >
          <InfoIcon />
        </button>
        {infoOpen && (
          <div className="toolbar-popover cut-sm">
            <div className="eyebrow">{Locale.ui_usefulcontrols || 'Controls'}</div>
            <KeyHints />
          </div>
        )}
      </div>
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
            onClick={() => dispatch(setCategory(category === entry.id && entry.id !== 'all' ? 'all' : entry.id))}
          >
            {entry.icon}
          </button>
        ))}
      </div>
    </div>
  );
};
