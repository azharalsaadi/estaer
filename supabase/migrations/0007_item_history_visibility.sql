-- Estaer — 0007: fix a historical-visibility gap found while building the
-- requests feature.
--
-- items_select / categories_select (0003_rls.sql) only ever let a member
-- see ACTIVE rows. That's correct for browsing, but it also silently hid
-- an item/category from a member viewing their OWN past request once an
-- admin deactivated that item or its category — violating
-- REQUIREMENTS.md §13 ("historical requests remain readable to their
-- authorized owners") and §14. Fixed by adding one more OR clause: a
-- member may also see an item/category that one of THEIR OWN requests
-- references, regardless of its current active state. This does not
-- widen browsing — deactivated items/categories still never appear in
-- listActiveItemsApi()/listActiveCategoriesApi() (those filter on
-- `active = true` themselves, independent of RLS).

drop policy if exists items_select on public.items;

create policy items_select
  on public.items for select
  to authenticated
  using (
    public.is_admin()
    or (
      active = true
      and exists (
        select 1
        from public.categories c
        where c.id = items.category_id and c.active = true
      )
    )
    or exists (
      select 1
      from public.requests r
      where r.item_id = items.id and r.user_id = auth.uid()
    )
  );

drop policy if exists categories_select on public.categories;

create policy categories_select
  on public.categories for select
  to authenticated
  using (
    active = true
    or public.is_admin()
    or exists (
      select 1
      from public.items i
      join public.requests r on r.item_id = i.id
      where i.category_id = categories.id and r.user_id = auth.uid()
    )
  );
