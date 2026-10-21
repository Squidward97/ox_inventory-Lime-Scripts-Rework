import InventoryGrid from './InventoryGrid';
import CraftingList from './CraftingList';
import ShopList from './ShopList';
import { useAppSelector } from '../../store';
import { selectRightBackpackInventory, selectRightInventory } from '../../store/inventory';
import { getInventoryKind } from '../../helpers';
import { InventoryType } from '../../typings';
import { Locale } from '../../store/locale';

const GROUND_TYPES = ['drop', 'newdrop'];

const RightInventory: React.FC = () => {
  const rightInventory = useAppSelector(selectRightInventory);
  const rightBackpack = useAppSelector(selectRightBackpackInventory);

  if (!rightInventory.type) return null;

  const kind = getInventoryKind(rightInventory.type);
  const isGround = GROUND_TYPES.includes(rightInventory.type);
  const title = isGround || !rightInventory.label ? kind : rightInventory.label;
  const eyebrow = isGround || title === kind ? Locale.ui_nearby || 'Nearby' : kind;
  const hasBackpack = !!rightBackpack.id && rightBackpack.type === InventoryType.RIGHTBACKPACK;

  if (rightInventory.type === InventoryType.SHOP)
    return <ShopList inventory={rightInventory} eyebrow={eyebrow} title={title} />;

  if (rightInventory.type === InventoryType.CRAFTING)
    return <CraftingList inventory={rightInventory} eyebrow={eyebrow} title={title} />;

  return (
    <InventoryGrid
      inventory={rightInventory}
      title={title}
      eyebrow={eyebrow}
      maxRows={hasBackpack ? 3 : 7}
    />
  );
};

export default RightInventory;
