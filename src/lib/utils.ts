import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { format, eachDayOfInterval, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getDateRange(checkIn: string, checkOut: string): string[] {
  try {
    const start = parseISO(checkIn);
    const end = parseISO(checkOut);
    const days = eachDayOfInterval({ start, end });
    return days.map(day => format(day, 'yyyy-MM-dd'));
  } catch (error) {
    console.error('Error generating date range:', error);
    return [];
  }
}
