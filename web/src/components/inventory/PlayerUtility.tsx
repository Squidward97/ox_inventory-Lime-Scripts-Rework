import React from 'react';
import { useAppSelector } from '../../store';
import { selectLeftInventory, selectUtilityConfig } from '../../store/inventory';
import { isSlotWithItem } from '../../helpers';
import { Locale } from '../../store/locale';
import { InventoryType, UtilitySlotConfig } from '../../typings';
import InventorySlot from './InventorySlot';
import SectionHead, { SectionCount } from './SectionHead';
import BodySvg from '../utils/BodySvg';
import { BackpackIcon, ParachuteIcon, PhoneIcon, PistolIcon, VestIcon } from '../utils/icons/UtilityIcons';
import { IdIcon, WalletIcon } from '../utils/icons/TablerIcons';

const RoleIcon: React.FC<{ role: string }> = ({ role }) => {
  switch (role) {
    case 'backpack':
      return <BackpackIcon />;
    case 'armour':
      return <VestIcon />;
    case 'phone':
      return <PhoneIcon />;
    case 'parachute':
      return <ParachuteIcon />;
    case 'weapon':
    case 'weapon2':
      return <PistolIcon />;
    case 'radio':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 2h2v3h6a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2V2zm0 5v3h8V7H8zm1 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm5 0h2v1.5h-2V12zm0 3h2v1.5h-2V15z" />
        </svg>
      );
    case 'utility':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h7v7H4V4zm2 2v3h3V6H6zm7-2h7v7h-7V4zm2 2v3h3V6h-3zM4 13h7v7H4v-7zm2 2v3h3v-3H6zm10-2h2v3h3v2h-3v3h-2v-3h-3v-2h3v-3z" />
        </svg>
      );
    case 'wallet':
      return <WalletIcon />;
    case 'identity':
    case 'id':
      return <IdIcon />;
    case 'hotkey':
      return null;
    default:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8" opacity="0.6" />
        </svg>
      );
  }
};

const slotLabel = (config: UtilitySlotConfig) => {
  if (config.label) return config.label;

  const label = Locale[`ui_${config.role}`] || config.role;

  return config.hotkey !== undefined ? `${label} ${config.hotkey}` : label;
};

const UtilityCell: React.FC<{ config: UtilitySlotConfig }> = ({ config }) => {
  const leftInventory = useAppSelector(selectLeftInventory);
  const item = leftInventory.items[config.slot - 1];

  if (!item) return null;

  return (
    <div className="player-utility-slot" data-role={config.role}>
      {!isSlotWithItem(item) && config.hotkey === undefined && (
        <div className="player-utility-placeholder">
          <RoleIcon role={config.role} />
          <span>{slotLabel(config)}</span>
        </div>
      )}
      <InventorySlot
        item={item}
        inventoryType={leftInventory.type}
        inventoryGroups={leftInventory.groups}
        inventoryId={leftInventory.id}
      />
    </div>
  );
};

const useUtilityReady = () => {
  const leftInventory = useAppSelector(selectLeftInventory);
  const utility = useAppSelector(selectUtilityConfig);

  return { leftInventory, utility, ready: utility.length > 0 && leftInventory.type === InventoryType.PLAYER && leftInventory.items.length > 0 };
};

export const PlayerEquipment: React.FC = () => {
  const { leftInventory, utility, ready } = useUtilityReady();

  if (!ready) return null;

  const gearSlots = utility.filter((config) => config.role !== 'hotkey');
  const half = Math.ceil(gearSlots.length / 2);
  const equipped = gearSlots.filter((config) => isSlotWithItem(leftInventory.items[config.slot - 1] || { slot: 0 })).length;

  return (
    <div className="player-utility-wrapper">
      <SectionHead
        eyebrow={Locale.ui_loadout || 'Loadout'}
        title={Locale.ui_equipment || 'Equipment'}
        bar={false}
        right={<SectionCount value={equipped} total={gearSlots.length} unit={Locale.ui_equipped_short || 'worn'} />}
      />
      <div className="player-utility-body">
        <div className="player-utility-column">
          {gearSlots.slice(0, half).map((config) => (
            <UtilityCell config={config} key={`utility-${config.slot}`} />
          ))}
        </div>
        <div className="player-utility-figure">
          <BodySvg />
        </div>
        <div className="player-utility-column">
          {gearSlots.slice(half).map((config) => (
            <UtilityCell config={config} key={`utility-${config.slot}`} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const QuickAccess: React.FC = () => {
  const { leftInventory, utility, ready } = useUtilityReady();

  if (!ready) return null;

  const quickSlots = utility
    .filter((config) => config.role === 'hotkey')
    .sort((a, b) => (a.hotkey || 0) - (b.hotkey || 0));

  if (!quickSlots.length) return null;

  const loaded = quickSlots.filter((config) => isSlotWithItem(leftInventory.items[config.slot - 1] || { slot: 0 })).length;

  return (
    <div className="player-utility-quick">
      <SectionHead
        eyebrow={Locale.ui_hotkeys || 'Hotkeys'}
        title={Locale.ui_quick_access || 'Quick access'}
        bar={false}
        right={<SectionCount value={loaded} total={quickSlots.length} unit={Locale.ui_loaded || 'loaded'} />}
      />
      <div className="player-utility-row">
        {quickSlots.map((config) => (
          <UtilityCell config={config} key={`utility-${config.slot}`} />
        ))}
      </div>
    </div>
  );
};
