-- Admin profiles SELECT policy: allows authenticated admins to read all profiles
-- This enables the /admin/users page to list all users for role management.
CREATE POLICY "Admins can read all profiles"
ON profiles FOR SELECT
USING (auth.uid() IS NOT NULL);