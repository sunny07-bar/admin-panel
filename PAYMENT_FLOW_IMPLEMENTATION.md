# PayPal Payment Flow Implementation

## Overview
Complete PayPal payment integration for reservations, including prepayment handling for special hours events.

## Environment Variables Required

Add to both `.env` files (website and admin-panel):

```env
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET_ID=your_paypal_secret_id
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com  # Use https://api-m.paypal.com for production
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Your website URL
```

## Database Schema

Run `admin-panel/schema_payments.sql` to create:
- `payments` table for tracking all payments
- Payment fields added to `reservations` table
- Payment fields added to `orders` table

## Payment Flow

### 1. Reservation Creation
- User creates reservation
- If special hours require prepayment, reservation is created with `prepayment_status: 'unpaid'`
- API returns `paymentUrl` if prepayment is required
- User is redirected to payment page

### 2. Payment Page (`/reservations/payment`)
- Shows reservation ID and amount due
- User clicks "Pay with PayPal"
- Creates PayPal order via `/api/payments/paypal/create-order`
- Redirects user to PayPal for payment

### 3. PayPal Approval
- User approves payment on PayPal
- PayPal redirects to `/api/payments/paypal/success`
- Success handler redirects to `/reservations/payment/success`

### 4. Payment Capture (`/reservations/payment/success`)
- Page automatically captures payment via `/api/payments/paypal/capture-order`
- Updates reservation with payment status
- Creates payment record in database
- Shows success message

### 5. Payment Cancellation
- If user cancels on PayPal, redirected to `/reservations/payment/cancel`
- Reservation remains with unpaid status

## API Routes

### `/api/payments/paypal/create-order` (POST)
- Creates PayPal order
- Returns `orderId` and `approvalUrl`
- Requires: `amount`, `reservationId`, `currency` (optional)

### `/api/payments/paypal/capture-order` (POST)
- Captures PayPal payment
- Updates reservation payment status
- Creates payment record
- Requires: `orderId`, `reservationId`

### `/api/payments/paypal/success` (GET)
- Handles PayPal return redirect
- Extracts token and reservationId
- Redirects to success page

## Admin Panel Features

### Reservations List
- Shows payment status column
- Displays prepayment amount if applicable
- Color-coded status badges

### Reservation Details
- Full payment history
- Payment status management
- Transaction IDs
- Payment method display
- Mark as no-show functionality

## Website Features

### Reservation Form
- Automatically detects prepayment requirements
- Redirects to payment page if prepayment needed
- Shows payment requirements before submission

### Payment Pages
- **Payment Page**: Shows amount and PayPal button
- **Success Page**: Confirms payment and shows reservation details
- **Cancel Page**: Handles cancelled payments gracefully

## Payment Status Flow

1. **Reservation Created** → `prepayment_status: 'unpaid'` (if prepayment required)
2. **PayPal Order Created** → Payment pending
3. **Payment Captured** → `prepayment_status: 'paid'`, `payment_status: 'paid'`
4. **Payment Recorded** → Entry in `payments` table

## Special Hours Integration

- Prepayment amount calculated based on:
  - `per_guest`: Amount × guest count
  - `per_booking`: Fixed amount
  - `percentage`: Percentage of total (requires total booking cost)
- Payment required before reservation confirmation
- Payment status tracked in reservation record

## Testing Checklist

- [ ] Create reservation with prepayment requirement
- [ ] Complete PayPal payment flow
- [ ] Verify payment record created
- [ ] Check reservation payment status updated
- [ ] Test payment cancellation
- [ ] Verify admin panel shows payment status
- [ ] Test special hours with different prepayment rules
- [ ] Verify payment history in admin panel

## Production Checklist

- [ ] Update `PAYPAL_BASE_URL` to production URL
- [ ] Use production PayPal credentials
- [ ] Update `NEXT_PUBLIC_SITE_URL` to production domain
- [ ] Test with real PayPal account
- [ ] Set up webhook for payment notifications (optional)
- [ ] Configure refund functionality (if needed)

## Security Notes

- PayPal credentials stored in environment variables
- Payment amounts validated server-side
- Transaction IDs stored for audit trail
- Payment status updates are atomic
- No sensitive payment data stored in frontend

## Future Enhancements

- Webhook integration for real-time payment updates
- Refund functionality
- Partial payment support
- Multiple payment methods
- Payment reminders for unpaid reservations
- Automatic cancellation for unpaid reservations after X hours

