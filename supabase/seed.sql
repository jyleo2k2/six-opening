begin;

insert into public.news_pipeline_runs (
  run_key,
  run_date_kst,
  model,
  contract_version,
  prompt_version,
  source_count,
  ready_count,
  rejected_count,
  criteria_passed,
  started_at,
  completed_at
) values (
  'latest-economic-news-2026-08-13-luna',
  '2026-08-13',
  'gpt-5.6-luna',
  'child-news-role-pipeline-v2',
  'approved-price-linked-max-v2',
  10,
  3,
  7,
  true,
  '2026-08-13T07:30:00.000Z',
  '2026-08-14T03:47:14.710Z'
)
on conflict (run_key) do nothing;

insert into public.news_articles (
  pipeline_run_id,
  source_key,
  external_article_id,
  run_date_kst,
  scope,
  source_event_type,
  original_title,
  publisher,
  source_published_at,
  source_url,
  evidence_hash,
  pipeline_result
)
select
  run.id,
  seed.source_key,
  seed.external_article_id,
  seed.run_date_kst,
  seed.scope,
  seed.source_event_type,
  seed.original_title,
  seed.publisher,
  seed.source_published_at,
  seed.source_url,
  seed.evidence_hash,
  'ready_for_storage'
from public.news_pipeline_runs as run
cross join (
  values
    (
      'f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35',
      'N1001',
      '2026-08-13'::date,
      'market',
      'observed_market_move',
      '상승 마감한 코스피·코스닥',
      '뉴스핌',
      '2026-08-13T06:49:00.000Z'::timestamptz,
      'https://www.newspim.com/news/view/20260813001115',
      'e5e284649c61fa620644f5480852041008141eff22984c3f0eb1277f4f2df183'
    ),
    (
      '8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82',
      'N1003',
      '2026-08-13'::date,
      'company',
      'earnings',
      '한전, 올해 2분기 영업익 1조1286억원…전년比 47.2%↓',
      '에너지경제신문',
      '2026-08-12T08:27:00.000Z'::timestamptz,
      'https://www.ekn.kr/web/view.php?key=20260812021142119',
      'abf9ac5b482957e7401c3e18b63198305a494f93a446683891a6712e50c8bd96'
    )
) as seed(
  source_key,
  external_article_id,
  run_date_kst,
  scope,
  source_event_type,
  original_title,
  publisher,
  source_published_at,
  source_url,
  evidence_hash
)
where run.run_key = 'latest-economic-news-2026-08-13-luna'
on conflict (source_key) do nothing;

insert into public.news_source_units (
  article_id,
  source_unit_id,
  ordinal,
  source_text,
  source_text_hash,
  is_selected,
  is_anchor
)
select article.id, unit.source_unit_id, unit.ordinal, unit.source_text,
  unit.source_text_hash, unit.is_selected, unit.is_anchor
from public.news_articles as article
join (
  values
    (
      'f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35',
      'S1', 1::smallint,
      '13일 코스피는 전날보다 234.30포인트(3.56%) 오른 6813.34에 마감했다.',
      '619ea4223bf3f5737b580c3b5c73fd764587bf63b2735b785e540dade6b44bb7',
      true, true
    ),
    (
      'f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35',
      'S2', 2::smallint,
      '같은 날 코스닥은 2.46포인트(0.29%) 오른 1419.4에 마감했다.',
      '9c183bc349369bc70ae4b4a13015a59faf652d3b1eedf5ff34a24004e43f02c6',
      true, false
    ),
    (
      'f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35',
      'S3', 3::smallint,
      '서울 외환시장에서 원·달러 환율은 7.7원 내린 1416.1원에 마감했다.',
      'da54efe990b418152e78f8495f65130ffbce86b6e3a5e68f79262baa51053b6b',
      true, false
    ),
    (
      '8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82',
      'S1', 1::smallint,
      '한국전력의 2026년 2분기 영업이익은 1조1286억원으로 지난해 같은 기간보다 47.2% 줄었다.',
      'a63c24556451f92856a0ecfc7132b2de2e0cbf3dc765d7b8dab9b9c1ed3395ab',
      true, true
    ),
    (
      '8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82',
      'S2', 2::smallint,
      '매출은 21조9189억원으로 0.1% 줄었고, 순이익은 2775억원으로 76.4% 줄었다.',
      '5bb163966f92387b99f7bf187fd7b218bba151ddeb2a973a9a9704294e4c855c',
      true, false
    ),
    (
      '8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82',
      'S3', 3::smallint,
      '한국전력은 전기 판매량이 조금 줄고 연료비가 늘어난 점을 영업이익 감소 원인으로 들었다.',
      'e39939f64057acbf7b9db70fac57042ea9c874e66ceee76291f31348510ad94f',
      true, false
    )
) as unit(
  source_key,
  source_unit_id,
  ordinal,
  source_text,
  source_text_hash,
  is_selected,
  is_anchor
) on unit.source_key = article.source_key
on conflict (article_id, source_unit_id) do nothing;

insert into public.news_article_stocks (article_id, stock_id, subject_role)
select article.id, stock.stock_id, 'primary'
from public.news_articles as article
join public.stocks as stock on stock.stock_code = '015760'
where article.source_key = '8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82'
on conflict (article_id, stock_id) do nothing;

insert into public.news_publications (
  article_id,
  status,
  selector_event_type,
  reviewer_event_type,
  selector_stock_codes,
  reviewer_stock_codes,
  focus_statement,
  headline,
  home_summary,
  summary_line_1,
  summary_line_1_fact_key,
  summary_line_2,
  summary_line_2_fact_key,
  summary_line_3,
  summary_line_3_fact_key,
  price_connection_kind,
  price_connection_basis,
  price_connection_text,
  term_treatments,
  deterministic_facts_pass,
  review_allowed_scope,
  review_primary_subject,
  review_direct_materiality,
  review_source_fidelity,
  review_focus_alignment,
  review_concise_three_line_summary,
  review_no_irrelevant_detail,
  review_attribution_and_timing,
  review_all_terms_easy,
  review_same_headline_across_surfaces,
  review_distinct_summary_facts,
  review_price_connection_grounded,
  review_term_explanation_coverage,
  review_investment_safety,
  review_no_sentiment_label,
  editor_attempts,
  ready_at
)
select
  article.id,
  'draft',
  publication.event_type,
  publication.event_type,
  publication.stock_codes,
  publication.stock_codes,
  publication.focus_statement,
  publication.headline,
  publication.home_summary,
  publication.summary_line_1,
  publication.summary_line_1_fact_key,
  publication.summary_line_2,
  publication.summary_line_2_fact_key,
  publication.summary_line_3,
  publication.summary_line_3_fact_key,
  publication.price_connection_kind,
  publication.price_connection_basis,
  publication.price_connection_text,
  publication.term_treatments::jsonb,
  true, true, true, true, true, true, true, true, true, true,
  true, true, true, true, true, true,
  publication.editor_attempts,
  '2026-08-13T08:07:29.882Z'::timestamptz
from public.news_articles as article
join (
  values
    (
      'f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35',
      'observed_market_move',
      '{}'::text[],
      '13일 국내 증시에서 코스피와 코스닥이 상승 마감했다.',
      '코스피, 3.56% 올라 6813.34로 마감',
      '코스피, 3.56% 올라 6813.34로 마감',
      '전날보다 234.30포인트 올랐어요.',
      'kospi_points',
      '코스닥도 0.29% 오른 1419.4였어요.',
      'kosdaq_close',
      '원·달러 환율은 7.7원 내렸어요.',
      'exchange_rate',
      'market_index',
      'event_education',
      '코스피와 코스닥은 국내 주식시장 흐름을 보여주는 숫자예요.',
      '[{"term":"코스피","easyText":"국내 주식시장을 대표하는 숫자","treatment":"explained","sourceIds":["S1"]},{"term":"포인트","easyText":"주식시장 숫자가 얼마나 움직였는지 나타내는 단위","treatment":"explained","sourceIds":["S1","S2"]},{"term":"코스닥","easyText":"성장 기업이 많이 모인 국내 주식시장의 숫자","treatment":"explained","sourceIds":["S2"]},{"term":"서울 외환시장","easyText":"서울에서 나라 돈을 바꾸는 시장","treatment":"explained","sourceIds":["S3"]},{"term":"원·달러 환율","easyText":"한국 돈과 미국 달러를 바꾸는 비율","treatment":"explained","sourceIds":["S3"]}]',
      1::smallint
    ),
    (
      '8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82',
      'earnings',
      array['015760']::text[],
      '한국전력의 2026년 2분기 영업이익이 전년 동기보다 47.2% 감소했다.',
      '한국전력, 2026년 2분기 영업이익 지난해 같은 기간보다 47.2% 줄어',
      '한국전력, 2026년 2분기 영업이익 지난해 같은 기간보다 47.2% 줄어',
      '영업이익은 1조1286억원이에요.',
      'operating_profit_amount',
      '매출은 21조9189억원이고 순이익은 2775억원이에요.',
      'revenue_net_income_amounts',
      '한국전력은 전기 판매량 감소와 연료비 증가를 원인으로 들었어요.',
      'cited_profit_reasons',
      'business_performance',
      'event_education',
      '영업이익과 매출의 변화는 회사의 사업 흐름과 연결돼요.',
      '[{"term":"영업이익","easyText":"회사가 본업으로 벌어 비용을 빼고 남긴 돈","treatment":"explained","sourceIds":["S1","S3"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S2"]},{"term":"순이익","easyText":"모든 비용을 빼고 마지막에 남은 돈","treatment":"explained","sourceIds":["S2"]},{"term":"전기 판매량","easyText":"팔린 전기의 양","treatment":"explained","sourceIds":["S3"]},{"term":"연료비","easyText":"전기를 만들 때 쓰는 연료에 드는 돈","treatment":"explained","sourceIds":["S3"]}]',
      2::smallint
    )
) as publication(
  source_key,
  event_type,
  stock_codes,
  focus_statement,
  headline,
  home_summary,
  summary_line_1,
  summary_line_1_fact_key,
  summary_line_2,
  summary_line_2_fact_key,
  summary_line_3,
  summary_line_3_fact_key,
  price_connection_kind,
  price_connection_basis,
  price_connection_text,
  term_treatments,
  editor_attempts
) on publication.source_key = article.source_key
on conflict (article_id) do nothing;

insert into public.news_citations (
  publication_id,
  article_id,
  output_field,
  source_unit_id
)
select publication.id, publication.article_id, citation.output_field, citation.source_unit_id
from public.news_publications as publication
join public.news_articles as article on article.id = publication.article_id
join (
  values
    ('f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35', 'headline', 'S1'),
    ('f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35', 'home_summary', 'S1'),
    ('f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35', 'summary_line_1', 'S1'),
    ('f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35', 'summary_line_2', 'S2'),
    ('f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35', 'summary_line_3', 'S3'),
    ('f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35', 'price_connection', 'S1'),
    ('f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35', 'price_connection', 'S2'),
    ('8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82', 'headline', 'S1'),
    ('8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82', 'home_summary', 'S1'),
    ('8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82', 'summary_line_1', 'S1'),
    ('8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82', 'summary_line_2', 'S2'),
    ('8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82', 'summary_line_3', 'S3'),
    ('8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82', 'price_connection', 'S1'),
    ('8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82', 'price_connection', 'S2')
) as citation(source_key, output_field, source_unit_id)
  on citation.source_key = article.source_key
on conflict (publication_id, output_field, source_unit_id) do nothing;

update public.news_publications
set status = 'ready_for_storage', updated_at = now()
where status = 'draft'
  and article_id in (
    select id
    from public.news_articles
    where source_key in (
      'f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35',
      '8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82'
    )
  );

update public.news_publications
set
  status = 'published',
  published_at = '2026-08-13T08:07:29.882Z',
  updated_at = now()
where status = 'ready_for_storage'
  and article_id in (
    select id
    from public.news_articles
    where source_key in (
      'f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35',
      '8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82'
    )
  );

commit;
