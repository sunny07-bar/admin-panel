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
  
  // Strategy: Use fromZonedTime correctly
  // The user entered a time as if it were in Florida timezone (no timezone info in datetime-local input)
  // We need to create a Date object where the local time components match the input,
  // then use fromZonedTime to interpret those components as Florida timezone and get UTC
  
  // Create a Date object with the input components
  // Note: Date constructor with these parameters creates date in browser's local timezone
  // But we'll use fromZonedTime to reinterpret it as Florida timezone
  const dateWithComponents = new Date(year, month - 1, day, hours, minutes, 0, 0)
  
  // fromZonedTime takes a date and interprets its local time components 
  // (getFullYear, getMonth, getDate, getHours, etc.) as if they represent
  // a time in the specified timezone, then returns the UTC equivalent
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
    const floridaDate = toZonedTime(utcDate, FLORIDA_TIMEZONE)
    
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = floridaDate.getFullYear()
    const month = String(floridaDate.getMonth() + 1).padStart(2, '0')
    const day = String(floridaDate.getDate()).padStart(2, '0')
    const hours = String(floridaDate.getHours()).padStart(2, '0')
    const minutes = String(floridaDate.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch (error) {
    console.error('Error converting UTC to Florida datetime-local:', error)
    return ''
  }
}

/**
 * Format date in dd-mm-yyyy format (Florida timezone)
 * @param date - Date object or ISO string
 * @returns Formatted date string (dd-mm-yyyy)
 */
export function formatFloridaDateDDMMYYYY(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  const floridaDate = toZonedTime(dateObj, FLORIDA_TIMEZONE)
  return format(floridaDate, 'dd-MM-yyyy')
}

