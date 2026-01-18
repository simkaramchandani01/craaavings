-- Create profile_posts table for user uploaded images
CREATE TABLE public.profile_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  saved_recipe_id UUID REFERENCES public.saved_recipes(id) ON DELETE SET NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own posts"
  ON public.profile_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.profile_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.profile_posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Profile posts are viewable based on profile privacy and friendship"
  ON public.profile_posts FOR SELECT
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = user_id AND p.is_private = false
    )
    OR EXISTS (
      SELECT 1 FROM public.friendships f 
      WHERE f.status = 'accepted' 
      AND ((f.user_id = auth.uid() AND f.friend_id = user_id) 
        OR (f.friend_id = auth.uid() AND f.user_id = user_id))
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_profile_posts_updated_at
  BEFORE UPDATE ON public.profile_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for profile post images
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-posts', 'profile-posts', true);

-- Storage policies for profile posts
CREATE POLICY "Profile post images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-posts');

CREATE POLICY "Users can upload their own profile post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile post images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'profile-posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile post images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'profile-posts' AND auth.uid()::text = (storage.foldername(name))[1]);