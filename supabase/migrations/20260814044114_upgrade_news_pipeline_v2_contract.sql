create or replace function news_private.valid_term_treatments_v2(treatments jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  treatment jsonb;
begin
  if jsonb_typeof(treatments) <> 'array' then
    return false;
  end if;

  for treatment in
    select item
    from jsonb_array_elements(treatments) as items(item)
  loop
    if jsonb_typeof(treatment) <> 'object'
      or not (treatment ?& array['term', 'treatment', 'easyText', 'sourceIds'])
      or jsonb_typeof(treatment -> 'term') <> 'string'
      or char_length(btrim(treatment ->> 'term')) not between 1 and 120
      or treatment ->> 'treatment' <> 'explained'
      or jsonb_typeof(treatment -> 'easyText') <> 'string'
      or char_length(btrim(treatment ->> 'easyText')) not between 1 and 500
      or jsonb_typeof(treatment -> 'sourceIds') <> 'array'
      or jsonb_array_length(treatment -> 'sourceIds') = 0 then
      return false;
    end if;

    if exists (
      select 1
      from jsonb_array_elements(treatment -> 'sourceIds') as source_ids(source_id)
      where jsonb_typeof(source_id) <> 'string'
        or (source_id #>> '{}') !~ '^[A-Za-z0-9_-]{1,40}$'
    ) then
      return false;
    end if;

    if (
      select count(*) <> count(distinct source_id #>> '{}')
      from jsonb_array_elements(treatment -> 'sourceIds') as source_ids(source_id)
    ) then
      return false;
    end if;
  end loop;

  if (
    select count(*) <> count(distinct item ->> 'term')
    from jsonb_array_elements(treatments) as items(item)
  ) then
    return false;
  end if;

  return true;
end;
$$;

alter table public.news_publications
  add column summary_line_1_fact_key text,
  add column summary_line_2_fact_key text,
  add column summary_line_3_fact_key text,
  add column price_connection_kind text,
  add column price_connection_basis text,
  add column price_connection_text text,
  add column review_same_headline_across_surfaces boolean,
  add column review_distinct_summary_facts boolean,
  add column review_price_connection_grounded boolean,
  add column review_term_explanation_coverage boolean;

alter table public.news_citations
  drop constraint news_citations_output_field_check,
  add constraint news_citations_output_field_check check (output_field in (
    'headline',
    'home_summary',
    'summary_line_1',
    'summary_line_2',
    'summary_line_3',
    'price_connection'
  ));

alter table public.news_publications
  disable trigger news_publications_prevent_published_mutation;
alter table public.news_source_units
  disable trigger news_source_units_prevent_published_mutation;
alter table public.news_citations
  disable trigger news_citations_prevent_published_mutation;

update public.news_pipeline_runs
set
  contract_version = 'child-news-role-pipeline-v2',
  prompt_version = 'approved-price-linked-max-v2',
  criteria_passed = true,
  completed_at = '2026-08-14T03:47:14.710Z'::timestamptz
where run_key = 'latest-economic-news-2026-08-13-luna';

update public.news_source_units as source_unit
set is_selected = true
from public.news_articles as article
where article.id = source_unit.article_id
  and article.external_article_id = 'N1001'
  and source_unit.source_unit_id = 'S3';

update public.news_publications as publication
set
  headline = '코스피, 3.56% 올라 6813.34로 마감',
  home_summary = '코스피, 3.56% 올라 6813.34로 마감',
  summary_line_1 = '전날보다 234.30포인트 올랐어요.',
  summary_line_1_fact_key = 'kospi_points',
  summary_line_2 = '코스닥도 0.29% 오른 1419.4였어요.',
  summary_line_2_fact_key = 'kosdaq_close',
  summary_line_3 = '원·달러 환율은 7.7원 내렸어요.',
  summary_line_3_fact_key = 'exchange_rate',
  price_connection_kind = 'market_index',
  price_connection_basis = 'event_education',
  price_connection_text = '코스피와 코스닥은 국내 주식시장 흐름을 보여주는 숫자예요.',
  term_treatments = '[
    {"term":"코스피","easyText":"국내 주식시장을 대표하는 숫자","treatment":"explained","sourceIds":["S1"]},
    {"term":"포인트","easyText":"주식시장 숫자가 얼마나 움직였는지 나타내는 단위","treatment":"explained","sourceIds":["S1","S2"]},
    {"term":"코스닥","easyText":"성장 기업이 많이 모인 국내 주식시장의 숫자","treatment":"explained","sourceIds":["S2"]},
    {"term":"서울 외환시장","easyText":"서울에서 나라 돈을 바꾸는 시장","treatment":"explained","sourceIds":["S3"]},
    {"term":"원·달러 환율","easyText":"한국 돈과 미국 달러를 바꾸는 비율","treatment":"explained","sourceIds":["S3"]}
  ]'::jsonb,
  review_same_headline_across_surfaces = true,
  review_distinct_summary_facts = true,
  review_price_connection_grounded = true,
  review_term_explanation_coverage = true,
  updated_at = now()
from public.news_articles as article
where article.id = publication.article_id
  and article.external_article_id = 'N1001';

update public.news_publications as publication
set
  headline = '한국전력, 2026년 2분기 영업이익 지난해 같은 기간보다 47.2% 줄어',
  home_summary = '한국전력, 2026년 2분기 영업이익 지난해 같은 기간보다 47.2% 줄어',
  summary_line_1 = '영업이익은 1조1286억원이에요.',
  summary_line_1_fact_key = 'operating_profit_amount',
  summary_line_2 = '매출은 21조9189억원이고 순이익은 2775억원이에요.',
  summary_line_2_fact_key = 'revenue_net_income_amounts',
  summary_line_3 = '한국전력은 전기 판매량 감소와 연료비 증가를 원인으로 들었어요.',
  summary_line_3_fact_key = 'cited_profit_reasons',
  price_connection_kind = 'business_performance',
  price_connection_basis = 'event_education',
  price_connection_text = '영업이익과 매출의 변화는 회사의 사업 흐름과 연결돼요.',
  term_treatments = '[
    {"term":"영업이익","easyText":"회사가 본업으로 벌어 비용을 빼고 남긴 돈","treatment":"explained","sourceIds":["S1","S3"]},
    {"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S2"]},
    {"term":"순이익","easyText":"모든 비용을 빼고 마지막에 남은 돈","treatment":"explained","sourceIds":["S2"]},
    {"term":"전기 판매량","easyText":"팔린 전기의 양","treatment":"explained","sourceIds":["S3"]},
    {"term":"연료비","easyText":"전기를 만들 때 쓰는 연료에 드는 돈","treatment":"explained","sourceIds":["S3"]}
  ]'::jsonb,
  review_same_headline_across_surfaces = true,
  review_distinct_summary_facts = true,
  review_price_connection_grounded = true,
  review_term_explanation_coverage = true,
  updated_at = now()
from public.news_articles as article
where article.id = publication.article_id
  and article.external_article_id = 'N1003';

delete from public.news_citations as citation
using public.news_articles as article
where article.id = citation.article_id
  and article.external_article_id in ('N1001', 'N1003');

insert into public.news_citations (
  publication_id,
  article_id,
  output_field,
  source_unit_id
)
select publication.id, publication.article_id, seed.output_field, seed.source_unit_id
from public.news_publications as publication
join public.news_articles as article on article.id = publication.article_id
join (
  values
    ('N1001', 'headline', 'S1'),
    ('N1001', 'home_summary', 'S1'),
    ('N1001', 'summary_line_1', 'S1'),
    ('N1001', 'summary_line_2', 'S2'),
    ('N1001', 'summary_line_3', 'S3'),
    ('N1001', 'price_connection', 'S1'),
    ('N1001', 'price_connection', 'S2'),
    ('N1003', 'headline', 'S1'),
    ('N1003', 'home_summary', 'S1'),
    ('N1003', 'summary_line_1', 'S1'),
    ('N1003', 'summary_line_2', 'S2'),
    ('N1003', 'summary_line_3', 'S3'),
    ('N1003', 'price_connection', 'S1'),
    ('N1003', 'price_connection', 'S2')
) as seed(external_article_id, output_field, source_unit_id)
  on seed.external_article_id = article.external_article_id;

alter table public.news_publications
  enable trigger news_publications_prevent_published_mutation;
alter table public.news_source_units
  enable trigger news_source_units_prevent_published_mutation;
alter table public.news_citations
  enable trigger news_citations_prevent_published_mutation;

do $$
begin
  if exists (
    select 1
    from public.news_publications
    where summary_line_1_fact_key is null
      or summary_line_2_fact_key is null
      or summary_line_3_fact_key is null
      or price_connection_kind is null
      or price_connection_basis is null
      or price_connection_text is null
      or review_same_headline_across_surfaces is null
      or review_distinct_summary_facts is null
      or review_price_connection_grounded is null
      or review_term_explanation_coverage is null
  ) then
    raise exception 'NEWS_V2_BACKFILL_REQUIRED_FOR_EXISTING_PUBLICATION';
  end if;
end;
$$;

alter table public.news_publications
  alter column summary_line_1_fact_key set not null,
  alter column summary_line_2_fact_key set not null,
  alter column summary_line_3_fact_key set not null,
  alter column price_connection_kind set not null,
  alter column price_connection_basis set not null,
  alter column price_connection_text set not null,
  alter column review_same_headline_across_surfaces set not null,
  alter column review_distinct_summary_facts set not null,
  alter column review_price_connection_grounded set not null,
  alter column review_term_explanation_coverage set not null;

alter table public.news_publications
  drop constraint news_publications_headline_check,
  drop constraint news_publications_term_treatments_check,
  drop constraint news_publications_release_gate_check,
  add constraint news_publications_headline_check check (
    char_length(btrim(headline)) between 1 and 44
  ),
  add constraint news_publications_headline_surface_match_check check (
    home_summary = headline
  ),
  add constraint news_publications_summary_fact_keys_check check (
    summary_line_1_fact_key ~ '^[a-z][a-z0-9_]*$'
    and summary_line_2_fact_key ~ '^[a-z][a-z0-9_]*$'
    and summary_line_3_fact_key ~ '^[a-z][a-z0-9_]*$'
    and summary_line_1_fact_key <> summary_line_2_fact_key
    and summary_line_1_fact_key <> summary_line_3_fact_key
    and summary_line_2_fact_key <> summary_line_3_fact_key
  ),
  add constraint news_publications_price_connection_check check (
    price_connection_kind in (
      'market_index',
      'observed_price_move',
      'production_capacity',
      'contracted_business',
      'business_combination',
      'operational_continuity',
      'shareholder_return',
      'recurring_sales',
      'ownership_and_credit',
      'business_performance',
      'regulatory_permission',
      'legal_or_recall_cost'
    )
    and price_connection_basis in ('article_fact', 'event_education')
    and char_length(btrim(price_connection_text)) between 1 and 500
  ),
  add constraint news_publications_event_price_connection_check check (
    (selector_event_type = 'observed_market_move'
      and price_connection_kind in ('market_index', 'observed_price_move'))
    or (selector_event_type = 'earnings'
      and price_connection_kind = 'business_performance')
    or (selector_event_type = 'sales_or_production'
      and price_connection_kind in (
        'production_capacity', 'recurring_sales', 'business_performance'
      ))
    or (selector_event_type = 'binding_contract'
      and price_connection_kind = 'contracted_business')
    or (selector_event_type = 'merger_or_ownership'
      and price_connection_kind in ('business_combination', 'ownership_and_credit'))
    or (selector_event_type = 'capital_or_dividend'
      and price_connection_kind in ('shareholder_return', 'ownership_and_credit'))
    or (selector_event_type = 'regulatory_decision'
      and price_connection_kind = 'regulatory_permission')
    or (selector_event_type = 'litigation_or_recall'
      and price_connection_kind in ('legal_or_recall_cost', 'operational_continuity'))
    or (selector_event_type = 'material_operational_risk'
      and price_connection_kind = 'operational_continuity')
  ),
  add constraint news_publications_term_treatments_check check (
    news_private.valid_term_treatments_v2(term_treatments)
  ),
  add constraint news_publications_release_gate_check check (
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
      and review_same_headline_across_surfaces
      and review_distinct_summary_facts
      and review_price_connection_grounded
      and review_term_explanation_coverage
      and review_investment_safety
      and review_no_sentiment_label
      and ready_at is not null
    )
  );

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

  if exists (
    select 1
    from jsonb_array_elements(new.term_treatments) as treatments(treatment)
    cross join jsonb_array_elements_text(treatment -> 'sourceIds') as source_ids(source_id)
    left join public.news_source_units as unit
      on unit.article_id = new.article_id
      and unit.source_unit_id = source_id
    where unit.source_unit_id is null or not unit.is_selected
  ) then
    raise exception 'NEWS_PUBLICATION_TERM_SOURCE_INVALID';
  end if;

  select count(distinct citation.output_field)
    into selected_output_count
  from public.news_citations as citation
  join public.news_source_units as unit
    on unit.article_id = citation.article_id
    and unit.source_unit_id = citation.source_unit_id
  where citation.publication_id = new.id
    and unit.is_selected;

  if selected_output_count <> 6 then
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
    and citation.output_field in ('headline', 'home_summary');

  if anchor_output_count <> 2 then
    raise exception 'NEWS_PUBLICATION_ANCHOR_REQUIRED';
  end if;

  return new;
end;
$$;

create or replace view public.news_feed_items
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
  publication.published_at,
  array[
    publication.summary_line_1_fact_key,
    publication.summary_line_2_fact_key,
    publication.summary_line_3_fact_key
  ]::text[] as summary_fact_keys,
  jsonb_build_array(
    jsonb_build_object(
      'factKey', publication.summary_line_1_fact_key,
      'text', publication.summary_line_1,
      'sourceIds', coalesce((
        select jsonb_agg(citation.source_unit_id order by citation.source_unit_id)
        from public.news_citations as citation
        where citation.publication_id = publication.id
          and citation.output_field = 'summary_line_1'
      ), '[]'::jsonb)
    ),
    jsonb_build_object(
      'factKey', publication.summary_line_2_fact_key,
      'text', publication.summary_line_2,
      'sourceIds', coalesce((
        select jsonb_agg(citation.source_unit_id order by citation.source_unit_id)
        from public.news_citations as citation
        where citation.publication_id = publication.id
          and citation.output_field = 'summary_line_2'
      ), '[]'::jsonb)
    ),
    jsonb_build_object(
      'factKey', publication.summary_line_3_fact_key,
      'text', publication.summary_line_3,
      'sourceIds', coalesce((
        select jsonb_agg(citation.source_unit_id order by citation.source_unit_id)
        from public.news_citations as citation
        where citation.publication_id = publication.id
          and citation.output_field = 'summary_line_3'
      ), '[]'::jsonb)
    )
  ) as summary_items,
  jsonb_build_object(
    'kind', publication.price_connection_kind,
    'basis', publication.price_connection_basis,
    'text', publication.price_connection_text,
    'sourceIds', coalesce((
      select jsonb_agg(citation.source_unit_id order by citation.source_unit_id)
      from public.news_citations as citation
      where citation.publication_id = publication.id
        and citation.output_field = 'price_connection'
    ), '[]'::jsonb)
  ) as price_connection,
  publication.term_treatments
from public.news_publications as publication
join public.news_articles as article on article.id = publication.article_id
left join public.news_article_stocks as article_stock
  on article_stock.article_id = article.id
  and article_stock.subject_role = 'primary'
left join public.stocks as stock on stock.stock_id = article_stock.stock_id
where publication.status = 'published'
group by publication.id, article.id;

revoke all on table public.news_feed_items from anon, authenticated;
grant select on table public.news_feed_items to service_role;

revoke execute on function news_private.valid_term_treatments_v2(jsonb)
  from public, anon, authenticated;
grant execute on function news_private.valid_term_treatments_v2(jsonb)
  to service_role;

revoke execute on function news_private.assert_news_publication_integrity()
  from public, anon, authenticated;
grant execute on function news_private.assert_news_publication_integrity()
  to service_role;
