import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type SendBody = {
  limit?: number;
};

const resendUrl = "https://api.resend.com/emails";

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} secret is not configured.`);
  return value;
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await request.json().catch(() => ({}))) as SendBody;
    const limit = Math.min(Math.max(Number(body.limit || 10), 1), 25);
    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    const resendKey = env("RESEND_API_KEY");
    const fromEmail = env("FROM_EMAIL");

    const { data: events, error } = await supabase
      .from("notification_events")
      .select("id, recipient_email, subject, body")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;

    const results = [];
    for (const event of events || []) {
      const response = await fetch(resendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: event.recipient_email,
          subject: event.subject,
          text: event.body,
        }),
      });
      const responseBody = await response.json().catch(() => ({}));

      await supabase
        .from("notification_events")
        .update({
          status: response.ok ? "sent" : "failed",
          sent_at: response.ok ? new Date().toISOString() : null,
        })
        .eq("id", event.id);

      results.push({
        id: event.id,
        ok: response.ok,
        providerId: responseBody.id || "",
        error: response.ok ? "" : responseBody.message || "Email provider failed.",
      });
    }

    return jsonResponse({ success: true, sent: results.filter((item) => item.ok).length, results });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
