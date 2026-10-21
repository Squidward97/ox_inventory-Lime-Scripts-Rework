//import toast from "react-hot-toast";
import { fetchNui } from '../utils/fetchNui';
import { Slot } from '../typings';
import { playSound } from '../utils/sound';

export const onUse = (item: Slot) => {
  //toast.success(`Use ${item.name}`);
  playSound('use');
  fetchNui('useItem', item.slot);
};
