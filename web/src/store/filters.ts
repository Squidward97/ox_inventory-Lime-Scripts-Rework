import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ItemCategory = 'all' | 'food' | 'weapons' | 'clothing' | 'tools' | 'favourites';

interface FiltersState {
  search: string;
  category: ItemCategory;
  favourites: string[];
}

const FAVOURITES_KEY = 'ox_inventory:favourites';

// Favourites are a per-player convenience, so browser storage is enough; it may be unavailable.
const loadFavourites = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVOURITES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((name) => typeof name === 'string') : [];
  } catch {
    return [];
  }
};

const saveFavourites = (favourites: string[]) => {
  try {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
  } catch {}
};

const initialState: FiltersState = {
  search: '',
  category: 'all',
  favourites: loadFavourites(),
};

export const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setCategory(state, action: PayloadAction<ItemCategory>) {
      state.category = action.payload;
    },
    toggleFavourite(state, action: PayloadAction<string>) {
      const index = state.favourites.indexOf(action.payload);

      if (index === -1) state.favourites.push(action.payload);
      else state.favourites.splice(index, 1);

      saveFavourites(state.favourites);
    },
  },
});

export const { setSearch, setCategory, toggleFavourite } = filtersSlice.actions;

export default filtersSlice.reducer;
