import { format, parseISO } from 'date-fns'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'

// Florida timezone (America/New_York covers Florida's Eastern Time)
export const FLORIDA_TIMEZONE = 'America/New_York'

/**
 * Convert a date to Florida timezone
 */
export function toFloridaTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return toZonedTime(dateObj, FLORIDA_TIMEZONE)
}

/**
 * Format a date in Florida timezone
 */
export function formatFloridaTime(
  date: Date | string,
  formatStr: string
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(dateObj, FLORIDA_TIMEZONE, formatStr)
}

/**
 * Get current date/time in Florida timezone
 */
export function getFloridaNow(): Date {
  return toZonedTime(new Date(), FLORIDA_TIMEZONE)
}

/**
 * Get today's date in YYYY-MM-DD format in Florida timezone
 */
export function getFloridaToday(): string {
  const floridaNow = getFloridaNow()
  return format(floridaNow, 'yyyy-MM-dd')
}

/**
 * Convert a Florida timezone date to UTC for database storage
 */
export function floridaToUTC(date: Date): Date {
  return fromZonedTime(date, FLORIDA_TIMEZONE)
}

