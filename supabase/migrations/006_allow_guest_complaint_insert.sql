-- Allow anonymous guests to insert complaints with default values or AI-routed values
DROP POLICY IF EXISTS "complaints_insert_citizen" ON public.complaints;
DROP POLICY IF EXISTS "complaints_insert_guest" ON public.complaints;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.complaints;
DROP POLICY IF EXISTS "Allow public complaint submission" ON public.complaints;

CREATE POLICY "complaints_insert_guest"
ON public.complaints
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);
