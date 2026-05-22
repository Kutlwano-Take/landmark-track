import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number | null | undefined) => {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(n);
};

export const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

export const formatDateShort = (date: string | Date | null | undefined) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date));
};

export const daysBetween = (from: string | Date, to: string | Date = new Date().toISOString()) => {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.floor(ms / 86_400_000);
};

export const daysAgo = (date: string | Date) => {
  const days = daysBetween(date);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
};

export const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const SA_PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "Northern Cape", "North West", "Western Cape",
];

export const PROPERTY_TYPES = [
  "Apartment", "House", "Townhouse", "Cottage", "Duplex",
  "Commercial", "Industrial", "Land", "Mixed Use",
];

export const UNIT_TYPES = [
  "Studio", "One Bedroom", "Two Bedroom", "Three Bedroom",
  "Four Bedroom", "Penthouse", "Loft", "Office",
];
