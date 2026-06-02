import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type ConfirmBody = {
  paymentKey?: string;
  orderId?: string;
  amount?: number;
};

const tossConfirmUrl = "https://api.tosspayments.com/v1/payments/confirm";

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} secret is not configured.`);
  return value;
}

function tossAuthHeader(secretKey: string) {
  return `Basic ${btoa(`${secretKey}:`)}`;
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { paymentKey, orderId, amount } = (await request.json()) as ConfirmBody;
    if (!paymentKey || !orderId || !amount) {
      return jsonResponse({ error: "paymentKey, orderId, amount are required." }, 400);
    }

    const supabaseUrl = env("SUPABASE_URL");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const tossSecretKey = env("TOSS_SECRET_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, order_number, email, total")
      .eq("order_number", orderId)
      .single();

    if (orderError || !order) {
      return jsonResponse({ error: "Order not found." }, 404);
    }

    if (Math.round(Number(order.total || 0)) !== Math.round(Number(amount))) {
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          payment_failure_code: "AMOUNT_MISMATCH",
          payment_failure_message: "결제 요청 금액과 주문 금액이 다릅니다.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
      return jsonResponse({ error: "Amount mismatch." }, 400);
    }

    const tossResponse = await fetch(tossConfirmUrl, {
      method: "POST",
      headers: {
        Authorization: tossAuthHeader(tossSecretKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Math.round(Number(amount)),
      }),
    });
    const tossPayment = await tossResponse.json();

    if (!tossResponse.ok) {
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          payment_failure_code: tossPayment.code || "TOSS_CONFIRM_FAILED",
          payment_failure_message: tossPayment.message || "Toss 결제 승인에 실패했습니다.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
      return jsonResponse({ error: tossPayment.message || "Toss confirm failed.", tossPayment }, 400);
    }

    const approvedAt = tossPayment.approvedAt || new Date().toISOString();
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_status: "paid",
        payment_provider: "toss",
        provider_payment_id: paymentKey,
        paid_at: approvedAt,
        payment_approved_at: approvedAt,
        payment_failure_code: "",
        payment_failure_message: "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .select("id, order_number, user_id, email")
      .single();

    if (updateError) throw updateError;

    await supabase.from("notification_events").insert({
      order_id: updatedOrder.id,
      user_id: updatedOrder.user_id,
      event_type: "payment_paid",
      recipient_email: updatedOrder.email,
      subject: `[VELTIER] 주문 ${updatedOrder.order_number} 결제가 완료되었습니다`,
      body: "결제가 완료되었습니다. 상품 준비가 시작되면 다시 안내드리겠습니다.",
      status: "pending",
    });

    return jsonResponse({
      success: true,
      orderNumber: updatedOrder.order_number,
      paymentKey,
      approvedAt,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
