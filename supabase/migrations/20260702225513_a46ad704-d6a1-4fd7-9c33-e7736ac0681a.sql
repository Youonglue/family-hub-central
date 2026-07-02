-- Push calendar / shopping / chore updates to every connected device in real time.
ALTER TABLE public.events            REPLICA IDENTITY FULL;
ALTER TABLE public.shopping_items    REPLICA IDENTITY FULL;
ALTER TABLE public.chore_completions REPLICA IDENTITY FULL;
ALTER TABLE public.meal_plan         REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.events;            EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_items;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chore_completions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plan;         EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;