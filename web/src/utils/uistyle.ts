import { fetchNui } from './fetchNui';
import { isEnvBrowser } from './misc';

// The NUI themes, picked by data-uistyle on <html>. Players switch between them from the toolbar's
// settings; the choice is kept per player by the client (resource KVP), or in localStorage in
// the browser preview.

export const UI_STYLES = ['delperro', 'tactical', 'glass', 'minimal', 'midnight', 'outline'] as const;
export type UiStyle = (typeof UI_STYLES)[number];

const PREVIEW_KEY = 'inventory:uistyle';

export const isUiStyle = (value: unknown): value is UiStyle => UI_STYLES.includes(value as UiStyle);

export const getUiStyle = (): UiStyle => {
  const current = document.documentElement.dataset.uistyle;
  return isUiStyle(current) ? current : 'tactical';
};

export const applyUiStyle = (style: UiStyle) => {
  document.documentElement.dataset.uistyle = style;
};

/** Applies the theme and remembers it for next time */
export const chooseUiStyle = (style: UiStyle) => {
  applyUiStyle(style);

  if (!isEnvBrowser()) return fetchNui('setUiStyle', style);

  try {
    localStorage.setItem(PREVIEW_KEY, style);
  } catch {
    // storage blocked: the choice just lasts for this page
  }
};

/** The browser preview's theme: ?uistyle= first, then the last pick, then glass */
export const previewUiStyle = (): UiStyle => {
  const query = new URLSearchParams(window.location.search).get('uistyle');
  if (isUiStyle(query)) return query;

  try {
    const saved = localStorage.getItem(PREVIEW_KEY);
    if (isUiStyle(saved)) return saved;
  } catch {
    // storage blocked
  }

  return 'glass';
};
