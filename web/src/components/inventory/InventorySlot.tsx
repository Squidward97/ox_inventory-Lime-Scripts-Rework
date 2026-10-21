import React, { useCallback, useRef } from 'react';
import { DragSource, Inventory, InventoryType, Slot, SlotWithItem } from '../../typings';
import { useDrag, useDragDropManager, useDrop } from 'react-dnd';
import { store, useAppDispatch, useAppSelector } from '../../store';
import SegmentedBar, { durabilityTone } from '../utils/SegmentedBar';
import { onDrop } from '../../dnd/onDrop';
import { onBuy } from '../../dnd/onBuy';
import {
  canCraftItem,
  canMoveBetweenSlots,
  canPurchaseItem,
  getItemRarity,
  getItemUrl,
  getSlotHotkey,
  getTargetInventory,
  isSlotWithItem,
  isFilteredOut,
  isUtilitySlot,
} from '../../helpers';
import { onUse } from '../../dnd/onUse';
import { Locale } from '../../store/locale';
import { onCraft } from '../../dnd/onCraft';
import useNuiEvent from '../../hooks/useNuiEvent';
import { ItemsPayload } from '../../reducers/refreshSlots';
import { closeTooltip, openTooltip } from '../../store/tooltip';
import { openContextMenu } from '../../store/contextMenu';
import { useMergeRefs } from '@floating-ui/react';

interface SlotProps {
  inventoryId: Inventory['id'];
  inventoryType: Inventory['type'];
  inventoryGroups: Inventory['groups'];
  item: Slot;
}

const InventorySlot: React.ForwardRefRenderFunction<HTMLDivElement, SlotProps> = (
  { item, inventoryId, inventoryType, inventoryGroups },
  ref
) => {
  const manager = useDragDropManager();
  const dispatch = useAppDispatch();
  const timerRef = useRef<number | null>(null);

  const canDrag = useCallback(() => {
    return canPurchaseItem(item, { type: inventoryType, groups: inventoryGroups }) && canCraftItem(item, inventoryType);
  }, [item, inventoryType, inventoryGroups]);

  const [{ isDragging }, drag] = useDrag<DragSource, void, { isDragging: boolean }>(
    () => ({
      type: 'SLOT',
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      item: () =>
        isSlotWithItem(item, inventoryType !== InventoryType.SHOP)
          ? {
              inventory: inventoryType,
              item: {
                name: item.name,
                slot: item.slot,
              },
              image: item?.name && `url(${getItemUrl(item) || 'none'}`,
            }
          : null,
      canDrag,
    }),
    [inventoryType, item]
  );

  const [{ isOver }, drop] = useDrop<DragSource, void, { isOver: boolean }>(
    () => ({
      accept: 'SLOT',
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
      drop: (source) => {
        dispatch(closeTooltip());
        switch (source.inventory) {
          case InventoryType.SHOP:
            onBuy(source, { inventory: inventoryType, item: { slot: item.slot } });
            break;
          case InventoryType.CRAFTING:
            onCraft(source, { inventory: inventoryType, item: { slot: item.slot } });
            break;
          default:
            onDrop(source, { inventory: inventoryType, item: { slot: item.slot } });
            break;
        }
      },
      canDrop: (source) => {
        if (source.item.slot === item.slot && source.inventory === inventoryType) return false;
        if (inventoryType === InventoryType.SHOP || inventoryType === InventoryType.CRAFTING) return false;

        if (source.inventory === InventoryType.SHOP || source.inventory === InventoryType.CRAFTING)
          return inventoryType === InventoryType.PLAYER && !isUtilitySlot(item.slot);

        const { inventory: state } = store.getState();
        const { sourceInventory } = getTargetInventory(state, source.inventory);
        const sourceSlot = sourceInventory.items[source.item.slot - 1];

        if (!sourceSlot) return false;

        return canMoveBetweenSlots(source.inventory, sourceSlot, inventoryType, item);
      },
    }),
    [inventoryType, item]
  );

  useNuiEvent('refreshSlots', (data: { items?: ItemsPayload | ItemsPayload[] }) => {
    if (!isDragging && !data.items) return;
    if (!Array.isArray(data.items)) return;

    const itemSlot = data.items.find(
      (dataItem) => dataItem.item.slot === item.slot && dataItem.inventory === inventoryId
    );

    if (!itemSlot) return;

    manager.dispatch({ type: 'dnd-core/END_DRAG' });
  });

  const connectRef = (element: HTMLDivElement | null) => {
    if (!element) return;
    drag(drop(element));
  };

  const handleContext = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (
      (inventoryType !== InventoryType.PLAYER && inventoryType !== InventoryType.BACKPACK) ||
      !isSlotWithItem(item)
    )
      return;

    dispatch(openContextMenu({ item, coords: { x: event.clientX, y: event.clientY }, inventoryType }));
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    dispatch(closeTooltip());
    if (timerRef.current) clearTimeout(timerRef.current);
    if (event.ctrlKey && isSlotWithItem(item) && inventoryType !== 'shop' && inventoryType !== 'crafting') {
      onDrop({ item: item, inventory: inventoryType });
    } else if (event.altKey && isSlotWithItem(item)) {
      if (inventoryType === 'player') {
        onUse(item);
      } else if (inventoryType === InventoryType.BACKPACK || inventoryType === InventoryType.RIGHTBACKPACK) {
        onDrop({ item: item, inventory: inventoryType }, { inventory: InventoryType.PLAYER, item: { slot: 0 } });
      }
    }
  };

  const refs = useMergeRefs([connectRef, ref]);
  const hotkey = getSlotHotkey(item.slot, inventoryType);
  const unavailable =
    !canPurchaseItem(item, { type: inventoryType, groups: inventoryGroups }) || !canCraftItem(item, inventoryType);
  const filters = useAppSelector((state) => state.filters);
  const dimmed = isFilteredOut(item, filters);

  return (
    <div
      ref={refs}
      onContextMenu={handleContext}
      onClick={handleClick}
      className="inventory-slot"
      data-filled={isSlotWithItem(item)}
      data-over={isOver}
      data-unavailable={unavailable}
      data-dimmed={dimmed}
      data-rarity={isSlotWithItem(item) ? getItemRarity(item) : undefined}
      style={{
        opacity: isDragging ? 0.35 : undefined,
        backgroundImage: `url(${item?.name ? getItemUrl(item as SlotWithItem) : 'none'}`,
      }}
    >
      {hotkey !== undefined && <span className="slot-badge">{hotkey}</span>}
      {isSlotWithItem(item) && (
        <div
          className="item-slot-wrapper"
          onMouseEnter={() => {
            timerRef.current = window.setTimeout(() => {
              dispatch(openTooltip({ item, inventoryType }));
            }, 500) as unknown as number;
          }}
          onMouseLeave={() => {
            dispatch(closeTooltip());
            if (timerRef.current) {
              clearTimeout(timerRef.current);
              timerRef.current = null;
            }
          }}
        >
          <div className="item-slot-header">
            {inventoryType === 'shop' && item?.price !== undefined && item.price > 0 && (
              <>
                {item.currency && item.currency !== 'money' && item.currency !== 'black_money' ? (
                  <span className="item-slot-price">
                    <img src={getItemUrl(item.currency)} alt="" />
                    {item.price.toLocaleString('en-us')}
                  </span>
                ) : (
                  <span className="item-slot-price" data-currency={item.currency || 'money'}>
                    {Locale.$ || '$'}
                    {item.price.toLocaleString('en-us')}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="item-slot-footer">
            {inventoryType !== 'shop' && item?.durability !== undefined ? (
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
  );
};

export default React.memo(React.forwardRef(InventorySlot));
