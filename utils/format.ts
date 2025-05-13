/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, options?: Intl.NumberFormatOptions): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
  };
  
  return new Intl.NumberFormat('en-US', {
    ...defaultOptions,
    ...options,
  }).format(amount);
}

/**
 * Format a number as a percentage
 */
export function formatPercentage(value: number, options?: Intl.NumberFormatOptions): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  };
  
  return new Intl.NumberFormat('en-US', {
    ...defaultOptions,
    ...options,
  }).format(value / 100);
}

/**
 * Format a date in a user-friendly way
 */
export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  return new Intl.DateTimeFormat('en-US', {
    ...defaultOptions,
    ...options,
  }).format(date);
}