/**
 * @file currencyFormatter.js
 * @description Utility for formatting currency values based on user settings
 */

/**
 * Currency configuration with symbols and locale settings
 */
const CURRENCY_CONFIG = {
  USD: { symbol: '$', locale: 'en-US', position: 'before' },
  EUR: { symbol: '€', locale: 'de-DE', position: 'before' },
  GBP: { symbol: '£', locale: 'en-GB', position: 'before' },
  INR: { symbol: '₹', locale: 'en-IN', position: 'before' }
};

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (USD, EUR, GBP, INR)
 * @param {Object} options - Formatting options
 * @param {boolean} options.compact - Use compact notation (e.g., 1.5M instead of 1,500,000)
 * @param {boolean} options.showDecimals - Show decimal places (default: false for whole numbers)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD', options = {}) {
  const { compact = false, showDecimals = false } = options;
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;

  // Handle null/undefined
  if (amount == null) return `${config.symbol}0`;

  // Format the number
  let formatted;
  if (compact && Math.abs(amount) >= 1000000) {
    // Compact format for millions
    formatted = (amount / 1000000).toFixed(1) + 'M';
  } else if (compact && Math.abs(amount) >= 1000) {
    // Compact format for thousands
    formatted = (amount / 1000).toFixed(1) + 'K';
  } else if (showDecimals) {
    formatted = amount.toLocaleString(config.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } else {
    formatted = Math.round(amount).toLocaleString(config.locale);
  }

  return `${config.symbol}${formatted}`;
}

/**
 * Get just the currency symbol
 * @param {string} currency - Currency code
 * @returns {string} Currency symbol
 */
export function getCurrencySymbol(currency = 'USD') {
  return CURRENCY_CONFIG[currency]?.symbol || '$';
}

/**
 * Format currency with sign (for profit/loss)
 * @param {number} amount - The amount (positive or negative)
 * @param {string} currency - Currency code
 * @returns {string} Formatted string with + or - prefix
 */
export function formatCurrencyWithSign(amount, currency = 'USD') {
  const formatted = formatCurrency(Math.abs(amount), currency);
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}

export default {
  formatCurrency,
  getCurrencySymbol,
  formatCurrencyWithSign
};
