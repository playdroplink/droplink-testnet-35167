-- Create subscriptions table for Pi-based plans
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('free', 'premium', 'pro')),
  billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
  pi_amount integer NOT NULL DEFAULT 0,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  auto_renew boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = subscriptions.profile_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own subscriptions"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = subscriptions.profile_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = subscriptions.profile_id
    AND profiles.user_id = auth.uid()
  ));

-- Add Pi wallet fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS pi_wallet_address text,
  ADD COLUMN IF NOT EXISTS pi_donation_message text DEFAULT 'Send me a coffee ☕';

-- Add trigger for subscriptions updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check subscription status
CREATE OR REPLACE FUNCTION public.get_active_subscription(p_profile_id uuid)
RETURNS TABLE (
  plan_type text,
  billing_period text,
  end_date timestamp with time zone,
  status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.plan_type,
    s.billing_period,
    s.end_date,
    CASE 
      WHEN s.end_date < now() THEN 'expired'::text
      ELSE s.status
    END as status
  FROM public.subscriptions s
  WHERE s.profile_id = p_profile_id
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;