import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Weapon inspection (modules/weapon/inspect.lua): the right column turns into an inspect panel
// whose window shows the game, where the weapon is filmed; pins mark its attachment points.

export interface InspectAttachment {
  slot: number;
  name: string;
  label: string;
  count: number;
}

export interface InspectSlot {
  id: string;
  label: string;
  attached?: { name: string; label: string } | null;
  available: InspectAttachment[];
}

export interface InspectData {
  slot: number;
  name: string;
  label: string;
  serial?: string;
  durability?: number;
  ammo?: number;
  ammoType?: string;
  tint?: string;
  damage?: number;
  fireRate?: number;
  accuracy?: number;
  range?: number;
  slots: InspectSlot[];
  /** set on opening only: the client draws the backdrop behind the weapon */
  backdrop?: boolean;
}

/** An attachment point projected to the screen, as fractions of its width and height */
export interface InspectPin {
  id: string;
  x: number;
  y: number;
}

/** The see-through window in screen pixels */
export interface InspectWindow {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface InspectState {
  slot: number | null;
  data: InspectData | null;
  pins: InspectPin[];
  window: InspectWindow | null;
  selected: string | null;
  // the client draws the whole backdrop behind the weapon, so the UI hides its own
  backdrop: boolean;
}

const initialState: InspectState = {
  slot: null,
  data: null,
  pins: [],
  window: null,
  selected: null,
  backdrop: false,
};

export const inspectSlice = createSlice({
  name: 'inspect',
  initialState,
  reducers: {
    startInspect(state, action: PayloadAction<number>) {
      return { ...initialState, slot: action.payload };
    },
    endInspect() {
      return initialState;
    },
    setInspectData(state, action: PayloadAction<InspectData>) {
      state.data = action.payload;
    },
    setInspectPins(state, action: PayloadAction<InspectPin[]>) {
      state.pins = action.payload;
    },
    setInspectWindow(state, action: PayloadAction<InspectWindow>) {
      state.window = action.payload;
    },
    selectInspectSlot(state, action: PayloadAction<string | null>) {
      state.selected = action.payload;
    },
    setInspectBackdrop(state, action: PayloadAction<boolean>) {
      state.backdrop = action.payload;
    },
  },
});

export const {
  startInspect,
  endInspect,
  setInspectData,
  setInspectPins,
  setInspectWindow,
  selectInspectSlot,
  setInspectBackdrop,
} = inspectSlice.actions;

export default inspectSlice.reducer;
