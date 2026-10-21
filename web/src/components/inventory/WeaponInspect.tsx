import React, { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectLeftInventory } from '../../store/inventory';
import {
  endInspect,
  InspectData,
  InspectPin,
  selectInspectSlot,
  setInspectData,
  setInspectPins,
  setInspectWindow,
} from '../../store/inspect';
import { Items } from '../../store/items';
import { Locale } from '../../store/locale';
import { fetchNui } from '../../utils/fetchNui';
import { isEnvBrowser } from '../../utils/misc';
import { playSound } from '../../utils/sound';
import useNuiEvent from '../../hooks/useNuiEvent';
import { getItemUrl, padCount } from '../../helpers';
import SegmentedBar, { durabilityTone } from '../utils/SegmentedBar';
import SectionHead from './SectionHead';

// The browser preview has no game to film: a made-up state, and pins spread over the window.
const mockData = (slot: number, name: string, label: string, metadata: Record<string, any>): InspectData => ({
  slot,
  name,
  label,
  serial: metadata.serial || 'POL-4471-DEMO',
  durability: metadata.durability,
  ammo: metadata.ammo,
  ammoType: '9mm',
  damage: 41,
  fireRate: 62,
  accuracy: 48,
  range: 25,
  slots: [
    {
      id: 'muzzle',
      label: 'Muzzle',
      attached: { name: 'at_suppressor_light', label: 'Suppressor' },
      available: [],
    },
    {
      id: 'flashlight',
      label: 'Flashlight',
      attached: null,
      available: [{ slot: 9, name: 'at_flashlight', label: 'Tactical Flashlight', count: 1 }],
    },
    {
      id: 'magazine',
      label: 'Magazine',
      attached: null,
      available: [{ slot: 10, name: 'at_clip_extended_pistol', label: 'Extended Pistol Clip', count: 2 }],
    },
    { id: 'skin', label: 'Finish', attached: { name: 'at_skin_luxe', label: 'Luxury Finish' }, available: [] },
  ],
});

const MOCK_PIN_SPOTS: Record<string, [number, number]> = {
  muzzle: [0.8, 0.44],
  flashlight: [0.66, 0.58],
  magazine: [0.4, 0.66],
  skin: [0.5, 0.42],
};

// window rect as fractions of the screen, the form the Lua camera aims with
const toScreenRect = (rect: DOMRect) => ({
  x: rect.left / window.innerWidth,
  y: rect.top / window.innerHeight,
  w: rect.width / window.innerWidth,
  h: rect.height / window.innerHeight,
});

const Stat: React.FC<{ label: string; value?: number; tone?: 'accent' | 'warning' | 'danger' }> = ({
  label,
  value,
  tone = 'accent',
}) => {
  if (value === undefined || value === null) return null;
  const percent = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="inspect-stat">
      <span className="field-label">{label}</span>
      <SegmentedBar percent={percent} segments={20} tone={tone} className="inspect-stat-bar" />
      <span className="inspect-stat-value">{padCount(percent)}</span>
    </div>
  );
};

/** The inspect panel that replaces the right column */
const WeaponInspect: React.FC = () => {
  const dispatch = useAppDispatch();
  const { slot, data, selected } = useAppSelector((state) => state.inspect);
  const pockets = useAppSelector(selectLeftInventory);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, lastX: 0 });
  const opened = useRef(false);

  const item = slot !== null ? pockets.items[slot - 1] : undefined;

  const close = () => {
    playSound('toggle');
    fetchNui('inspectClose');
    dispatch(endInspect());
  };

  // Measure the window, then ask the client to film the weapon into it. Later size changes only
  // re-aim the camera.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || slot === null) return;

    const measure = () => {
      const rect = viewport.getBoundingClientRect();
      dispatch(setInspectWindow({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }));
      return rect;
    };

    const frame = requestAnimationFrame(async () => {
      const rect = measure();
      opened.current = true;

      if (isEnvBrowser()) {
        if (!item?.name) return;
        dispatch(setInspectData(mockData(slot, item.name, Items[item.name]?.label || item.name, item.metadata || {})));
        dispatch(
          setInspectPins(
            Object.entries(MOCK_PIN_SPOTS).map(([id, [x, y]]) => ({
              id,
              x: (rect.left + rect.width * x) / window.innerWidth,
              y: (rect.top + rect.height * y) / window.innerHeight,
            }))
          )
        );
        return;
      }

      const state = await fetchNui<InspectData | false>('inspectWeapon', { slot, rect: toScreenRect(rect) });

      if (state) dispatch(setInspectData(state));
      else {
        playSound('error');
        dispatch(endInspect());
      }
    });

    const observer = new ResizeObserver(() => {
      if (!opened.current) return;
      fetchNui('inspectRect', toScreenRect(measure()));
    });
    observer.observe(viewport);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [slot]);

  // The weapon left its slot (moved, dropped, given): nothing left to inspect.
  useEffect(() => {
    if (data && item?.name !== data.name) {
      fetchNui('inspectClose');
      dispatch(endInspect());
    }
  }, [item?.name, data?.name]);

  // Pockets changed: refresh which attachments are on offer.
  useEffect(() => {
    if (!data || isEnvBrowser()) return;

    const timer = setTimeout(async () => {
      const state = await fetchNui<InspectData | false>('inspectState');
      if (state) dispatch(setInspectData(state));
    }, 150);

    return () => clearTimeout(timer);
  }, [pockets.items]);

  const update = async (event: string, payload: unknown, sound: 'drop' | 'cancel') => {
    if (isEnvBrowser()) return playSound(sound);

    const state = await fetchNui<InspectData | false>(event, payload);

    if (state) {
      playSound(sound);
      dispatch(setInspectData(state));
    } else playSound('error');
  };

  const onMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    drag.current = { active: true, lastX: event.clientX };
  };

  const onMouseMove = (event: React.MouseEvent) => {
    if (!drag.current.active) return;

    const delta = event.clientX - drag.current.lastX;
    if (Math.abs(delta) < 1) return;

    drag.current.lastX = event.clientX;
    fetchNui('inspectRotate', { delta: delta * 0.4 });
  };

  const stopDrag = () => {
    drag.current.active = false;
  };

  return (
    <div className="inventory-grid-wrapper inspect-panel">
      <SectionHead
        eyebrow={Locale.ui_inspect || 'Inspect'}
        title={data?.label || Items[item?.name || '']?.label || item?.name || ''}
        bar={false}
        right={
          <button className="tab inspect-close" onClick={close}>
            <span>{Locale.ui_back || 'Back'}</span>
          </button>
        }
      />

      <div
        className="inspect-viewport"
        ref={viewportRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        <span className="inspect-viewport-hint">{Locale.ui_inspect_rotate || 'Drag to rotate'}</span>
      </div>

      {data ? (
        <div className="inspect-details">
          <div className="inspect-stats">
            <Stat
              label={Locale.ui_durability || 'Durability'}
              value={data.durability}
              tone={data.durability !== undefined ? durabilityTone(data.durability) : 'accent'}
            />
            <Stat label={Locale.ui_damage || 'Damage'} value={data.damage} />
            <Stat label={Locale.ui_fire_rate || 'Fire rate'} value={data.fireRate} />
            <Stat label={Locale.ui_accuracy || 'Accuracy'} value={data.accuracy} />
            <Stat label={Locale.ui_range || 'Range'} value={data.range} />
          </div>

          {(data.ammo !== undefined || data.serial) && (
            <div className="inspect-meta">
              {data.ammo !== undefined && (
                <span>
                  <span className="field-label">{Locale.ui_ammo || 'Ammo'}</span>
                  <span className="mono">
                    {data.ammo}
                    {data.ammoType && <span className="dim"> · {data.ammoType}</span>}
                  </span>
                </span>
              )}
              {data.serial && (
                <span>
                  <span className="field-label">{Locale.ui_serial || 'Serial'}</span>
                  <span className="mono">{data.serial}</span>
                </span>
              )}
            </div>
          )}

          <ul className="inspect-attachments">
            {data.slots.map((entry) => (
              <li
                key={entry.id}
                className="inspect-attachment"
                data-active={selected === entry.id}
                data-filled={!!entry.attached}
                onMouseEnter={() => dispatch(selectInspectSlot(entry.id))}
                onMouseLeave={() => dispatch(selectInspectSlot(null))}
              >
                <div className="inspect-attachment-head">
                  <span className="field-label">{entry.label}</span>
                  {entry.attached ? (
                    <>
                      <span className="inspect-attachment-name">{entry.attached.label}</span>
                      <button
                        className="inspect-remove"
                        onClick={() => update('inspectRemove', { component: entry.attached!.name }, 'cancel')}
                      >
                        {Locale.ui_remove || 'Remove'}
                      </button>
                    </>
                  ) : (
                    <span className="inspect-attachment-name dim">{Locale.ui_empty || 'Empty'}</span>
                  )}
                </div>
                {!entry.attached && entry.available.length > 0 && (
                  <div className="inspect-options">
                    {entry.available.map((option) => (
                      <button
                        key={`${option.slot}-${option.name}`}
                        className="inspect-option"
                        onClick={() => update('inspectApply', { slot: option.slot }, 'drop')}
                      >
                        <img src={getItemUrl(option.name)} alt="" />
                        <span>{option.label}</span>
                        {option.count > 1 && <span className="dim">×{option.count}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="hint inspect-loading">{Locale.ui_inspect_loading || 'Preparing weapon…'}</p>
      )}
    </div>
  );
};

/** Darkens the screen everywhere except the inspect window, where the game shows through */
export const InspectWindow: React.FC = () => {
  const rect = useAppSelector((state) => state.inspect.window);
  if (!rect) return null;

  return (
    <div
      className="inspect-window"
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    />
  );
};

/** Labels pinned on the weapon's attachment points, positioned in screen space */
export const InspectPins: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data, pins, window: rect, selected } = useAppSelector((state) => state.inspect);

  useNuiEvent<InspectPin[]>('inspectPins', (next) => dispatch(setInspectPins(next)));

  if (!data || !rect) return null;

  // Labels open away from the window's centre, so they stay inside it, and labels that would
  // overlap on the same side step out a level on a longer leader. Widths are estimated from the
  // text, in rem, which is enough to keep them apart.
  const middle = (rect.top + rect.height / 2) / window.innerHeight;
  const centre = (rect.left + rect.width / 2) / window.innerWidth;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const taken: Record<string, Array<[number, number]>> = {};

  const placed = pins
    .map((pin) => ({ pin, entry: data.slots.find((slot) => slot.id === pin.id) }))
    .filter((placement): placement is { pin: InspectPin; entry: NonNullable<typeof placement.entry> } => !!placement.entry)
    .sort((a, b) => Math.abs(a.pin.y - middle) - Math.abs(b.pin.y - middle))
    .map(({ pin, entry }) => {
      const side = pin.y < middle ? 'up' : 'down';
      const align = pin.x > centre ? 'left' : 'right';
      const text = Math.max(entry.label.length * 0.62, (entry.attached?.label || 'Empty').length * 0.5);
      const width = ((text + 2) * rem) / window.innerWidth;
      const span: [number, number] = align === 'right' ? [pin.x, pin.x + width] : [pin.x - width, pin.x];

      let level = 0;
      while ((taken[`${side}${level}`] || []).some(([start, end]) => span[0] < end && start < span[1])) level++;
      (taken[`${side}${level}`] ||= []).push(span);

      return { pin, entry, side, align, level };
    });

  return (
    <div className="inspect-pins">
      {placed.map(({ pin, entry, side, align, level }) => {
        return (
          <div
            key={pin.id}
            className="inspect-pin"
            data-side={side}
            data-align={align}
            data-active={selected === pin.id}
            data-filled={!!entry.attached}
            style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%`, '--lift': level } as React.CSSProperties}
            onMouseEnter={() => dispatch(selectInspectSlot(pin.id))}
            onMouseLeave={() => dispatch(selectInspectSlot(null))}
          >
            <span className="inspect-pin-dot" />
            <span className="inspect-pin-label">
              <span className="inspect-pin-slot">{entry.label}</span>
              <span className="inspect-pin-item">{entry.attached?.label || Locale.ui_empty || 'Empty'}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default WeaponInspect;
