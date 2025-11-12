import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to get authenticated user and profile
async function getAuthenticatedProfile(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Verify JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    throw new Error('Invalid or expired token');
  }

  // Get profile from user_id
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const serviceSupabase = createClient(supabaseUrl, serviceKey);
  
  const { data: profile, error: profileError } = await serviceSupabase
    .from('profiles')
    .select('id, username')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error('Profile not found for authenticated user');
  }

  return { user, profile, supabase: serviceSupabase };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId } = await req.json();

    if (!paymentId) {
      throw new Error("Payment ID is required");
    }

    // Get authenticated user and profile
    const { profile, supabase } = await getAuthenticatedProfile(req);

    // Check idempotency - prevent duplicate approvals
    const { data: existingPayment } = await supabase
      .from('payment_idempotency')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (existingPayment && existingPayment.status === 'completed') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment already processed',
          payment: { id: paymentId, status: 'completed' }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Validate payment with Pi API first
    const PI_API_KEY = Deno.env.get('PI_API_KEY');
    if (!PI_API_KEY) {
      throw new Error("PI_API_KEY not configured");
    }

    // Get payment details from Pi API to validate
    const getPaymentUrl = `https://api.minepi.com/v2/payments/${paymentId}`;
    const getPaymentResponse = await fetch(getPaymentUrl, {
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!getPaymentResponse.ok) {
      throw new Error(`Failed to fetch payment: ${getPaymentResponse.statusText}`);
    }

    const paymentDetails = await getPaymentResponse.json();
    
    // Validate payment status and amount
    if (paymentDetails.status !== 'ready_for_approval') {
      throw new Error(`Payment is not ready for approval. Current status: ${paymentDetails.status}`);
    }

    // Record payment attempt for idempotency
    await supabase
      .from('payment_idempotency')
      .upsert({
        payment_id: paymentId,
        profile_id: profile.id,
        amount: paymentDetails.amount || 0,
        status: 'pending',
        metadata: paymentDetails,
      }, {
        onConflict: 'payment_id'
      });

    // Approve the payment with Pi API
    const approveUrl = `https://api.minepi.com/v2/payments/${paymentId}/approve`;
    
    const response = await fetch(approveUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pi API error:", response.status, errorText);
      
      // Update idempotency record
      await supabase
        .from('payment_idempotency')
        .update({ status: 'failed' })
        .eq('payment_id', paymentId);
      
      throw new Error(`Failed to approve payment: ${errorText}`);
    }

    const paymentData = await response.json();

    return new Response(
      JSON.stringify({ success: true, payment: paymentData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Payment approval error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
