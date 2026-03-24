-- Fix: Allow games to be created without a group
-- The group_id column was NOT NULL, preventing game creation when no group exists
ALTER TABLE games ALTER COLUMN group_id DROP NOT NULL;

-- Also ensure the profile auto-creation trigger exists
-- (needed for signup flow to work without RLS errors)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_name text;
  user_initials text;
  user_color text;
  colors text[] := ARRAY['#22C55E', '#3B82F6', '#8B5CF6', '#F97316', '#EF4444', '#06B6D4', '#6366F1', '#EAB308'];
BEGIN
  user_name := COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  user_initials := UPPER(LEFT(user_name, 2));
  user_color := colors[1 + floor(random() * array_length(colors, 1))::int];

  INSERT INTO public.profiles (id, email, name, initials, color)
  VALUES (new.id, new.email, user_name, user_initials, user_color)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
