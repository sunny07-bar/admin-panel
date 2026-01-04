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

/**
 * Convert a datetime-local input value (treated as Florida time) to UTC ISO string for database
 * @param datetimeLocal - String in format "YYYY-MM-DDTHH:mm" (from datetime-local input)
 * @returns ISO string in UTC for database storage
 */
export function floridaDateTimeLocalToUTC(datetimeLocal: string): string {
  if (!datetimeLocal) return ''
  
  // Parse the datetime-local string components (no timezone info)
  const [datePart, timePart] = datetimeLocal.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = (timePart || '00:00').split(':').map(Number)
  
  // The datetime-local input has no timezone - user entered it as Florida time
  // We need to convert "YYYY-MM-DD HH:mm in Florida" to UTC
  
  // CRITICAL FIX: The issue is that new Date(year, month, day, hours, minutes) creates
  // a date in the browser's local timezone. When the browser is in a different timezone
  // than Florida, fromZonedTime can misinterpret the date.
  //
  // Solution: Create a date object where the local time components are guaranteed
  // to match what we want, regardless of browser timezone.
  //
  // We'll create the date using UTC components first, then use toZonedTime to get
  // the Florida time representation, then adjust back. Actually, a simpler approach:
  //
  // Create date in a way that ensures the local components are correct.
  // We can do this by creating a date string and parsing it, ensuring it's treated
  // as if it were in Florida timezone.
  
  // Create date object with the components we want
  // The key insight: fromZonedTime reads the date's local time components
  // (getFullYear(), getMonth(), getDate(), getHours(), getMinutes())
  // and interprets them as if they represent a time in the target timezone.
  //
  // So we need to create a Date object where these local components match
  // our desired Florida time. The problem is new Date() constructor uses
  // browser timezone, which can shift the internal UTC time.
  //
  // The fix: Create the date in a timezone-neutral way by using UTC date
  // construction, but we need to be careful. Actually, the simplest fix:
  // Create the date as if it's in Florida timezone by constructing it properly.
  
  // Create date using the components - this creates it in browser's local timezone
  // But we'll ensure the components are what we want by creating it explicitly
  const dateWithComponents = new Date(year, month - 1, day, hours, minutes, 0, 0)
  
  // Verify the components are correct (they should be, but let's be explicit)
  // If browser timezone causes issues, we need a different approach
  
  // fromZonedTime interprets the date's local time components as Florida timezone
  // and converts to UTC. This should work correctly as long as the local components
  // match what we want.
  const utcDate = fromZonedTime(dateWithComponents, FLORIDA_TIMEZONE)
  
  return utcDate.toISOString()
}

/**
 * Convert UTC ISO string from database to datetime-local format for Florida timezone
 * @param utcISOString - ISO string from database (UTC)
 * @returns String in format "YYYY-MM-DDTHH:mm" for datetime-local input
 */
export function utcToFloridaDateTimeLocal(utcISOString: string): string {
  if (!utcISOString) return ''
  try {
    const utcDate = parseISO(utcISOString)
    
    // Ensure we have a valid date
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid date in utcToFloridaDateTimeLocal:', utcISOString)
      return ''
    }
    
    // Use formatInTimeZone for more reliable timezone formatting
    // This ensures consistent conversion to Florida timezone
    const datePart = formatInTimeZone(utcDate, FLORIDA_TIMEZONE, 'yyyy-MM-dd')
    const timePart = formatInTimeZone(utcDate, FLORIDA_TIMEZONE, 'HH:mm')
    
    return `${datePart}T${timePart}`
  } catch (error) {
    console.error('Error converting UTC to Florida datetime-local:', error)
    return ''
  }
}

/**
 * Get the day of the week (0 = Sunday, 6 = Saturday) for a date string in Florida timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Day of week (0-6) in Florida timezone
 */
export function getDayOfWeekInFlorida(dateString: string): number {
  // Parse the date string
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Create a UTC date for this calendar date at noon (to avoid timezone edge cases)
  // Then convert to Florida timezone to get the correct day of week
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const floridaDate = toZonedTime(utcDate, FLORIDA_TIMEZONE)
  return floridaDate.getDay()
}

/**
 * Format a DATE type (YYYY-MM-DD) directly without timezone conversion
 * PostgreSQL DATE types don't have time, so we shouldn't apply timezone conversion
 * @param dateString - Date string in YYYY-MM-DD format (PostgreSQL DATE type)
 * @returns Formatted date string (MM-DD-YYYY)
 */
export function formatDateOnlyMMDDYYYY(dateString: string): string {
  if (!dateString) return ''
  
  // Extract YYYY-MM-DD part (in case there's any time component)
  const datePart = dateString.split('T')[0].split(' ')[0]
  
  // Parse directly without timezone conversion
  const [year, month, day] = datePart.split('-').map(Number)
  
  // Validate
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return dateString
  }
  
  // Format as MM-DD-YYYY
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`
}

/**
 * Format date in MM-DD-YYYY format (Florida timezone)
 * Use this for datetime values that need timezone conversion
 * For DATE-only types (no time), use formatDateOnlyMMDDYYYY instead
 * @param date - Date object or ISO string
 * @returns Formatted date string (MM-DD-YYYY)
 */
export function formatFloridaDateDDMMYYYY(date: Date | string): string {
  // If it's a simple YYYY-MM-DD string (DATE type), format directly without timezone conversion
  // Check if it's EXACTLY YYYY-MM-DD format (no time component, no timezone)
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim()) && !date.includes('T') && !date.includes(' ')) {
    return formatDateOnlyMMDDYYYY(date)
  }
  
  // For datetime values (TIMESTAMP WITH TIME ZONE), convert to Florida timezone first
  // then extract the date. This ensures the date shown matches what users see in Florida timezone.
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  // Ensure we have a valid date
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date in formatFloridaDateDDMMYYYY:', date)
    return ''
  }
  
  // Convert to Florida timezone and extract the date
  // This ensures that an event at "8 PM on Jan 3" shows as "Jan 3", not "Jan 4"
  const floridaDate = toZonedTime(dateObj, FLORIDA_TIMEZONE)
  
  // Use formatInTimeZone for more reliable timezone formatting
  const floridaDateString = formatInTimeZone(dateObj, FLORIDA_TIMEZONE, 'yyyy-MM-dd')
  const [year, month, day] = floridaDateString.split('-').map(Number)
  
  // Validate parsed values
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.error('Failed to parse date components:', { year, month, day, floridaDateString, originalDate: date })
    return ''
  }
  
  // Format as MM-dd-yyyy
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`
}

/**
 * Format date in MM-DD-YYYY format (Florida timezone) - alias for consistency
 * @param date - Date object or ISO string
 * @returns Formatted date string (MM-DD-YYYY)
 */
export function formatFloridaDateMMDDYYYY(date: Date | string): string {
  return formatFloridaDateDDMMYYYY(date)
}

/**
 * Get start of day in Florida timezone for a date string (YYYY-MM-DD)
 * Returns UTC ISO string for database queries
 */
export function getFloridaDayStartUTC(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  // Create date at start of day in Florida timezone
  const floridaStart = new Date(year, month - 1, day, 0, 0, 0, 0)
  // Convert to UTC
  const utcStart = fromZonedTime(floridaStart, FLORIDA_TIMEZONE)
  return utcStart.toISOString()
}

/**
 * Get end of day in Florida timezone for a date string (YYYY-MM-DD)
 * Returns UTC ISO string for database queries
 */
export function getFloridaDayEndUTC(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  // Create date at end of day in Florida timezone
  const floridaEnd = new Date(year, month - 1, day, 23, 59, 59, 999)
  // Convert to UTC
  const utcEnd = fromZonedTime(floridaEnd, FLORIDA_TIMEZONE)
  return utcEnd.toISOString()
}

/**
 * Get start of month in Florida timezone
 * Returns UTC ISO string for database queries
 */
export function getFloridaMonthStartUTC(year: number, month: number): string {
  // month is 0-indexed (0 = January, 11 = December)
  const floridaStart = new Date(year, month, 1, 0, 0, 0, 0)
  const utcStart = fromZonedTime(floridaStart, FLORIDA_TIMEZONE)
  return utcStart.toISOString()
}

/**
 * Get end of month in Florida timezone
 * Returns UTC ISO string for database queries
 */
export function getFloridaMonthEndUTC(year: number, month: number): string {
  // month is 0-indexed (0 = January, 11 = December)
  // Get last day of month
  const lastDay = new Date(year, month + 1, 0).getDate()
  const floridaEnd = new Date(year, month, lastDay, 23, 59, 59, 999)
  const utcEnd = fromZonedTime(floridaEnd, FLORIDA_TIMEZONE)
  return utcEnd.toISOString()
}

