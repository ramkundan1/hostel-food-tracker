// A display preference only — amounts are never converted between
// currencies. A person choosing USD just sees their own numbers with a $ in
// front; the underlying figure they typed is stored exactly as entered.

export const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  NPR: { symbol: "NPR", label: "Nepali Rupee (NPR)" },
  USD: { symbol: "$", label: "US Dollar ($)" },
  AUD: { symbol: "A$", label: "Australian Dollar (A$)" },
  GBP: { symbol: "£", label: "British Pound (£)" },
  EUR: { symbol: "€", label: "Euro (€)" },
  INR: { symbol: "₹", label: "Indian Rupee (₹)" },
};

export const DEFAULT_CURRENCY = "NPR";

export function currencySymbol(code: string): string {
  return CURRENCIES[code]?.symbol ?? CURRENCIES[DEFAULT_CURRENCY].symbol;
}

export function formatMoney(value: number, code: string): string {
  return `${currencySymbol(code)} ${value.toFixed(2)}`;
}

export function isValidCurrency(code: string): boolean {
  return code in CURRENCIES;
}
