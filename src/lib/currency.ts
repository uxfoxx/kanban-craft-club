/**
 * Format a number as Sri Lankan Rupees (LKR).
 * Example: formatLKR(1500.5) → "LKR 1,500.50"
 */
export const formatLKR = (n: number): string =>
  `LKR ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
