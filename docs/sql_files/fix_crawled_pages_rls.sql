-- Fix RLS policies for crawled_pages table
-- Run this in your Supabase SQL editor to allow INSERT and UPDATE operations

-- Create a policy that allows anyone to insert
create policy "Allow public insert access"
  on crawled_pages
  for insert
  to public
  with check (true);

-- Create a policy that allows anyone to update
create policy "Allow public update access"
  on crawled_pages
  for update
  to public
  using (true)
  with check (true);