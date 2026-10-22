import { onUse } from '../../dnd/onUse';
import { onGive } from '../../dnd/onGive';
import { onDrop } from '../../dnd/onDrop';
import { Items } from '../../store/items';
import { fetchNui } from '../../utils/fetchNui';
import { Locale } from '../../store/locale';
import { formatWeight, getItemRarity, getItemUrl, isBackpackItem, isSlotWithItem, isUtilitySlot } from '../../helpers';
import { setClipboard } from '../../utils/setClipboard';
import { useAppDispatch, useAppSelector } from '../../store';
import { toggleFavourite } from '../../store/filters';
import React from 'react';
import { Menu, MenuItem } from '../utils/menu/Menu';
import { InventoryType, SlotWithItem } from '../../typings';
import { startInspect } from '../../store/inspect';
import { playSound } from '../../utils/sound';
import {
  BackpackOutlineIcon,
  CopyIcon,
  CubeIcon,
  DotIcon,
  DropIcon,
  PlayIcon,
  SendIcon,
  StarIcon,
  ToolIcon,
  UnloadIcon,
} from '../utils/icons/TablerIcons';

interface DataProps {
  action: string;
  component?: string;
  slot?: number;
  serial?: string;
  id?: number;
}

interface Button {
  label: string;
  index: number;
  group?: string;
}

interface Group {
  groupName: string | null;
  buttons: ButtonWithIndex[];
}

interface ButtonWithIndex extends Button {
  index: number;
}

interface GroupedButtons extends Array<Group> {}

const InventoryContext: React.FC = () => {
  const contextMenu = useAppSelector((state) => state.contextMenu);
  const favourites = useAppSelector((state) => state.filters.favourites);
  const dispatch = useAppDispatch();
  const item = contextMenu.item;
  const inventoryType = contextMenu.inventoryType || InventoryType.PLAYER;

  const isBag = item ? isBackpackItem(item.name) : false;
  const showUse = inventoryType !== InventoryType.BACKPACK && !isBag;
  const canOpenBag = !!item && inventoryType === InventoryType.PLAYER && isBag && !isUtilitySlot(item.slot);
  // the client films weapons, and items with a `prop`, from the player's own inventory
  // (modules/weapon/inspect.lua)
  const canInspect =
    !!item &&
    inventoryType === InventoryType.PLAYER &&
    (item.name.toUpperCase().startsWith('WEAPON_') || !!Items[item.name]?.inspect);

  const handleClick = (data: DataProps) => {
    if (!item) return;

    switch (data && data.action) {
      case 'use':
        onUse({ name: item.name, slot: item.slot });
        break;
      case 'give':
        onGive({ name: item.name, slot: item.slot }, inventoryType);
        break;
      case 'drop':
        isSlotWithItem(item) && onDrop({ item: item, inventory: inventoryType });
        break;
      case 'openBackpack':
        fetchNui('openBagPanel', item.slot);
        break;
      case 'inspect':
        playSound('toggle');
        dispatch(startInspect(item.slot));
        break;
      case 'remove':
        fetchNui('removeComponent', { component: data?.component, slot: data?.slot });
        break;
      case 'removeAmmo':
        fetchNui('removeAmmo', item.slot);
        break;
      case 'copy':
        setClipboard(data.serial || '');
        break;
      case 'favourite':
        dispatch(toggleFavourite(item.name));
        break;
      case 'custom':
        fetchNui('useButton', { id: (data?.id || 0) + 1, slot: item.slot });
        break;
    }
  };

  const groupButtons = (buttons: any): GroupedButtons => {
    return buttons.reduce((groups: Group[], button: Button, index: number) => {
      if (button.group) {
        const groupIndex = groups.findIndex((group) => group.groupName === button.group);
        if (groupIndex !== -1) {
          groups[groupIndex].buttons.push({ ...button, index });
        } else {
          groups.push({
            groupName: button.group,
            buttons: [{ ...button, index }],
          });
        }
      } else {
        groups.push({
          groupName: null,
          buttons: [{ ...button, index }],
        });
      }
      return groups;
    }, []);
  };

  const favourite = !!item && favourites.includes(item.name);
  const hasAmmo = !!item && item.metadata?.ammo > 0;
  const serial: string | undefined = item?.metadata?.serial;
  const components: string[] = (item && item.metadata?.components) || [];
  const buttons = (item && Items[item.name]?.buttons) || [];
  const hasList = canInspect || canOpenBag || hasAmmo || !!serial || components.length > 0 || buttons.length > 0;

  return (
    <>
      <Menu>
        {item && isSlotWithItem(item) && <ContextHeader item={item} />}

        {/* the everyday actions as a row of tiles; everything particular to the item is listed below */}
        <div className="context-menu-tiles">
          {showUse && (
            <MenuItem
              variant="tile"
              icon={<PlayIcon />}
              onClick={() => handleClick({ action: 'use' })}
              label={Locale.ui_use || 'Use'}
            />
          )}
          <MenuItem
            variant="tile"
            icon={<SendIcon />}
            onClick={() => handleClick({ action: 'give' })}
            label={Locale.ui_give || 'Give'}
          />
          <MenuItem
            variant="tile"
            tone="danger"
            icon={<DropIcon />}
            onClick={() => handleClick({ action: 'drop' })}
            label={Locale.ui_drop || 'Drop'}
          />
          {item && (
            <MenuItem
              variant="tile"
              on={favourite}
              icon={<StarIcon />}
              title={favourite ? Locale.ui_unfavourite || 'Remove favourite' : undefined}
              onClick={() => handleClick({ action: 'favourite' })}
              label={Locale.ui_favourite || 'Favourite'}
            />
          )}
        </div>

        {hasList && <div className="context-menu-divider" />}

        {canInspect && (
          <MenuItem
            icon={<CubeIcon />}
            onClick={() => handleClick({ action: 'inspect' })}
            label={Locale.ui_inspect || 'Inspect'}
          />
        )}
        {canOpenBag && (
          <MenuItem
            icon={<BackpackOutlineIcon />}
            onClick={() => handleClick({ action: 'openBackpack' })}
            label={Locale.ui_open_backpack || 'Open Backpack'}
          />
        )}
        {hasAmmo && (
          <MenuItem
            icon={<UnloadIcon />}
            onClick={() => handleClick({ action: 'removeAmmo' })}
            label={Locale.ui_remove_ammo}
          />
        )}
        {serial && (
          <MenuItem
            icon={<CopyIcon />}
            onClick={() => handleClick({ action: 'copy', serial })}
            label={Locale.ui_copy}
          />
        )}
        {item && components.length > 0 && (
          <Menu label={Locale.ui_removeattachments} icon={<ToolIcon />}>
            {components.map((component, index) => (
              <MenuItem
                key={index}
                icon={<DotIcon />}
                onClick={() => handleClick({ action: 'remove', component, slot: item.slot })}
                label={Items[component]?.label || ''}
              />
            ))}
          </Menu>
        )}
        {buttons.length > 0 &&
          groupButtons(buttons).map((group: Group, index: number) => (
            <React.Fragment key={index}>
              {group.groupName ? (
                <Menu label={group.groupName} icon={<DotIcon />}>
                  {group.buttons.map((button: Button) => (
                    <MenuItem
                      key={button.index}
                      icon={<DotIcon />}
                      onClick={() => handleClick({ action: 'custom', id: button.index })}
                      label={button.label}
                    />
                  ))}
                </Menu>
              ) : (
                group.buttons.map((button: Button) => (
                  <MenuItem
                    key={button.index}
                    icon={<DotIcon />}
                    onClick={() => handleClick({ action: 'custom', id: button.index })}
                    label={button.label}
                  />
                ))
              )}
            </React.Fragment>
          ))}
      </Menu>
    </>
  );
};

/** The item the menu is for: its image, name, amount and weight, tinted by its rarity */
const ContextHeader: React.FC<{ item: SlotWithItem }> = ({ item }) => {
  const name = item.metadata?.label || Items[item.name]?.label || item.name;
  const image = getItemUrl(item);
  const details = [item.count > 1 ? `×${item.count}` : null, item.weight > 0 ? formatWeight(item.weight) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="context-menu-header" data-rarity={getItemRarity(item)}>
      <div
        className="context-menu-thumb"
        style={{ '--thumb': image ? `url(${image})` : 'none' } as React.CSSProperties}
      />
      <div className="context-menu-heading">
        <span className="context-menu-title">{name}</span>
        {details && <span className="context-menu-details">{details}</span>}
      </div>
    </div>
  );
};

export default InventoryContext;
