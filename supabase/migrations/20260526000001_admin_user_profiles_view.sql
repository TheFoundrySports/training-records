-- View that joins profiles with auth.users to expose email for admin user management.
-- Only accessible to authenticated users; RLS on profiles still applies.
CREATE OR REPLACE VIEW public.user_profiles AS
  SELECT
    p.id,
    u.email,
    p.role,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id;

-- Grant select to authenticated users (RLS on underlying profiles table still applies)
GRANT SELECT ON public.user_profiles TO authenticated;
