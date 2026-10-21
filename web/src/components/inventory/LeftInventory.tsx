import InventoryGrid from './InventoryGrid';
import { useAppSelector } from '../../store';
import { selectLeftInventory } from '../../store/inventory';
import { getInventoryKind } from '../../helpers';

const LeftInventory: React.FC = () => {
  const leftInventory = useAppSelector(selectLeftInventory);

  return <InventoryGrid inventory={leftInventory} title={getInventoryKind(leftInventory.type)} rows={4} />;
};

export default LeftInventory;
