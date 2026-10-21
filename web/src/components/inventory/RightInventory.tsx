import InventoryGrid from './InventoryGrid';
import { useAppSelector } from '../../store';
import { selectRightBackpackInventory, selectRightInventory } from '../../store/inventory';
import { getInventoryKind } from '../../helpers';
import { InventoryType } from '../../typings';
import { Locale } from '../../store/locale';

const GROUND_TYPES = ['drop', 'newdrop'];

const hintFor = (type: string) => {
  switch (type) {
    case InventoryType.SHOP:
      return Locale.ui_hint_shop || 'Drag items to your pockets to buy';
    case InventoryType.CRAFTING:
      return Locale.ui_hint_crafting || 'Drag a recipe to your pockets to craft';
    default:
      return Locale.ui_hint_take || 'Drag items to your pockets · Ctrl + click to take';
  }
};

const RightInventory: React.FC = () => {
  const rightInventory = useAppSelector(selectRightInventory);
  const rightBackpack = useAppSelector(selectRightBackpackInventory);

  if (!rightInventory.type) return null;

  const kind = getInventoryKind(rightInventory.type);
  const isGround = GROUND_TYPES.includes(rightInventory.type);
  const title = isGround || !rightInventory.label ? kind : rightInventory.label;
  const hasBackpack = !!rightBackpack.id && rightBackpack.type === InventoryType.RIGHTBACKPACK;

  return (
    <InventoryGrid
      inventory={rightInventory}
      title={title}
      tag={title !== kind ? kind : undefined}
      maxRows={hasBackpack ? 4 : 7}
      hint={hasBackpack ? undefined : hintFor(rightInventory.type)}
    />
  );
};

export default RightInventory;
