/**
 * Convert 24-hour time format (HH:mm) to 12-hour format with AM/PM
 * Note: Times are stored as time-of-day values in Florida local time (EST/EDT, UTC-5)
 * @param time24 - Time in 24-hour format (e.g., "16:00", "09:30")
 * @returns Time in 12-hour format (e.g., "4:00 PM", "9:30 AM")
 */
export function convert24To12(time24: string): string {
  if (!time24 || !time24.includes(':')) {
    return time24 || ''
  }

  const [hours, minutes] = time24.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes)) {
    return time24
  }

  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours

  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Convert 12-hour time format with AM/PM to 24-hour format
 * Note: Times are stored as time-of-day values in Florida local time (EST/EDT, UTC-5)
 * @param time12 - Time in 12-hour format (e.g., "4:00 PM", "9:30 AM", "12:00 PM")
 * @returns Time in 24-hour format (e.g., "16:00", "09:30", "12:00")
 */
export function convert12To24(time12: string): string {
  if (!time12) {
    return ''
  }

  // Remove extra spaces and convert to uppercase
  const cleaned = time12.trim().toUpperCase()
  
  // Match patterns like "4:00 PM", "9:30 AM", "12:00PM"
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/)
  if (!match) {
    // If it doesn't match, try to return as-is (might already be 24-hour)
    return time12
  }

  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const period = match[3]

  if (period === 'PM' && hours !== 12) {
    hours += 12
  } else if (period === 'AM' && hours === 12) {
    hours = 0
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`
}

/**
 * Format time input value for HTML time input (HH:mm format)
 * Converts 12-hour to 24-hour for storage
 */
export function formatTimeForInput(time12: string): string {
  return convert12To24(time12)
}

/**
 * Format time from database (24-hour) for display (12-hour with AM/PM)
 */
export function formatTimeForDisplay(time24: string): string {
  return convert24To12(time24)
}

