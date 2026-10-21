import InventoryGrid from './InventoryGrid';
import { useAppSelector } from '../../store';
import { selectRightBackpackInventory } from '../../store/inventory';
import { InventoryType } from '../../typings';
import { Locale } from '../../store/locale';

const RightBackpackInventory: React.FC = () => {
  const rightBackpackInventory = useAppSelector(selectRightBackpackInventory);

  if (!rightBackpackInventory.id || rightBackpackInventory.type !== InventoryType.RIGHTBACKPACK) return null;

  return (
    <InventoryGrid
      inventory={rightBackpackInventory}
      title={rightBackpackInventory.label || Locale.ui_backpack || 'Backpack'}
      maxRows={3}
      hint={Locale.ui_hint_take || 'Drag items to your pockets · Ctrl + click to take'}
    />
  );
};

export default RightBackpackInventory;
