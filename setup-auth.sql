-- Enable authentication providers
-- Run this in Supabase SQL Editor

-- Enable Google OAuth (you'll need to configure this in Supabase dashboard)
-- Go to Project Settings > Authentication > Providers > Google

-- Enable GitHub OAuth (you'll need to configure this in Supabase dashboard)  
-- Go to Project Settings > Authentication > Providers > GitHub

-- Enable email/password authentication
-- This is enabled by default in Supabase

-- Re-enable RLS with proper policies
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Update policies to work with authenticated users
-- The existing policies should work once users are authenticated
