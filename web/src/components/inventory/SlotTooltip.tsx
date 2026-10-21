import { Inventory, SlotWithItem } from '../../typings';
import React, { Fragment, useMemo } from 'react';
import { Items } from '../../store/items';
import { Locale } from '../../store/locale';
import { useAppSelector } from '../../store';
import { ClockIcon } from '../utils/icons/TablerIcons';
import { formatWeight, getInventoryKind, getItemUrl, padCount } from '../../helpers';
import Markdown from '../utils/Markdown';
import SegmentedBar, { durabilityTone } from '../utils/SegmentedBar';

const StatusRow: React.FC<{ label: string; mono?: boolean; children: React.ReactNode }> = ({
  label,
  mono,
  children,
}) => (
  <div className="tooltip-status-row">
    <span className="field-label">{label}</span>
    <span className={mono ? 'tooltip-status-value mono' : 'tooltip-status-value'}>{children}</span>
  </div>
);

const SlotTooltip: React.ForwardRefRenderFunction<
  HTMLDivElement,
  { item: SlotWithItem; inventoryType: Inventory['type']; style: React.CSSProperties }
> = ({ item, inventoryType, style }, ref) => {
  const additionalMetadata = useAppSelector((state) => state.inventory.additionalMetadata);
  const itemData = useMemo(() => Items[item.name], [item]);
  const ingredients = useMemo(() => {
    if (!item.ingredients) return null;
    return Object.entries(item.ingredients).sort((a, b) => a[1] - b[1]);
  }, [item]);
  const description = item.metadata?.description || itemData?.description;
  const ammoName = itemData?.ammoName && Items[itemData?.ammoName]?.label;
  const isCrafting = inventoryType === 'crafting';
  const kind = isCrafting
    ? Locale.ui_kind_recipe || 'Recipe'
    : item.name.startsWith('WEAPON_')
      ? Locale.ui_weapon || 'Weapon'
      : Locale.ui_kind_item || 'Item';
  const context = item.metadata?.type || getInventoryKind(inventoryType);
  const name = item.metadata?.label || itemData?.label || item.name;

  const extraMetadata = additionalMetadata.filter(
    (data: { metadata: string; value: string }) => item.metadata && item.metadata[data.metadata]
  );
  const components: string[] = item.metadata?.components || [];
  const hasStatus =
    !isCrafting &&
    (item.durability !== undefined ||
      item.metadata?.ammo !== undefined ||
      ammoName ||
      item.metadata?.serial ||
      components.length > 0 ||
      item.metadata?.weapontint ||
      extraMetadata.length > 0);

  return (
    <div className="tooltip-wrapper cut-sm" ref={ref} style={style}>
      <div className="tooltip-eyebrow-row">
        <span className="tooltip-kind">{kind}</span>
        <span className="dim-slash">/</span>
        <span className="tooltip-context">{context}</span>
        <span className="tooltip-meta">
          {isCrafting ? (
            <>
              <ClockIcon className="icon" />
              {((item.duration !== undefined ? item.duration : 3000) / 1000).toLocaleString('en-us')}s
            </>
          ) : (
            item.weight > 0 && formatWeight(item.weight)
          )}
        </span>
      </div>

      <div className="tooltip-name">
        <span className="slash" />
        <span>{name}</span>
        {item.count > 1 && <span className="tooltip-count">×{item.count.toLocaleString('en-us')}</span>}
      </div>

      {description && <Markdown content={description} className="tooltip-description" />}

      {hasStatus && (
        <div className="tooltip-status">
          {item.durability !== undefined && (
            <div className="tooltip-durability">
              <div className="tooltip-status-row">
                <span className="field-label">{Locale.ui_durability || 'Durability'}</span>
                <span className="tooltip-status-value mono">{padCount(Math.trunc(item.durability))}%</span>
              </div>
              <SegmentedBar percent={item.durability} segments={20} tone={durabilityTone(item.durability)} />
            </div>
          )}
          {item.metadata?.ammo !== undefined && (
            <StatusRow label={Locale.ui_ammo || 'Ammo'} mono>
              {item.metadata.ammo}
            </StatusRow>
          )}
          {ammoName && <StatusRow label={Locale.ammo_type || 'Ammo type'}>{ammoName}</StatusRow>}
          {item.metadata?.serial && (
            <StatusRow label={Locale.ui_serial || 'Serial'} mono>
              {item.metadata.serial}
            </StatusRow>
          )}
          {components.length > 0 && (
            <StatusRow label={Locale.ui_components || 'Components'}>
              {components.map((component) => Items[component]?.label || component).join(', ')}
            </StatusRow>
          )}
          {item.metadata?.weapontint && (
            <StatusRow label={Locale.ui_tint || 'Tint'}>{item.metadata.weapontint}</StatusRow>
          )}
          {extraMetadata.map((data: { metadata: string; value: string }, index: number) => (
            <Fragment key={`metadata-${index}`}>
              <StatusRow label={data.value}>{item.metadata![data.metadata]}</StatusRow>
            </Fragment>
          ))}
        </div>
      )}

      {isCrafting && ingredients && ingredients.length > 0 && (
        <div className="tooltip-status">
          <span className="field-label">{Locale.ui_ingredients || 'Ingredients'}</span>
          <ul className="tooltip-ingredients divided">
            {ingredients.map(([ingredient, count]) => (
              <li className="tooltip-ingredient" key={`ingredient-${ingredient}`}>
                <img src={ingredient ? getItemUrl(ingredient) : 'none'} alt="" />
                <span className="tooltip-ingredient-name">{Items[ingredient]?.label || ingredient}</span>
                <span className="tooltip-ingredient-count">
                  {count >= 1 ? `×${padCount(count)}` : count === 0 ? Locale.ui_tool || 'Tool' : `${count * 100}%`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default React.forwardRef(SlotTooltip);
