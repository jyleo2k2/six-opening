create or replace function news_private.prevent_published_publication_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'draft' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'ready_for_storage'
    and new.status = 'published'
    and (to_jsonb(new) - array['status', 'published_at', 'updated_at'])
      = (to_jsonb(old) - array['status', 'published_at', 'updated_at']) then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'ready_for_storage'
    and new.status = 'withdrawn'
    and (to_jsonb(new) - array['status', 'updated_at'])
      = (to_jsonb(old) - array['status', 'updated_at']) then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'published'
    and new.status = 'withdrawn'
    and (to_jsonb(new) - array['status', 'updated_at'])
      = (to_jsonb(old) - array['status', 'updated_at']) then
    return new;
  end if;

  raise exception 'NEWS_PUBLICATION_IMMUTABLE';
end;
$$;

create or replace function news_private.prevent_published_article_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_article_id bigint;
begin
  target_article_id := case when tg_op = 'DELETE' then old.article_id else new.article_id end;

  if exists (
    select 1
    from public.news_publications as publication
    where publication.article_id = target_article_id
      and publication.status in ('ready_for_storage', 'published', 'withdrawn')
  ) then
    raise exception 'NEWS_PUBLICATION_EVIDENCE_IMMUTABLE';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function news_private.prevent_published_article_row_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_article_id bigint;
begin
  target_article_id := case when tg_op = 'DELETE' then old.id else new.id end;

  if exists (
    select 1
    from public.news_publications as publication
    where publication.article_id = target_article_id
      and publication.status in ('ready_for_storage', 'published', 'withdrawn')
  ) then
    raise exception 'NEWS_PUBLICATION_ARTICLE_IMMUTABLE';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function news_private.prevent_published_citation_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_publication_id bigint;
begin
  target_publication_id := case
    when tg_op = 'DELETE' then old.publication_id
    else new.publication_id
  end;

  if exists (
    select 1
    from public.news_publications as publication
    where publication.id = target_publication_id
      and publication.status in ('ready_for_storage', 'published', 'withdrawn')
  ) then
    raise exception 'NEWS_PUBLICATION_CITATIONS_IMMUTABLE';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
