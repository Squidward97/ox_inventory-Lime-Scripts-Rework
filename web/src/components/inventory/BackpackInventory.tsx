import InventoryGrid from './InventoryGrid';
import { useAppSelector } from '../../store';
import { selectBackpackInventory, selectUtilityConfig } from '../../store/inventory';
import { InventoryType } from '../../typings';
import { Locale } from '../../store/locale';
import { BackpackOutlineIcon } from '../utils/icons/TablerIcons';
import SectionHead from './SectionHead';

const BackpackInventory: React.FC = () => {
  const backpackInventory = useAppSelector(selectBackpackInventory);
  const utility = useAppSelector(selectUtilityConfig);

  if (backpackInventory.id && backpackInventory.type === InventoryType.BACKPACK)
    return (
      <InventoryGrid
        inventory={backpackInventory}
        eyebrow={Locale.ui_backpack || 'Backpack'}
        title={backpackInventory.label || Locale.ui_backpack || 'Backpack'}
        rows={3}
      />
    );

  // Only reserve the space when the server actually has a backpack slot to equip into.
  if (!utility.some((config) => config.role === 'backpack')) return null;

  return (
    <div className="inventory-grid-wrapper">
      <SectionHead eyebrow={Locale.ui_backpack || 'Backpack'} title={Locale.ui_none_equipped || 'None equipped'} />
      <div className="empty-state">
        <BackpackOutlineIcon className="empty-state-icon" />
        <p className="empty-state-title">{Locale.ui_no_backpack || 'No active backpack'}</p>
        <p className="hint">{Locale.ui_no_backpack_hint || 'Equip a backpack to use this space'}</p>
      </div>
    </div>
  );
};

export default BackpackInventory;
