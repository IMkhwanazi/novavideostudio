CREATE TABLE public.generation_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  idx integer NOT NULL,
  scene_prompt text NOT NULL,
  seconds integer NOT NULL DEFAULT 8,
  provider_job_id text,
  status text NOT NULL DEFAULT 'pending',
  video_path text,
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, idx)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_segments TO authenticated;
GRANT ALL ON public.generation_segments TO service_role;

ALTER TABLE public.generation_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own generation segments"
ON public.generation_segments FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_generation_segments_updated_at
BEFORE UPDATE ON public.generation_segments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX generation_segments_job_idx ON public.generation_segments (job_id, idx);

ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS total_segments integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS completed_segments integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merged boolean NOT NULL DEFAULT false;