-- Add is_private column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;