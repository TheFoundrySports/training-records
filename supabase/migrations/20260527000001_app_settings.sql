-- Create app_settings table for registration mode configuration
CREATE TABLE app_settings (
  id serial PRIMARY KEY,
  registration_mode text NOT NULL DEFAULT 'open' CHECK (registration_mode IN ('open', 'invite_only')),
  invite_expiry_hours integer NOT NULL DEFAULT 48,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enforce single row constraint using trigger
CREATE OR REPLACE FUNCTION ensure_single_app_settings() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM app_settings WHERE id != COALESCE(NEW.id, 0)) >= 1 THEN
    RAISE EXCEPTION 'Only one row allowed in app_settings';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_app_settings
  BEFORE INSERT ON app_settings
  FOR EACH ROW EXECUTE FUNCTION ensure_single_app_settings();

-- Seed with default open mode (will fail silently if row already exists)
INSERT INTO app_settings (registration_mode, invite_expiry_hours)
VALUES ('open', 48)
ON CONFLICT DO NOTHING;

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can SELECT
CREATE POLICY "Authenticated users can select app_settings"
  ON app_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS: admin can INSERT (for initial seed and any future admin updates)
CREATE POLICY "Admins can insert app_settings"
  ON app_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS: admin can UPDATE (check via subquery on profiles.role)
CREATE POLICY "Admins can update app_settings"
  ON app_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );