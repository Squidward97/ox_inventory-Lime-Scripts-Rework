import InventoryGrid from './InventoryGrid';
import { useAppSelector } from '../../store';
import { selectLeftInventory } from '../../store/inventory';
import { getInventoryKind } from '../../helpers';
import { Locale } from '../../store/locale';

const LeftInventory: React.FC = () => {
  const leftInventory = useAppSelector(selectLeftInventory);

  return (
    <InventoryGrid
      inventory={leftInventory}
      eyebrow={Locale.ui_inventory || 'Inventory'}
      title={getInventoryKind(leftInventory.type)}
      rows={4}
    />
  );
};

export default LeftInventory;
