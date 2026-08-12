-- EFFIROAD Learn: enable Supabase Realtime for learning records
-- Run after `npm run learn:push`

alter publication supabase_realtime add table learn_notes;
alter publication supabase_realtime add table learn_planner_items;
alter publication supabase_realtime add table learn_progress;

-- Row Level Security (enable after Supabase Auth integration)
-- alter table learn_notes enable row level security;
-- create policy "Users own notes" on learn_notes for all using (auth.uid()::text = "userId");
