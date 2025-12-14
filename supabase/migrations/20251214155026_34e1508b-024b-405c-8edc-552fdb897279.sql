-- Create recipe_ratings table for 1-5 star ratings
CREATE TABLE public.recipe_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.shared_recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, user_id)
);

-- Enable RLS
ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Ratings are viewable by everyone" 
ON public.recipe_ratings 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can rate recipes" 
ON public.recipe_ratings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings" 
ON public.recipe_ratings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings" 
ON public.recipe_ratings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_recipe_ratings_updated_at
BEFORE UPDATE ON public.recipe_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public) VALUES ('recipe-images', 'recipe-images', true);

-- Storage policies for recipe images
CREATE POLICY "Recipe images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'recipe-images');

CREATE POLICY "Authenticated users can upload recipe images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'recipe-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own recipe images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own recipe images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);