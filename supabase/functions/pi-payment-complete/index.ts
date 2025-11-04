import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId, txid, metadata } = await req.json();

    if (!paymentId || !txid) {
      throw new Error("Payment ID and transaction ID are required");
    }

    const PI_API_KEY = Deno.env.get('PI_API_KEY');
    if (!PI_API_KEY) {
      throw new Error("PI_API_KEY not configured");
    }

    // Complete the payment with Pi API
    const completeUrl = `https://api.minepi.com/v2/payments/${paymentId}/complete`;
    
    const response = await fetch(completeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ txid }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pi API error:", response.status, errorText);
      throw new Error(`Failed to complete payment: ${errorText}`);
    }

    const paymentData = await response.json();
    console.log("Payment completed:", paymentData);

    // Update subscription in database if this was a subscription payment
    if (metadata?.subscriptionPlan && metadata?.profileId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const planType = metadata.subscriptionPlan.toLowerCase();
      const billingPeriod = metadata.billingPeriod || 'monthly';
      const endDate = new Date();
      
      if (billingPeriod === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      const { error: subError } = await supabase
        .from("subscriptions")
        .insert({
          profile_id: metadata.profileId,
          plan_type: planType,
          billing_period: billingPeriod,
          pi_amount: paymentData.amount,
          end_date: endDate.toISOString(),
          status: "active",
        });

      if (subError) {
        console.error("Subscription creation error:", subError);
      } else {
        console.log("Subscription created successfully");
      }
    }

    return new Response(
      JSON.stringify({ success: true, payment: paymentData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Payment completion error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});