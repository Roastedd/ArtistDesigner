import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Crypto-safe short suffix used to disambiguate user-facing slugs.
 * 6 hex chars from a UUID gives ~16M values — collision-resistant for our scale.
 */
export function randomSlugSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6);
}

/** Build a unique-enough slug from a free-form name. */
export function buildSlug(name: string): string {
  const base = slugify(name) || "untitled";
  return `${base}-${randomSlugSuffix()}`;
}
