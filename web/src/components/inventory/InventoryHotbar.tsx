import React, { useState } from 'react';
import { getItemRarity, getItemUrl, isSlotWithItem } from '../../helpers';
import useNuiEvent from '../../hooks/useNuiEvent';
import SegmentedBar, { durabilityTone } from '../utils/SegmentedBar';
import { useAppSelector } from '../../store';
import { selectLeftInventory, selectUtilityConfig } from '../../store/inventory';
import { SlotWithItem } from '../../typings';
import SlideUp from '../utils/transitions/SlideUp';

const InventoryHotbar: React.FC = () => {
  const [hotbarVisible, setHotbarVisible] = useState(false);
  const leftInventory = useAppSelector(selectLeftInventory);
  const utility = useAppSelector(selectUtilityConfig);

  const hotkeySlots = utility.filter((config) => config.hotkey !== undefined);
  const items = hotkeySlots.length
    ? hotkeySlots
        .slice()
        .sort((a, b) => (a.hotkey || 0) - (b.hotkey || 0))
        .map((config) => leftInventory.items[config.slot - 1])
        .filter(Boolean)
    : leftInventory.items.slice(0, 5);
  const hotkeyForSlot = (slot: number) =>
    hotkeySlots.length ? hotkeySlots.find((config) => config.slot === slot)?.hotkey : slot;

  //stupid fix for timeout
  const [handle, setHandle] = useState<ReturnType<typeof setTimeout>>();
  useNuiEvent('toggleHotbar', () => {
    if (hotbarVisible) {
      setHotbarVisible(false);
    } else {
      if (handle) clearTimeout(handle);
      setHotbarVisible(true);
      setHandle(setTimeout(() => setHotbarVisible(false), 3000));
    }
  });

  return (
    <SlideUp in={hotbarVisible}>
      <div className="hotbar-container">
        <div className="hotbar-row">
          {items.map((item) => (
            <div
              className="inventory-slot hotbar-item-slot"
              key={`hotbar-${item.slot}`}
              data-filled={isSlotWithItem(item)}
              data-rarity={isSlotWithItem(item) ? getItemRarity(item) : undefined}
              style={{
                backgroundImage: `url(${item?.name ? getItemUrl(item as SlotWithItem) : 'none'}`,
              }}
            >
              <span className="slot-badge">{hotkeyForSlot(item.slot)}</span>
              {isSlotWithItem(item) && (
                <div className="item-slot-wrapper">
                  <span />
                  <div className="item-slot-footer">
                    {item.durability !== undefined ? (
                      <SegmentedBar
                        percent={item.durability}
                        segments={10}
                        tone={durabilityTone(item.durability)}
                        className="item-slot-durability"
                      />
                    ) : (
                      <span />
                    )}
                    {item.count > 0 && <span className="item-slot-count">x{item.count.toLocaleString('en-us')}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </SlideUp>
  );
};

export default InventoryHotbar;
