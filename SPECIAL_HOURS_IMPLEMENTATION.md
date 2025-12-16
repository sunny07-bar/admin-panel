# Special Hours / Events Feature Implementation

## Overview
This feature allows admins to create date-specific opening hours that override regular hours for events, holidays, VIP bookings, brunches, etc. Similar to ResOS functionality.

## Database Schema

### New Tables Created:
1. **special_hours** - Main table for special hours configuration
2. **special_hours_seatings** - Seating configuration (intervals, duration rules)
3. **special_hours_limits** - Booking limits (max bookings, max guests, per-interval limits)
4. **special_hours_payment** - Payment rules (prepayment, no-show fees, cancellation policies)
5. **special_hours_fields** - Custom booking form fields
6. **reservation_field_responses** - Stores responses to custom fields

### Modified Tables:
- **reservations** - Added `special_hours_id`, `prepayment_amount`, `prepayment_status`, `no_show_fee_applied`

### SQL File:
Run `/admin-panel/schema_special_hours.sql` in your Supabase SQL editor to create all tables and functions.

## Admin Panel Features

### Navigation
- Added "Special Hours" under Reservations menu in sidebar
- Accessible at `/reservations/special-hours`

### Pages Created:
1. **List Page** (`/reservations/special-hours/page.tsx`)
   - View all special hours
   - Toggle active/draft status
   - Edit/Delete actions

2. **New Page** (`/reservations/special-hours/new/page.tsx`)
   - Tab-based UI with 5 sections:
     - **General**: Title, date, open/closed, time range, note, waitlist toggle
     - **Seatings**: Interval, default duration, duration rules
     - **Limits**: Max bookings, max guests, per-interval limits, online-only toggle
     - **Payment**: Prepayment rules, no-show fees, cancellation policies
     - **Fields**: Custom booking form fields

3. **Edit Page** (`/reservations/special-hours/[id]/page.tsx`)
   - Same tab structure as new page
   - Loads existing data for editing

## Website Features

### Reservation Page Updates
- Automatically detects special hours for selected date
- Shows available time slots based on special hours configuration
- Displays special hours information (title, note)
- Shows custom fields if configured
- Displays prepayment requirements and cancellation policies
- Validates availability before submission

### New Query Functions (`lib/queries.ts`)
- `getSpecialHoursForDate(date)` - Gets special hours for a specific date
- `checkSpecialHoursAvailability(date, time, guestCount)` - Checks if a time slot is available
- `getAvailableTimeSlots(date, guestCount)` - Returns list of available time slots

## API Updates

### Reservations API (`/api/reservations/route.ts`)
- Handles special hours validation
- Enforces booking limits
- Calculates prepayment amounts
- Saves custom field responses
- Links reservation to special hours

## Booking Logic Flow

1. **User selects date** → System checks for special hours
2. **If special hours exist**:
   - Overrides regular opening hours
   - Applies seating intervals
   - Enforces booking limits
   - Shows custom fields
   - Displays payment requirements
3. **User selects time** → System validates availability
4. **User submits** → System double-checks availability and creates reservation

## Edge Cases Handled

1. **Overlapping Hours**: Only one special hour per date (enforced by unique constraint)
2. **Partial Overrides**: Special hours completely override regular hours for that date
3. **Time Slot Availability**: Real-time checking against limits
4. **Guest Count Limits**: Validated at booking time
5. **Prepayment**: Calculated based on guest count or booking
6. **Custom Fields**: Dynamically rendered based on special hours configuration

## Usage Examples

### Creating a New Year's Eve Event:
1. Go to Admin → Reservations → Special Hours → New
2. **General Tab**: 
   - Title: "New Year's Eve Celebration"
   - Date: 2025-12-31
   - Time: 6:00 PM - 1:00 AM
   - Status: Active
3. **Seatings Tab**:
   - Interval: 30 minutes
   - Default Duration: 120 minutes
4. **Limits Tab**:
   - Max Bookings: 50
   - Max Guests Per Booking: 8
   - Per Interval Limit: 5
5. **Payment Tab**:
   - Prepayment Required: Yes
   - Prepayment: $50 per guest
   - No-Show Fee: $25
6. **Fields Tab**:
   - Add field: "Dietary Restrictions" (textarea)
   - Add field: "Special Occasion" (select: Birthday, Anniversary, etc.)

### Creating a Holiday Closure:
1. **General Tab**:
   - Title: "Christmas Day"
   - Date: 2025-12-25
   - Is Open: No (unchecked)
   - Status: Active

## Database Functions

Two helper functions are created in the schema:

1. **get_special_hours_for_date(check_date)** - Returns special hours for a date
2. **check_special_hours_availability(check_date, check_time, guest_count)** - Validates availability

## Testing Checklist

- [ ] Create special hours for a future date
- [ ] Verify regular hours are overridden
- [ ] Test booking limits (max bookings, max guests)
- [ ] Test per-interval limits
- [ ] Test custom fields appear on reservation form
- [ ] Test prepayment calculation
- [ ] Test cancellation policy display
- [ ] Test closed date (is_open = false)
- [ ] Test waitlist functionality
- [ ] Test edit special hours
- [ ] Test delete special hours

## Future Enhancements

- Recurring special hours (weekly brunch, monthly events)
- Multiple special hours per date (different time slots)
- Integration with payment gateway for prepayment
- Email notifications for special hours bookings
- Calendar view of special hours
- Copy special hours to another date

## Notes

- Special hours completely override regular hours for that date
- Only one active special hour per date is allowed
- Custom fields are optional and only shown if configured
- Prepayment is tracked but payment processing would need separate integration
- The system gracefully falls back to regular hours if no special hours exist

