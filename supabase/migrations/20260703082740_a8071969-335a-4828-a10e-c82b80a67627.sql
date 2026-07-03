
-- Family member role
ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS is_parent boolean NOT NULL DEFAULT false;

-- Chore completion approval status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chore_completion_status') THEN
    CREATE TYPE public.chore_completion_status AS ENUM ('pending','approved','rejected');
  END IF;
END $$;

ALTER TABLE public.chore_completions ADD COLUMN IF NOT EXISTS status public.chore_completion_status NOT NULL DEFAULT 'approved';
ALTER TABLE public.chore_completions ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.family_members(id) ON DELETE SET NULL;
ALTER TABLE public.chore_completions ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Existing rows: keep as approved. New rows from app default to 'pending' via server function.

-- Rebuild leaderboard view to only count approved completions
DROP VIEW IF EXISTS public.member_points;
CREATE VIEW public.member_points
WITH (security_invoker = true)
AS
SELECT m.id AS member_id,
       m.owner_id,
       m.name,
       m.avatar_color,
       m.is_kid,
       m.is_parent,
       COALESCE(earned.pts, 0) - COALESCE(spent.pts, 0) AS balance,
       COALESCE(earned.week_pts, 0) AS week_points
FROM public.family_members m
LEFT JOIN (
  SELECT member_id,
         SUM(points_awarded) AS pts,
         SUM(CASE WHEN completed_at >= now() - interval '7 days' THEN points_awarded ELSE 0 END) AS week_pts
  FROM public.chore_completions
  WHERE status = 'approved'
  GROUP BY member_id
) earned ON earned.member_id = m.id
LEFT JOIN (
  SELECT member_id, SUM(points_spent) AS pts
  FROM public.redemptions
  GROUP BY member_id
) spent ON spent.member_id = m.id;

GRANT SELECT ON public.member_points TO authenticated;
GRANT ALL ON public.member_points TO service_role;

CREATE INDEX IF NOT EXISTS idx_completions_status ON public.chore_completions(status);
