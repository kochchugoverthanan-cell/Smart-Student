-- =====================================================================
-- 3/4: Storage. One private bucket for PDFs, restricted to PDF files up to 50 MB.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resources', 'resources', false, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

-- Anyone may read a file only if it belongs to a PUBLISHED resource. Administrators may read every file (drafts).
create policy "pdf: read published" on storage.objects for select to anon, authenticated
using (
  bucket_id = 'resources' and (
    public.is_admin()
    or exists (select 1 from public.resources r where r.file_path = storage.objects.name and r.status = 'published')
  )
);
create policy "pdf: admin upload" on storage.objects for insert to authenticated with check (bucket_id = 'resources' and public.is_admin());
create policy "pdf: admin replace" on storage.objects for update to authenticated using (bucket_id = 'resources' and public.is_admin()) with check (bucket_id = 'resources' and public.is_admin());
create policy "pdf: admin delete" on storage.objects for delete to authenticated using (bucket_id = 'resources' and public.is_admin());
