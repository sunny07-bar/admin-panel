# Event Ticketing System with QR Codes - Complete Implementation

## Overview
A secure event ticketing system with unique UUID tickets, QR code generation, one-time redemption, and email delivery.

## Database Schema

### Run SQL File
Execute `/admin-panel/schema_tickets.sql` in your Supabase SQL editor.

### Tables Created:
1. **ticket_orders** - Main order table for ticket purchases
2. **purchased_tickets** - Individual tickets with QR codes
3. **ticket_redemption_logs** - Audit log of all redemption attempts
4. **email_queue** - Queue for sending ticket emails

### Key Features:
- Unique UUID for each ticket
- QR code hash for quick lookup
- Status tracking (valid, used, cancelled, refunded)
- One-time redemption (prevents duplicate usage)
- Event date validation
- Staff authentication support
- Complete audit trail

## API Endpoints

### Website (wesbite)

1. **POST `/api/tickets/purchase`**
   - Purchases tickets for an event
   - Generates QR codes for each ticket
   - Creates order and ticket records
   - Returns order ID and tickets

2. **POST `/api/tickets/verify`**
   - Verifies and redeems a ticket
   - Prevents duplicate redemption
   - Returns success/failure with details

3. **POST `/api/tickets/send-email`**
   - Sends ticket confirmation email with QR codes
   - Queues email for processing

4. **GET `/api/tickets/[ticketId]`**
   - Gets individual ticket details with QR code

### Admin Panel

1. **POST `/api/tickets/verify`**
   - Same verification endpoint (can be used by staff)

## Frontend Pages

### Website

1. **`/events/[slug]/purchase`**
   - Ticket purchase page
   - Select ticket types and quantities
   - Customer information form
   - Order summary

2. **`/events/[slug]/tickets/[orderId]`**
   - Ticket confirmation page
   - Displays all purchased tickets
   - Shows QR codes
   - Download option

### Admin Panel

1. **`/events/scan`**
   - QR code scanner interface
   - Camera-based scanning
   - Manual entry option
   - Real-time verification results

2. **`/events/tickets`**
   - List all purchased tickets
   - Filter by status and event
   - View ticket details

## Email System

### Setup Options:

**Option 1: Resend (Recommended)**
1. Sign up at resend.com
2. Get API key
3. Add to Supabase Edge Function environment:
   - `RESEND_API_KEY=your_key_here`

**Option 2: Supabase Edge Function**
- Deploy `/admin-panel/supabase/functions/send-ticket-email/index.ts`
- Set up cron job to process `email_queue` table

**Option 3: External Service**
- Use SendGrid, Mailgun, or similar
- Process `email_queue` table with cron job

### Email Content:
- Event details (title, date, time, location)
- All tickets with QR codes
- Ticket numbers
- Important instructions
- Beautiful HTML template

## Security Features

1. **Unique QR Codes**
   - Each ticket has unique UUID
   - QR code contains encrypted ticket data
   - Hash-based lookup for performance

2. **One-Time Redemption**
   - Atomic database updates prevent race conditions
   - Status check before redemption
   - Cannot be used twice even if QR code is copied

3. **Event Date Validation**
   - Tickets can only be redeemed around event time
   - Configurable validation rules

4. **Audit Trail**
   - All redemption attempts logged
   - Success/failure tracking
   - Device and location info

5. **Staff Authentication**
   - Optional staff ID tracking
   - Can be integrated with Clerk auth

## Usage Flow

### Customer Purchase:
1. Visit event page → Click "Buy Tickets"
2. Select ticket types and quantities
3. Enter customer information
4. Purchase tickets
5. Receive email with QR codes
6. View tickets on confirmation page

### Staff Verification:
1. Open scan page in admin panel
2. Start camera scanner
3. Scan QR code or enter manually
4. System verifies and marks as used
5. Shows success/failure message

## Environment Variables

### Website (.env.local):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Admin Panel (.env.local):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Supabase Edge Function:
```env
RESEND_API_KEY=your_resend_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing

1. **Create an event** in admin panel
2. **Add ticket types** to the event
3. **Purchase tickets** on website
4. **Check email** for ticket confirmation
5. **Scan QR code** in admin panel
6. **Verify** ticket is marked as used
7. **Try scanning again** - should fail (already used)

## Notes

- QR codes are generated server-side for security
- Email sending is queued for reliability
- All operations are logged for audit
- System prevents duplicate redemption even with copied QR codes
- Staff can manually enter ticket numbers if QR scanning fails

