export type ItemData = {
  name: string;
  label: string;
  stack: boolean;
  usable: boolean;
  close: boolean;
  count: number;
  description?: string;
  buttons?: string[];
  ammoName?: string;
  image?: string;
  category?: string;
  rarity?: string;
  /** the item has a `prop` model, so it can be inspected in 3D */
  inspect?: boolean;
};
