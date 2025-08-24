import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Core class name utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}