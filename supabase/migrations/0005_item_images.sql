-- Estaer — 0005: optional equipment images.
--
-- Storage bucket is PUBLIC (read) so a member's browser can load an image
-- directly by URL with no signed-URL plumbing — equipment photos are not
-- sensitive. Writes (upload/replace/delete) are admin-only, enforced by
-- RLS on storage.objects, exactly like every other admin-only write in
-- this project.

alter table public.items add column if not exists image_path text;

insert into storage.buckets (id, name, public)
values ('equipment-images', 'equipment-images', true)
on conflict (id) do nothing;

-- Admin-only write; the bucket being public already serves GETs without
-- any policy, but an explicit authenticated-read policy is added anyway
-- so a direct Data-API/storage SDK read (not the public URL) also works
-- for a signed-in user, consistent with "no anonymous access" elsewhere.
create policy equipment_images_authenticated_read
  on storage.objects for select
  to authenticated
  using (bucket_id = 'equipment-images');

create policy equipment_images_admin_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'equipment-images' and public.is_admin());

create policy equipment_images_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'equipment-images' and public.is_admin())
  with check (bucket_id = 'equipment-images' and public.is_admin());

create policy equipment_images_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'equipment-images' and public.is_admin());
