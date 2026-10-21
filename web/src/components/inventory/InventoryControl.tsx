import React, { useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectItemAmount, setItemAmount } from '../../store/inventory';
import { DragSource } from '../../typings';
import { onUse } from '../../dnd/onUse';
import { onGive } from '../../dnd/onGive';
import { Locale } from '../../store/locale';

const formatAmount = (n: number) => (n > 0 ? n.toLocaleString('en-US') : '0');
const digitsOnly = (s: string) => s.replace(/\D/g, '');
const countDigitsBefore = (s: string, index: number) => digitsOnly(s.substring(0, index)).length;

const InventoryControl: React.FC = () => {
  const itemAmount = useAppSelector(selectItemAmount);
  const dispatch = useAppDispatch();

  const [value, setValue] = useState(formatAmount(itemAmount));
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);

  const [{ overUse }, use] = useDrop<DragSource, void, { overUse: boolean }>(() => ({
    accept: 'SLOT',
    collect: (monitor) => ({ overUse: monitor.isOver() && monitor.canDrop() }),
    canDrop: (source) => source.inventory === 'player',
    drop: (source) => {
      source.inventory === 'player' && onUse(source.item);
    },
  }));

  const [{ overGive }, give] = useDrop<DragSource, void, { overGive: boolean }>(() => ({
    accept: 'SLOT',
    collect: (monitor) => ({ overGive: monitor.isOver() && monitor.canDrop() }),
    canDrop: (source) => source.inventory === 'player' || source.inventory === 'backpack',
    drop: (source) => {
      (source.inventory === 'player' || source.inventory === 'backpack') && onGive(source.item, source.inventory);
    },
  }));

  const commitValue = (raw: string, cursorIndex: number) => {
    const digitsBefore = countDigitsBefore(raw, cursorIndex);
    const num = parseInt(digitsOnly(raw), 10) || 0;

    setValue(formatAmount(num));
    dispatch(setItemAmount(num));
    cursorRef.current = digitsBefore;
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    commitValue(event.target.value, event.target.selectionStart ?? 0);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const el = event.currentTarget;
    const pos = el.selectionStart ?? 0;

    if (pos !== el.selectionEnd) return;

    if (event.key === 'Backspace' && el.value[pos - 1] === ',') {
      event.preventDefault();
      commitValue(el.value.slice(0, pos - 2) + el.value.slice(pos), pos - 2);
    } else if (event.key === 'Delete' && el.value[pos] === ',') {
      event.preventDefault();
      commitValue(el.value.slice(0, pos) + el.value.slice(pos + 2), pos);
    }
  };

  useEffect(() => {
    if (!inputRef.current || cursorRef.current === null) return;
    let newPos = 0;
    let count = 0;

    for (let i = 0; i < value.length && count < cursorRef.current; i++) {
      if (/\d/.test(value[i])) count++;
      newPos++;
    }

    inputRef.current.setSelectionRange(newPos, newPos);
    cursorRef.current = null;
  }, [value]);

  return (
    <div className="inventory-control">
      <label className="field-wrapper">
        <span className="field-label">{Locale.ui_amount || 'Amount'}</span>
        <input
          className="field field-mono"
          type="text"
          inputMode="numeric"
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </label>
      <div className="inventory-control-actions">
        <div
          className="tab drop-action"
          data-over={overUse}
          ref={(el) => {
            use(el);
          }}
        >
          <span>{Locale.ui_use || 'Use'}</span>
        </div>
        <div
          className="tab drop-action"
          data-over={overGive}
          ref={(el) => {
            give(el);
          }}
        >
          <span>{Locale.ui_give || 'Give'}</span>
        </div>
      </div>
      <p className="hint inventory-control-hint">
        {Locale.ui_amount_hint || 'Drag an item onto an action. Amount 0 moves the whole stack.'}
      </p>
    </div>
  );
};

export default InventoryControl;
