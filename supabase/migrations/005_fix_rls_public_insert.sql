-- Enable RLS on complaints table
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Drop any restrictive insert policy if exists
DROP POLICY IF EXISTS "Enable insert for all users" ON public.complaints;
DROP POLICY IF EXISTS "Allow public complaint submission" ON public.complaints;
DROP POLICY IF EXISTS "complaints_insert_citizen" ON public.complaints;

-- Create permissive insert policy for public/anonymous users
CREATE POLICY "Allow public complaint submission"
ON public.complaints FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

-- Create permissive select policy so anyone can track complaints
CREATE POLICY "Allow public complaint tracking"
ON public.complaints FOR SELECT
TO anon, authenticated, service_role
USING (true);
