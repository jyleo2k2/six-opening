begin;

create schema if not exists news_private;
revoke all on schema news_private from public, anon, authenticated;
grant usage on schema news_private to service_role;

create table public.news_pipeline_runs (
  id bigint generated always as identity primary key,
  run_key text not null unique,
  run_date_kst date not null,
  model text not null check (model = 'gpt-5.6-luna'),
  contract_version text not null,
  prompt_version text not null,
  source_count integer not null check (source_count >= 0),
  ready_count integer not null check (ready_count >= 0 and ready_count <= source_count),
  rejected_count integer not null check (rejected_count >= 0 and rejected_count <= source_count),
  criteria_passed boolean not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint news_pipeline_runs_counts_check
    check (ready_count + rejected_count = source_count),
  constraint news_pipeline_runs_time_check
    check (completed_at is null or completed_at >= started_at)
);

create table public.news_articles (
  id bigint generated always as identity primary key,
  pipeline_run_id bigint not null references public.news_pipeline_runs(id) on delete restrict,
  source_key text not null unique,
  external_article_id text not null,
  run_date_kst date not null,
  scope text not null check (scope in ('market', 'company')),
  source_event_type text not null check (source_event_type in (
    'observed_market_move',
    'earnings',
    'sales_or_production',
    'binding_contract',
    'merger_or_ownership',
    'capital_or_dividend',
    'regulatory_decision',
    'litigation_or_recall',
    'material_operational_risk'
  )),
  original_title text not null check (char_length(btrim(original_title)) between 1 and 300),
  publisher text not null check (char_length(btrim(publisher)) between 1 and 120),
  source_published_at timestamptz not null,
  source_url text not null check (source_url ~ '^https?://'),
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  pipeline_result text not null check (pipeline_result in ('rejected', 'ready_for_storage')),
  reject_stage text check (reject_stage in ('input', 'prefilter', 'selector', 'editor', 'reviewer')),
  reject_codes text[] not null default '{}'::text[],
  reject_reasons text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  constraint news_articles_run_external_unique unique (pipeline_run_id, external_article_id),
  constraint news_articles_reject_shape_check check (
    (
      pipeline_result = 'rejected'
      and reject_stage is not null
      and cardinality(reject_codes) > 0
      and cardinality(reject_reasons) > 0
    )
    or
    (
      pipeline_result = 'ready_for_storage'
      and reject_stage is null
      and cardinality(reject_codes) = 0
      and cardinality(reject_reasons) = 0
    )
  )
);

create index news_articles_pipeline_run_id_idx
  on public.news_articles (pipeline_run_id);

create table public.news_source_units (
  article_id bigint not null references public.news_articles(id) on delete cascade,
  source_unit_id text not null check (source_unit_id ~ '^[A-Za-z0-9_-]{1,40}$'),
  ordinal smallint not null check (ordinal > 0),
  source_text text not null check (char_length(btrim(source_text)) between 1 and 2000),
  source_text_hash text not null check (source_text_hash ~ '^[0-9a-f]{64}$'),
  is_selected boolean not null default false,
  is_anchor boolean not null default false,
  primary key (article_id, source_unit_id),
  constraint news_source_units_article_ordinal_unique unique (article_id, ordinal),
  constraint news_source_units_anchor_selected_check check (not is_anchor or is_selected)
);

create table public.news_article_stocks (
  article_id bigint not null references public.news_articles(id) on delete cascade,
  stock_id integer not null references public.stocks(stock_id) on delete restrict,
  subject_role text not null check (subject_role in ('primary', 'mentioned')),
  primary key (article_id, stock_id)
);

create index news_article_stocks_stock_id_article_id_idx
  on public.news_article_stocks (stock_id, article_id);

create table public.news_publications (
  id bigint generated always as identity primary key,
  article_id bigint not null unique references public.news_articles(id) on delete cascade,
  status text not null default 'draft' check (
    status in ('draft', 'ready_for_storage', 'published', 'withdrawn')
  ),
  selector_event_type text not null,
  reviewer_event_type text not null,
  selector_stock_codes text[] not null default '{}'::text[],
  reviewer_stock_codes text[] not null default '{}'::text[],
  focus_statement text not null check (char_length(btrim(focus_statement)) between 1 and 500),
  headline text not null check (char_length(btrim(headline)) between 1 and 60),
  home_summary text not null check (char_length(btrim(home_summary)) between 1 and 180),
  summary_line_1 text not null check (char_length(btrim(summary_line_1)) between 1 and 36),
  summary_line_2 text not null check (char_length(btrim(summary_line_2)) between 1 and 36),
  summary_line_3 text not null check (char_length(btrim(summary_line_3)) between 1 and 36),
  term_treatments jsonb not null default '[]'::jsonb
    check (jsonb_typeof(term_treatments) = 'array'),
  deterministic_facts_pass boolean not null,
  review_allowed_scope boolean not null,
  review_primary_subject boolean not null,
  review_direct_materiality boolean not null,
  review_source_fidelity boolean not null,
  review_focus_alignment boolean not null,
  review_concise_three_line_summary boolean not null,
  review_no_irrelevant_detail boolean not null,
  review_attribution_and_timing boolean not null,
  review_all_terms_easy boolean not null,
  review_investment_safety boolean not null,
  review_no_sentiment_label boolean not null,
  editor_attempts smallint not null check (editor_attempts between 1 and 2),
  ready_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint news_publications_id_article_unique unique (id, article_id),
  constraint news_publications_roles_agree_check check (
    selector_event_type = reviewer_event_type
    and selector_stock_codes = reviewer_stock_codes
  ),
  constraint news_publications_release_gate_check check (
    status not in ('ready_for_storage', 'published')
    or (
      deterministic_facts_pass
      and review_allowed_scope
      and review_primary_subject
      and review_direct_materiality
      and review_source_fidelity
      and review_focus_alignment
      and review_concise_three_line_summary
      and review_no_irrelevant_detail
      and review_attribution_and_timing
      and review_all_terms_easy
      and review_investment_safety
      and review_no_sentiment_label
      and ready_at is not null
    )
  ),
  constraint news_publications_published_time_check check (
    status <> 'published' or published_at is not null
  )
);

create table public.news_citations (
  publication_id bigint not null,
  article_id bigint not null,
  output_field text not null check (output_field in (
    'headline',
    'home_summary',
    'summary_line_1',
    'summary_line_2',
    'summary_line_3'
  )),
  source_unit_id text not null,
  primary key (publication_id, output_field, source_unit_id),
  constraint news_citations_publication_article_fkey
    foreign key (publication_id, article_id)
    references public.news_publications(id, article_id)
    on delete cascade,
  constraint news_citations_article_source_fkey
    foreign key (article_id, source_unit_id)
    references public.news_source_units(article_id, source_unit_id)
    on delete restrict
);

create index news_citations_article_source_idx
  on public.news_citations (article_id, source_unit_id);

create or replace function news_private.assert_news_publication_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  article_scope text;
  article_event_type text;
  article_result text;
  primary_codes text[];
  selected_output_count integer;
  anchor_output_count integer;
begin
  if new.status not in ('ready_for_storage', 'published') then
    return new;
  end if;

  select a.scope, a.source_event_type, a.pipeline_result
    into article_scope, article_event_type, article_result
  from public.news_articles as a
  where a.id = new.article_id;

  if not found or article_result <> 'ready_for_storage' then
    raise exception 'NEWS_PUBLICATION_ARTICLE_NOT_READY';
  end if;

  select coalesce(array_agg(s.stock_code order by s.stock_code), '{}'::text[])
    into primary_codes
  from public.news_article_stocks as article_stock
  join public.stocks as s on s.stock_id = article_stock.stock_id
  where article_stock.article_id = new.article_id
    and article_stock.subject_role = 'primary';

  if article_scope = 'company' and cardinality(primary_codes) = 0 then
    raise exception 'NEWS_PUBLICATION_PRIMARY_SUBJECT_REQUIRED';
  end if;

  if article_scope = 'market' and cardinality(primary_codes) <> 0 then
    raise exception 'NEWS_PUBLICATION_MARKET_SUBJECT_MUST_BE_EMPTY';
  end if;

  if new.selector_stock_codes <> primary_codes
    or new.reviewer_stock_codes <> primary_codes then
    raise exception 'NEWS_PUBLICATION_SUBJECT_MISMATCH';
  end if;

  if new.selector_event_type <> article_event_type
    or new.reviewer_event_type <> article_event_type then
    raise exception 'NEWS_PUBLICATION_EVENT_MISMATCH';
  end if;

  if exists (
    select 1
    from public.news_citations as citation
    join public.news_source_units as unit
      on unit.article_id = citation.article_id
      and unit.source_unit_id = citation.source_unit_id
    where citation.publication_id = new.id
      and not unit.is_selected
  ) then
    raise exception 'NEWS_PUBLICATION_UNSELECTED_SOURCE';
  end if;

  select count(distinct citation.output_field)
    into selected_output_count
  from public.news_citations as citation
  join public.news_source_units as unit
    on unit.article_id = citation.article_id
    and unit.source_unit_id = citation.source_unit_id
  where citation.publication_id = new.id
    and unit.is_selected;

  if selected_output_count <> 5 then
    raise exception 'NEWS_PUBLICATION_CITATIONS_REQUIRED';
  end if;

  select count(distinct citation.output_field)
    into anchor_output_count
  from public.news_citations as citation
  join public.news_source_units as unit
    on unit.article_id = citation.article_id
    and unit.source_unit_id = citation.source_unit_id
  where citation.publication_id = new.id
    and unit.is_anchor
    and citation.output_field in ('headline', 'home_summary', 'summary_line_1');

  if anchor_output_count <> 3 then
    raise exception 'NEWS_PUBLICATION_ANCHOR_REQUIRED';
  end if;

  return new;
end;
$$;

create or replace function news_private.prevent_published_publication_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status <> 'published' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE'
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
      and publication.status = 'published'
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
      and publication.status = 'published'
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
      and publication.status = 'published'
  ) then
    raise exception 'NEWS_PUBLICATION_CITATIONS_IMMUTABLE';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger news_publications_assert_integrity
before insert or update of status
on public.news_publications
for each row
execute function news_private.assert_news_publication_integrity();

create trigger news_publications_prevent_published_mutation
before update or delete
on public.news_publications
for each row
execute function news_private.prevent_published_publication_mutation();

create trigger news_source_units_prevent_published_mutation
before insert or update or delete
on public.news_source_units
for each row
execute function news_private.prevent_published_article_mutation();

create trigger news_articles_prevent_published_mutation
before update or delete
on public.news_articles
for each row
execute function news_private.prevent_published_article_row_mutation();

create trigger news_article_stocks_prevent_published_mutation
before insert or update or delete
on public.news_article_stocks
for each row
execute function news_private.prevent_published_article_mutation();

create trigger news_citations_prevent_published_mutation
before insert or update or delete
on public.news_citations
for each row
execute function news_private.prevent_published_citation_mutation();

create view public.news_feed_items
with (security_invoker = true)
as
select
  publication.id as news_id,
  article.id as article_id,
  article.scope,
  article.original_title,
  article.publisher,
  article.source_published_at,
  article.source_url,
  publication.selector_event_type as event_type,
  publication.headline,
  publication.home_summary,
  array[
    publication.summary_line_1,
    publication.summary_line_2,
    publication.summary_line_3
  ]::text[] as summary_lines,
  coalesce(
    array_agg(stock.stock_code order by stock.stock_code)
      filter (where stock.stock_code is not null),
    '{}'::text[]
  ) as stock_codes,
  publication.published_at
from public.news_publications as publication
join public.news_articles as article on article.id = publication.article_id
left join public.news_article_stocks as article_stock
  on article_stock.article_id = article.id
  and article_stock.subject_role = 'primary'
left join public.stocks as stock on stock.stock_id = article_stock.stock_id
where publication.status = 'published'
group by publication.id, article.id;

alter table public.news_pipeline_runs enable row level security;
alter table public.news_articles enable row level security;
alter table public.news_source_units enable row level security;
alter table public.news_article_stocks enable row level security;
alter table public.news_publications enable row level security;
alter table public.news_citations enable row level security;

alter table public.news_pipeline_runs force row level security;
alter table public.news_articles force row level security;
alter table public.news_source_units force row level security;
alter table public.news_article_stocks force row level security;
alter table public.news_publications force row level security;
alter table public.news_citations force row level security;

revoke all on table public.news_pipeline_runs from anon, authenticated;
revoke all on table public.news_articles from anon, authenticated;
revoke all on table public.news_source_units from anon, authenticated;
revoke all on table public.news_article_stocks from anon, authenticated;
revoke all on table public.news_publications from anon, authenticated;
revoke all on table public.news_citations from anon, authenticated;
revoke all on table public.news_feed_items from anon, authenticated;

grant select, insert, update on table public.news_pipeline_runs to service_role;
grant select, insert, update on table public.news_articles to service_role;
grant select, insert, update on table public.news_source_units to service_role;
grant select, insert, update on table public.news_article_stocks to service_role;
grant select, insert, update on table public.news_publications to service_role;
grant select, insert, update on table public.news_citations to service_role;
grant select on table public.news_feed_items to service_role;

grant usage, select on sequence public.news_pipeline_runs_id_seq to service_role;
grant usage, select on sequence public.news_articles_id_seq to service_role;
grant usage, select on sequence public.news_publications_id_seq to service_role;

revoke execute on function news_private.assert_news_publication_integrity() from public, anon, authenticated;
revoke execute on function news_private.prevent_published_publication_mutation() from public, anon, authenticated;
revoke execute on function news_private.prevent_published_article_mutation() from public, anon, authenticated;
revoke execute on function news_private.prevent_published_article_row_mutation() from public, anon, authenticated;
revoke execute on function news_private.prevent_published_citation_mutation() from public, anon, authenticated;
grant execute on function news_private.assert_news_publication_integrity() to service_role;
grant execute on function news_private.prevent_published_publication_mutation() to service_role;
grant execute on function news_private.prevent_published_article_mutation() to service_role;
grant execute on function news_private.prevent_published_article_row_mutation() to service_role;
grant execute on function news_private.prevent_published_citation_mutation() to service_role;

commit;
