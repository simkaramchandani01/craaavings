-- Add is_private column to communities
ALTER TABLE public.communities 
ADD COLUMN is_private boolean NOT NULL DEFAULT false;

-- Update RLS policy for private communities (only members can view private communities)
DROP POLICY IF EXISTS "Communities are viewable by everyone" ON public.communities;

CREATE POLICY "Communities are viewable based on privacy" 
ON public.communities 
FOR SELECT 
USING (
  is_private = false 
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.community_members 
    WHERE community_id = communities.id 
    AND user_id = auth.uid()
  )
);