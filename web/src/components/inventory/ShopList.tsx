import React, { useEffect, useMemo, useState } from 'react';
import { Items } from '../../store/items';
import { Locale } from '../../store/locale';
import { Inventory, SlotWithItem } from '../../typings';
import { canPurchaseItem, formatWeight, getItemLabel, getItemUrl, isSlotWithItem, padCount } from '../../helpers';
import { fetchNui } from '../../utils/fetchNui';
import { isEnvBrowser } from '../../utils/misc';
import InventorySlot from './InventorySlot';
import SectionHead from './SectionHead';
import { MinusIcon } from '../utils/icons/TablerIcons';

type Method = 'cash' | 'card';
type Cart = Record<number, number>;
interface Balance {
  card: boolean;
  bank?: number;
}

const PlusIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M12 5l0 14" />
    <path d="M5 12l14 0" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M18 6l-12 12" />
    <path d="M6 6l12 12" />
  </svg>
);

const isCash = (currency?: string) => !currency || currency === 'money' || currency === 'black_money';

// Price in the shop's currency: cash, dirty cash (red) or another item shown by its icon.
const Price: React.FC<{ amount: number; currency?: string }> = ({ amount, currency }) =>
  isCash(currency) ? (
    <span className="shop-price" data-currency={currency || 'money'}>
      {Locale.$ || '$'}
      {amount.toLocaleString('en-us')}
    </span>
  ) : (
    <span className="shop-price" data-currency="item">
      <img src={getItemUrl(currency!)} alt="" />
      {amount.toLocaleString('en-us')}
      <span className="shop-price-unit">{Items[currency!]?.label || currency}</span>
    </span>
  );

const Stepper: React.FC<{ value: number; min: number; max: number; onChange: (value: number) => void }> = ({
  value,
  min,
  max,
  onChange,
}) => (
  <div className="card-stepper">
    <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
      <MinusIcon />
    </button>
    <span className="card-stepper-value">{padCount(value)}</span>
    <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
      <PlusIcon />
    </button>
  </div>
);

const ShopCard: React.FC<{
  item: SlotWithItem;
  inventory: Inventory;
  inCart: number;
  onAdd: (count: number) => void;
}> = ({ item, inventory, inCart, onAdd }) => {
  const [quantity, setQuantity] = useState(1);

  const stock = item.count; // undefined = unlimited
  const outOfStock = stock !== undefined && stock <= 0;
  const allowed = canPurchaseItem(item, { type: inventory.type, groups: inventory.groups });
  const remaining = Math.max(0, (stock ?? 99) - inCart);
  const amount = Math.max(1, Math.min(quantity, remaining || 1));

  const blocker = outOfStock
    ? Locale.ui_out_of_stock || 'Out of stock'
    : !allowed
      ? Locale.ui_locked || 'Locked'
      : remaining < 1
        ? Locale.ui_in_cart || 'in cart'
        : null;

  const description = item.metadata?.description || Items[item.name]?.description;

  return (
    <article className="item-card shop-card cut-sm" data-available={!blocker}>
      <div className="item-card-tile">
        <InventorySlot
          item={item}
          inventoryType={inventory.type}
          inventoryGroups={inventory.groups}
          inventoryId={inventory.id}
          noTooltip
        />
      </div>

      <div className="item-card-body">
        <div className="item-card-head">
          <h3 className="item-card-name">{getItemLabel(item)}</h3>
          <Price amount={item.price ?? 0} currency={item.currency} />
        </div>

        {description && <p className="item-card-description">{description}</p>}

        <div className="shop-card-meta">
          {stock === undefined ? (
            <span>{Locale.ui_in_stock || 'In stock'}</span>
          ) : (
            <span data-tone={outOfStock ? 'danger' : stock <= 3 ? 'warning' : undefined}>
              {outOfStock ? Locale.ui_out_of_stock || 'Out of stock' : `${padCount(stock)} ${Locale.ui_left || 'left'}`}
            </span>
          )}
          {item.weight > 0 && (
            <>
              <span className="dim-slash">/</span>
              <span>{formatWeight(item.weight)}</span>
            </>
          )}
          {inCart > 0 && (
            <>
              <span className="dim-slash">/</span>
              <span className="shop-in-cart">
                {padCount(inCart)} {Locale.ui_in_cart || 'in cart'}
              </span>
            </>
          )}
        </div>

        <div className="item-card-actions">
          <Stepper value={amount} min={1} max={Math.max(1, remaining)} onChange={setQuantity} />
          <button
            className="tab card-action"
            disabled={!!blocker}
            onClick={() => {
              onAdd(amount);
              setQuantity(1);
            }}
          >
            <span>{blocker || Locale.ui_add || 'Add'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};

const Checkout: React.FC<{
  items: SlotWithItem[];
  cart: Cart;
  setCart: React.Dispatch<React.SetStateAction<Cart>>;
  balance: Balance | null;
  onPaid: () => void;
}> = ({ items, cart, setCart, balance, onPaid }) => {
  const [method, setMethod] = useState<Method>('cash');
  const [pending, setPending] = useState(false);
  const cardAvailable = !!balance?.card;
  const payMethod: Method = method === 'card' && cardAvailable ? 'card' : 'cash';

  const lines = items.filter((item) => cart[item.slot]);

  // Card covers $ prices only; dirty money and item currencies always pay from the inventory.
  const totals = useMemo(() => {
    const result: Record<string, number> = {};

    for (const item of lines) {
      const currency = item.currency || 'money';
      result[currency] = (result[currency] || 0) + (item.price ?? 0) * cart[item.slot];
    }

    return result;
  }, [lines, cart]);

  const shortfall = Object.entries(totals).some(([currency, total]) => {
    if (currency === 'money' && payMethod === 'card') return balance?.bank !== undefined && balance.bank < total;
    const held = Items[currency]?.count;
    return held !== undefined && held < total;
  });

  const hasOtherCurrency = Object.keys(totals).some((currency) => currency !== 'money');
  const wallet = Items.money?.count;

  const pay = async () => {
    if (!lines.length || pending || shortfall) return;

    setPending(true);
    const success = await fetchNui<boolean>('buyCart', {
      items: lines.map((item) => ({ slot: item.slot, count: cart[item.slot] })),
      method: payMethod,
    });
    setPending(false);

    if (success || isEnvBrowser()) {
      setCart({});
      onPaid();
    }
  };

  return (
    <section className="shop-checkout cut-sm">
      <div className="shop-checkout-head">
        <span className="field-label">
          {Locale.ui_cart || 'Cart'}
          <span className="dim"> · </span>
          <span className="shop-cart-count">{padCount(lines.reduce((total, item) => total + cart[item.slot], 0))}</span>
        </span>
        {lines.length > 0 && (
          <button className="shop-clear" onClick={() => setCart({})}>
            {Locale.ui_clear || 'Clear'}
          </button>
        )}
      </div>

      {lines.length ? (
        <ul className="shop-cart-lines">
          {lines.map((item) => {
            const max = item.count ?? 99;

            return (
              <li key={item.slot} className="shop-cart-line">
                <img src={getItemUrl(item)} alt="" />
                <span className="shop-cart-name">{getItemLabel(item)}</span>
                <Stepper
                  value={cart[item.slot]}
                  min={1}
                  max={max}
                  onChange={(value) => setCart((previous) => ({ ...previous, [item.slot]: value }))}
                />
                <Price amount={(item.price ?? 0) * cart[item.slot]} currency={item.currency} />
                <button
                  className="shop-cart-remove"
                  onClick={() =>
                    setCart((previous) => {
                      const next = { ...previous };
                      delete next[item.slot];
                      return next;
                    })
                  }
                >
                  <CloseIcon />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="hint shop-cart-empty">{Locale.ui_cart_empty || 'Add items to your cart'}</p>
      )}

      <div className="shop-checkout-foot">
        <div className="shop-methods">
          <button className="tab" data-active={payMethod === 'cash'} onClick={() => setMethod('cash')}>
            <span>{Locale.ui_cash || 'Cash'}</span>
          </button>
          <button
            className="tab"
            data-active={payMethod === 'card'}
            disabled={!cardAvailable}
            onClick={() => setMethod('card')}
          >
            <span>{Locale.ui_card || 'Card'}</span>
          </button>
          {/* only when the amount is known, so the label never dangles on its own */}
          {(payMethod === 'card' ? balance?.bank : wallet) !== undefined && (
            <span className="shop-balance">
              <span className="field-label">
                {payMethod === 'card' ? Locale.ui_bank || 'Bank' : Locale.ui_wallet || 'Wallet'}
              </span>
              <Price amount={(payMethod === 'card' ? balance?.bank : wallet)!} />
            </span>
          )}
        </div>

        <button
          className="tab card-action shop-pay"
          data-ready={lines.length > 0 && !shortfall}
          disabled={!lines.length || pending || shortfall}
          onClick={pay}
        >
          <span>
            {shortfall ? Locale.ui_cant_afford || "Can't afford" : Locale.ui_pay || 'Pay'}
            {!shortfall &&
              Object.entries(totals).map(([currency, total], index) => (
                <React.Fragment key={currency}>
                  {index > 0 && <span className="shop-pay-plus">+</span>}
                  <Price amount={total} currency={currency} />
                </React.Fragment>
              ))}
          </span>
        </button>
      </div>

      {payMethod === 'card' && hasOtherCurrency && (
        <p className="hint">{Locale.ui_card_only_cash || 'Card covers $ prices; other currencies pay as usual'}</p>
      )}
    </section>
  );
};

const ShopList: React.FC<{ inventory: Inventory; eyebrow: string; title: string }> = ({ inventory, eyebrow, title }) => {
  const items = inventory.items.filter((slot) => isSlotWithItem(slot)) as SlotWithItem[];
  const [cart, setCart] = useState<Cart>({});
  const [balance, setBalance] = useState<Balance | null>(null);

  const refreshBalance = () => {
    if (isEnvBrowser()) return setBalance({ card: true, bank: 15200 });

    fetchNui<Balance | false>('getShopBalance').then((result) => setBalance(result || null));
  };

  // a new shop starts with an empty cart and a fresh balance
  useEffect(() => {
    setCart({});
    refreshBalance();
  }, [inventory.id]);

  // stock can drop while the cart is open; keep lines within what's left
  useEffect(() => {
    setCart((previous) => {
      let changed = false;
      const next: Cart = {};

      for (const [slot, count] of Object.entries(previous)) {
        const stock = inventory.items[Number(slot) - 1]?.count;
        const capped = stock === undefined ? count : Math.min(count, stock);

        if (capped !== count) changed = true;
        if (capped > 0) next[Number(slot)] = capped;
      }

      return changed ? next : previous;
    });
  }, [inventory.items]);

  return (
    <div className="inventory-grid-wrapper" data-inventorytype={inventory.type}>
      <SectionHead
        eyebrow={eyebrow}
        title={title}
        bar={false}
        right={
          <span className="section-weight">
            {padCount(items.length)}
            <span className="unit">{Locale.ui_items || 'items'}</span>
          </span>
        }
      />
      <div className="shop-body">
        <div className="card-list">
          {items.map((item) => (
            <ShopCard
              key={`shop-${inventory.id}-${item.slot}`}
              item={item}
              inventory={inventory}
              inCart={cart[item.slot] || 0}
              onAdd={(count) => setCart((previous) => ({ ...previous, [item.slot]: (previous[item.slot] || 0) + count }))}
            />
          ))}
        </div>
        <Checkout items={items} cart={cart} setCart={setCart} balance={balance} onPaid={refreshBalance} />
      </div>
    </div>
  );
};

export default ShopList;
