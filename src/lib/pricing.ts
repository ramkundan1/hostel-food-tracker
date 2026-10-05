// Shared cost math so the manual entry form and the automatic (cron)
// entry creator always price a meal the same way.

export type MealSelection = {
  meal?: boolean;
  egg?: boolean;
  curd?: boolean;
  chicken?: boolean;
};

export type FoodPrice = {
  meal: number;
  egg: number;
  curd: number;
  chicken: number;
};

export function calculateMealCost(
  selection: MealSelection,
  price: FoodPrice
): number {
  return (
    (selection.meal ? price.meal : 0) +
    (selection.egg ? price.egg : 0) +
    (selection.curd ? price.curd : 0) +
    (selection.chicken ? price.chicken : 0)
  );
}

