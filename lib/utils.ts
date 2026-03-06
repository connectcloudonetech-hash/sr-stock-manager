import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  const currency = localStorage.getItem('sr_currency') || 'INR';
  const symbols: Record<string, string> = {
    'INR': '₹',
    'USD': '$',
    'AED': 'د.إ',
    'EUR': '€',
    'GBP': '£'
  };
  const symbol = symbols[currency] || '₹';
  
  return `${symbol}${amount.toLocaleString()}`;
}
