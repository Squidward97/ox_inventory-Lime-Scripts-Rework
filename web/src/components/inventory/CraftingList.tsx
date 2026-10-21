import React, { useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectLeftInventory } from '../../store/inventory';
import { Items } from '../../store/items';
import { Locale } from '../../store/locale';
import { craftItem } from '../../thunks/craftItem';
import { Inventory, InventoryType, ItemData, Slot, SlotWithItem } from '../../typings';
import {
  findAvailableSlot,
  getItemLabel,
  getItemUrl,
  isSlotWithItem,
  isUtilitySlot,
  padCount,
} from '../../helpers';
import InventorySlot from './InventorySlot';
import SectionHead from './SectionHead';
import { ClockIcon, MinusIcon } from '../utils/icons/TablerIcons';
import { playSound } from '../../utils/sound';

interface Ingredient {
  name: string;
  label: string;
  need: number;
  have: number;
  /** Tools are worn rather than consumed: `need` is a fraction of durability */
  tool: boolean;
  ok: boolean;
}

// What the pockets hold for each ingredient (the server checks the player inventory only).
const readIngredients = (recipe: SlotWithItem, pockets: Slot[]): Ingredient[] =>
  Object.entries(recipe.ingredients || {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, need]) => {
      const tool = need < 1;
      const matches = pockets.filter((slot) => isSlotWithItem(slot) && slot.name === name) as SlotWithItem[];
      const have = tool
        ? Math.max(0, ...matches.map((slot) => slot.metadata?.durability ?? 100))
        : matches.reduce((total, slot) => total + slot.count, 0);

      return {
        name,
        label: Items[name]?.label || name,
        need,
        have,
        tool,
        ok: tool ? (need === 0 ? matches.length > 0 : have >= need * 100) : have >= need,
      };
    });

const PlusIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M12 5l0 14" />
    <path d="M5 12l14 0" />
  </svg>
);

const RecipeCard: React.FC<{ recipe: SlotWithItem; inventory: Inventory }> = ({ recipe, inventory }) => {
  const dispatch = useAppDispatch();
  const pockets = useAppSelector(selectLeftInventory);
  const isBusy = useAppSelector((state) => state.inventory.isBusy);
  const [quantity, setQuantity] = useState(1);

  const ingredients = useMemo(() => readIngredients(recipe, pockets.items), [recipe, pockets.items]);
  const consumed = ingredients.filter((ingredient) => !ingredient.tool);
  const maxCraftable = ingredients.every((ingredient) => ingredient.ok)
    ? consumed.length
      ? Math.min(...consumed.map((ingredient) => Math.floor(ingredient.have / ingredient.need)))
      : 99
    : 0;
  const amount = Math.max(1, Math.min(quantity, maxCraftable || 1));
  const description = recipe.metadata?.description || Items[recipe.name]?.description;
  const duration = ((recipe.duration ?? 3000) / 1000).toLocaleString('en-us');

  const craft = () => {
    if (!maxCraftable || isBusy) return;

    const data = Items[recipe.name] || ({ stack: false } as ItemData);
    const target =
      findAvailableSlot(recipe, data, pockets.items, InventoryType.PLAYER) ||
      pockets.items.find((slot) => !isUtilitySlot(slot.slot));

    playSound('use');
    dispatch(
      craftItem({
        fromSlot: recipe.slot,
        fromType: inventory.type,
        toSlot: target?.slot ?? 1,
        toType: pockets.type,
        count: amount,
      })
    );
  };

  return (
    <article className="item-card cut-sm" data-craftable={maxCraftable > 0}>
      <div className="item-card-tile">
        <InventorySlot
          item={recipe}
          inventoryType={inventory.type}
          inventoryGroups={inventory.groups}
          inventoryId={inventory.id}
          noTooltip
        />
      </div>

      <div className="item-card-body">
        <div className="item-card-head">
          <h3 className="item-card-name">{getItemLabel(recipe)}</h3>
          <span className="item-card-time">
            <ClockIcon className="icon" />
            {duration}s
          </span>
        </div>

        {description && <p className="item-card-description">{description}</p>}

        <ul className="item-card-ingredients">
          {ingredients.map((ingredient) => (
            <li key={ingredient.name} className="recipe-ingredient" data-ok={ingredient.ok}>
              <img src={getItemUrl(ingredient.name)} alt="" />
              <span className="recipe-ingredient-name">{ingredient.label}</span>
              <span className="recipe-ingredient-count">
                {ingredient.tool ? (
                  ingredient.need === 0 ? (
                    Locale.ui_tool || 'Tool'
                  ) : (
                    <>
                      −{Math.round(ingredient.need * 100)}%
                      <span className="dim"> {Locale.ui_wear || 'wear'}</span>
                    </>
                  )
                ) : (
                  <>
                    {padCount(ingredient.have)}
                    <span className="dim">/</span>
                    {padCount(ingredient.need)}
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>

        <div className="item-card-actions">
          <div className="card-stepper">
            <button onClick={() => setQuantity(Math.max(1, amount - 1))} disabled={amount <= 1}>
              <MinusIcon />
            </button>
            <span className="card-stepper-value">{padCount(amount)}</span>
            <button onClick={() => setQuantity(amount + 1)} disabled={amount >= maxCraftable}>
              <PlusIcon />
            </button>
          </div>
          <button className="tab card-action" disabled={!maxCraftable || isBusy} onClick={craft}>
            <span>{maxCraftable ? Locale.ui_craft || 'Craft' : Locale.ui_missing || 'Missing items'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};

const CraftingList: React.FC<{ inventory: Inventory; eyebrow: string; title: string }> = ({
  inventory,
  eyebrow,
  title,
}) => {
  const recipes = inventory.items.filter((slot) => isSlotWithItem(slot)) as SlotWithItem[];

  return (
    <div className="inventory-grid-wrapper crafting-wrapper" data-inventorytype={inventory.type}>
      <SectionHead
        eyebrow={eyebrow}
        title={title}
        bar={false}
        right={
          <span className="section-weight">
            {padCount(recipes.length)}
            <span className="unit">{Locale.ui_recipes || 'recipes'}</span>
          </span>
        }
      />
      <div className="card-list">
        {recipes.map((recipe) => (
          <RecipeCard key={`recipe-${inventory.id}-${recipe.slot}`} recipe={recipe} inventory={inventory} />
        ))}
      </div>
    </div>
  );
};

export default CraftingList;
