import React, { useEffect, useRef, useState } from 'react';
import useNuiEvent from '../../hooks/useNuiEvent';
import InventoryControl from './InventoryControl';
import InventoryHotbar from './InventoryHotbar';
import { useAppDispatch, useAppSelector } from '../../store';
import { refreshSlots, setAdditionalMetadata, setupInventory } from '../../store/inventory';
import { useExitListener } from '../../hooks/useExitListener';
import type { Inventory as InventoryProps } from '../../typings';
import RightInventory from './RightInventory';
import LeftInventory from './LeftInventory';
import BackpackInventory from './BackpackInventory';
import RightBackpackInventory from './RightBackpackInventory';
import { PlayerEquipment, QuickAccess } from './PlayerUtility';
import Tooltip from '../utils/Tooltip';
import { closeTooltip } from '../../store/tooltip';
import InventoryContext from './InventoryContext';
import { closeContextMenu } from '../../store/contextMenu';
import Fade from '../utils/transitions/Fade';
import { InventoryKeyHints, InventoryToolbar } from './InventoryChrome';
import { playSound } from '../../utils/sound';
import WeaponInspect, { InspectPins } from './WeaponInspect';
import { endInspect } from '../../store/inspect';

const Inventory: React.FC = () => {
  const [inventoryVisible, setInventoryVisible] = useState(false);
  const dispatch = useAppDispatch();
  const inspecting = useAppSelector((state) => state.inspect.slot !== null);
  const inspectWindow = useAppSelector((state) => state.inspect.window);

  // While inspecting, cut the inspect window out of the backdrop: the screen outline and the window
  // outline as one even-odd polygon, so the window is a hole the game shows through.
  const backdropStyle: React.CSSProperties | undefined =
    inspecting && inspectWindow
      ? (() => {
          const { left, top, width, height } = inspectWindow;
          const right = left + width;
          const bottom = top + height;

          return {
            clipPath: `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${left}px ${top}px, ${left}px ${bottom}px, ${right}px ${bottom}px, ${right}px ${top}px, ${left}px ${top}px)`,
          };
        })()
      : undefined;

  // open and close sounds; the first render (closed) stays silent
  const wasVisible = useRef(inventoryVisible);
  useEffect(() => {
    if (wasVisible.current === inventoryVisible) return;
    wasVisible.current = inventoryVisible;
    playSound(inventoryVisible ? 'open' : 'close');
  }, [inventoryVisible]);

  useNuiEvent<boolean>('setInventoryVisible', setInventoryVisible);
  useNuiEvent<false>('closeInventory', () => {
    setInventoryVisible(false);
    dispatch(closeContextMenu());
    dispatch(closeTooltip());
    // the client ends the inspection itself when the inventory closes
    dispatch(endInspect());
  });
  useExitListener(setInventoryVisible);

  useNuiEvent<{
    leftInventory?: InventoryProps;
    rightInventory?: InventoryProps;
    backpackInventory?: InventoryProps | false;
    rightBackpackInventory?: InventoryProps | false;
  }>('setupInventory', (data) => {
    dispatch(setupInventory(data));
    !inventoryVisible && setInventoryVisible(true);
  });

  useNuiEvent('refreshSlots', (data) => dispatch(refreshSlots(data)));

  useNuiEvent('displayMetadata', (data: Array<{ metadata: string; value: string }>) => {
    dispatch(setAdditionalMetadata(data));
  });

  return (
    <>
      <Fade in={inventoryVisible}>
        <div className="inventory-wrapper" data-inspecting={inspecting}>
          <div className="inventory-backdrop" style={backdropStyle} />
          <InventoryToolbar />
          <div className="inventory-columns">
            <div className="inventory-column inventory-column-left">
              <PlayerEquipment />
              <BackpackInventory />
            </div>
            <div className="inventory-column inventory-column-center">
              <LeftInventory />
              <QuickAccess />
              <InventoryControl />
            </div>
            <div className="inventory-column inventory-column-right">
              {inspecting ? (
                <WeaponInspect />
              ) : (
                <>
                  <RightInventory />
                  <RightBackpackInventory />
                </>
              )}
            </div>
          </div>
          {inspecting && <InspectPins />}
          <InventoryKeyHints />
          <Tooltip />
          <InventoryContext />
        </div>
      </Fade>
      <InventoryHotbar />
    </>
  );
};

export default Inventory;
