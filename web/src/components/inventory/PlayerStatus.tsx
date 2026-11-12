import React, { useSyncExternalStore } from 'react';
import { Locale } from '../../store/locale';
import { debugData } from '../../utils/debugData';

// DPS Inventory: the self status panel under the body figure. Fed by modules/status/client.lua.

export interface StatusVital {
  key: string;
  label: string;
  value: number;
  highIsBad?: boolean;
}

export interface StatusLine {
  label: string;
  severity?: number;
}

export interface StatusPayload {
  vitals?: StatusVital[];
  lines?: StatusLine[];
  injuries?: Record<string, { severity: number; label?: string } | null>;
  healthPercent?: number;
}

debugData<StatusPayload>([
  {
    action: 'updateStatus',
    data: {
      healthPercent: 62,
      vitals: [
        { key: 'health', label: 'Health', value: 62 },
        { key: 'armour', label: 'Armour', value: 50 },
        { key: 'hunger', label: 'Food', value: 81 },
        { key: 'thirst', label: 'Water', value: 19 },
        { key: 'stress', label: 'Stress', value: 34, highIsBad: true },
      ],
      injuries: {
        LLEG: { severity: 3, label: 'gunshot' },
        RARM: { severity: 1, label: 'cut' },
      },
      lines: [
        { label: 'Bleeding', severity: 3 },
        { label: 'Left leg: gunshot', severity: 3 },
        { label: 'Right arm: cut', severity: 1 },
        { label: 'Fever', severity: 2 },
      ],
    },
  },
]);

// The first message arrives as the inventory opens, before the equipment panel has mounted, so the
// latest payload is kept here and the panel reads it whenever it appears.
let latest: StatusPayload | null = null;
const watchers = new Set<() => void>();

window.addEventListener('message', (event: MessageEvent) => {
  if (event.data?.action !== 'updateStatus') return;

  latest = event.data.data || null;
  watchers.forEach((notify) => notify());
});

export const getLatestStatus = () => latest;

const watch = (notify: () => void) => {
  watchers.add(notify);
  return () => {
    watchers.delete(notify);
  };
};

// 0 fine, 1 watch, 2 bad: how full a meter is, read the right way round for stress
const vitalLevel = (vital: StatusVital) => {
  const good = vital.highIsBad ? 100 - vital.value : vital.value;

  // armour at zero is normal, not an alarm
  if (vital.key === 'armour') return 0;
  if (good < 25) return 2;
  if (good < 50) return 1;
  return 0;
};

const PlayerStatus: React.FC = () => {
  const status = useSyncExternalStore(watch, () => latest);

  if (!status?.vitals?.length) return null;

  const lines = status.lines || [];

  return (
    <div className="player-status">
      <div className="player-status-vitals">
        {status.vitals.map((vital) => (
          <div className="player-status-vital" key={vital.key} data-level={vitalLevel(vital)}>
            <div className="player-status-vital-head">
              <span>{vital.label}</span>
              <b>{vital.value}</b>
            </div>
            <div className="player-status-bar">
              <i style={{ width: `${Math.max(0, Math.min(100, vital.value))}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="player-status-lines">
        {lines.length === 0 ? (
          <span className="player-status-line" data-severity="0">
            {Locale.ui_status_fine || 'No injuries'}
          </span>
        ) : (
          lines.map((line, index) => (
            <span className="player-status-line" key={`${index}-${line.label}`} data-severity={line.severity || 0}>
              {line.label}
            </span>
          ))
        )}
      </div>
    </div>
  );
};

export default PlayerStatus;
