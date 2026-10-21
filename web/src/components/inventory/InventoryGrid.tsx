import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Inventory, InventoryType } from '../../typings';
import InventorySlot from './InventorySlot';
import { getTotalWeight } from '../../helpers';
import { useAppSelector } from '../../store';
import { selectUtilityConfig } from '../../store/inventory';
import { useIntersection } from '../../hooks/useIntersection';
import { ChevronDownIcon, WeightIcon } from '../utils/icons/TablerIcons';
import SegmentedBar, { weightTone } from '../utils/SegmentedBar';

const PAGE_SIZE = 30;

const formatKg = (grams: number) =>
  (grams / 1000).toLocaleString('en-us', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

interface Props {
  inventory: Inventory;
  title: string;
  /** Small muted label after the title, e.g. the inventory kind */
  tag?: string;
  /** Fixed number of visible rows; the rest scrolls */
  rows?: number;
  /** Grow with the content up to this many rows */
  maxRows?: number;
  hint?: string;
}

const InventoryGrid: React.FC<Props> = ({ inventory, title, tag, rows, maxRows, hint }) => {
  const weight = useMemo(
    () => (inventory.maxWeight !== undefined ? Math.floor(getTotalWeight(inventory.items) * 1000) / 1000 : 0),
    [inventory.maxWeight, inventory.items]
  );
  const [page, setPage] = useState(0);
  const containerRef = useRef(null);
  const { ref, entry } = useIntersection({ threshold: 0.5 });
  const isBusy = useAppSelector((state) => state.inventory.isBusy);
  const utility = useAppSelector(selectUtilityConfig);

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(false);
  }, [inventory.id]);

  const visibleItems = useMemo(
    () =>
      inventory.type === InventoryType.PLAYER && utility.length > 0
        ? inventory.items.filter((item) => !utility.some((config) => config.slot === item.slot))
        : inventory.items,
    [inventory.items, inventory.type, utility]
  );

  useEffect(() => {
    if (entry && entry.isIntersecting) {
      setPage((prev) => ++prev);
    }
  }, [entry]);

  const weightPercent = inventory.maxWeight ? (weight / inventory.maxWeight) * 100 : 0;
  const hasWeight = inventory.maxWeight !== undefined && inventory.maxWeight > 0;

  return (
    <div
      className="inventory-grid-wrapper"
      data-inventorytype={inventory.type}
      data-collapsed={collapsed}
      data-sizing={rows ? 'fixed' : 'grow'}
      style={
        {
          pointerEvents: isBusy ? 'none' : 'auto',
          '--grid-rows': rows,
          '--grid-max-rows': maxRows,
        } as React.CSSProperties
      }
    >
      <div className="section-header" data-has-bar={hasWeight}>
        <h2 className="section-title">{title}</h2>
        {tag && <span className="section-tag">{tag}</span>}
        <div className="section-header-right">
          {hasWeight && (
            <span className="section-weight" data-tone={weightTone(weightPercent)}>
              <WeightIcon className="icon" />
              {formatKg(weight)} / {formatKg(inventory.maxWeight!)} kg
            </span>
          )}
          <button
            className="inventory-grid-collapse-button"
            data-collapsed={collapsed}
            onClick={() => setCollapsed((previous) => !previous)}
          >
            <ChevronDownIcon />
          </button>
        </div>
      </div>
      {hasWeight && (
        <SegmentedBar percent={weightPercent} segments={40} tone={weightTone(weightPercent)} className="section-bar" />
      )}
      <div className="inventory-grid-container" ref={containerRef}>
        {visibleItems.slice(0, (page + 1) * PAGE_SIZE).map((item, index) => (
          <InventorySlot
            key={`${inventory.type}-${inventory.id}-${item.slot}`}
            item={item}
            ref={index === (page + 1) * PAGE_SIZE - 1 ? ref : null}
            inventoryType={inventory.type}
            inventoryGroups={inventory.groups}
            inventoryId={inventory.id}
          />
        ))}
      </div>
      {hint && !collapsed && <p className="hint section-hint">{hint}</p>}
    </div>
  );
};

export default InventoryGrid;
