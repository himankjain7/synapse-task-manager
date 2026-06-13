/**
 * Truncates a string to a specific length and appends ellipses.
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

/**
 * Extracts uppercase initials from a full name.
 * Example: "John Doe" -> "JD"
 */
export function getInitials(name: string): string {
  if (!name) return 'U';
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Formats a number into localized currency.
 * Example: 1500 -> "$1,500.00"
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(value);
  } catch (error) {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
