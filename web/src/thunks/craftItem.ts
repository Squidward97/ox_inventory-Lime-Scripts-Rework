import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchNui } from '../utils/fetchNui';
import { playSound } from '../utils/sound';

export const craftItem = createAsyncThunk(
  'inventory/craftItem',
  async (
    data: { fromSlot: number; fromType: string; toSlot: number; toType: string; count: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetchNui<boolean>('craftItem', data);

      if (response === false) {
        playSound('error');
        return rejectWithValue(response);
      }
    } catch (error) {
      return rejectWithValue(false);
    }
  }
);
