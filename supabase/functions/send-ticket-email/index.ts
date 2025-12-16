// Supabase Edge Function to send ticket emails
// Deploy this to Supabase Edge Functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || ""

serve(async (req) => {
  try {
    const { emailQueueId } = await req.json()

    if (!emailQueueId) {
      return new Response(
        JSON.stringify({ error: "Email queue ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get email from queue
    const { data: emailData, error: emailError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("id", emailQueueId)
      .eq("status", "pending")
      .single()

    if (emailError || !emailData) {
      return new Response(
        JSON.stringify({ error: "Email not found in queue" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    // Send email using Resend (or your preferred email service)
    if (RESEND_API_KEY) {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Good Times Bar <tickets@goodtimesbar.com>",
          to: emailData.to_email,
          subject: emailData.subject,
          html: emailData.html_content,
        }),
      })

      if (!resendResponse.ok) {
        const error = await resendResponse.json()
        // Update email queue with error
        await supabase
          .from("email_queue")
          .update({
            status: "failed",
            error_message: error.message || "Failed to send email",
            last_attempt_at: new Date().toISOString(),
            attempts: emailData.attempts + 1,
          })
          .eq("id", emailQueueId)

        return new Response(
          JSON.stringify({ error: "Failed to send email", details: error }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      }

      const result = await resendResponse.json()

      // Update email queue as sent
      await supabase
        .from("email_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", emailQueueId)

      return new Response(
        JSON.stringify({ success: true, messageId: result.id }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    } else {
      // Fallback: Use Supabase's built-in email (if configured)
      // Or log for manual sending
      await supabase
        .from("email_queue")
        .update({
          status: "failed",
          error_message: "Email service not configured",
          last_attempt_at: new Date().toISOString(),
          attempts: emailData.attempts + 1,
        })
        .eq("id", emailQueueId)

      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

