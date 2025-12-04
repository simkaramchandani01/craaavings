-- Create table for password reset OTP codes
CREATE TABLE public.password_reset_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used BOOLEAN NOT NULL DEFAULT false
);

-- Create index for faster lookups
CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes(email);
CREATE INDEX idx_password_reset_codes_expires ON public.password_reset_codes(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- No direct access from client - only through edge functions
-- (No policies needed as we'll use service role in edge functions)