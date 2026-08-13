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
  'child-news-role-pipeline-v1',
  'headline-examples-and-three-line-summary-v1',
  10,
  3,
  7,
  false,
  '2026-08-13T07:30:00.000Z',
  '2026-08-13T08:07:29.882Z'
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
      false, false
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
  summary_line_2,
  summary_line_3,
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
  publication.summary_line_2,
  publication.summary_line_3,
  publication.term_treatments::jsonb,
  true, true, true, true, true, true, true, true, true, true, true, true,
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
      '13일 코스피가 3.56% 올라 마감',
      '13일 코스피와 다른 주식시장 숫자가 올랐다.',
      '13일 코스피가 올라 마감했다.',
      '다른 국내 주식시장 숫자도 0.29% 올랐다.',
      '코스피는 국내 주식시장 대표 숫자야.',
      '[{"term":"코스피","easyText":"코스피는 국내 주식시장 대표 숫자야.","treatment":"explained"},{"term":"코스닥","easyText":"다른 국내 주식시장 숫자","treatment":"replaced"}]',
      1::smallint
    ),
    (
      '8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82',
      'earnings',
      array['015760']::text[],
      '한국전력의 2026년 2분기 영업이익이 전년 동기보다 47.2% 감소했다.',
      '한국전력 2026년 2분기 본업에서 번 돈 47.2% 줄어',
      '한국전력의 2026년 2분기 본업에서 번 돈은 1조1286억원으로 지난해 같은 기간보다 47.2% 줄었다.',
      '한국전력의 2026년 2분기 본업에서 번 돈이 줄었다.',
      '판매액은 21조9189억원, 남은 돈은 2775억원이다.',
      '한국전력은 전기 판매량 감소와 연료비 증가를 원인으로 들었다.',
      '[{"term":"영업이익","easyText":"본업에서 번 돈","treatment":"replaced"},{"term":"매출","easyText":"판매액","treatment":"replaced"},{"term":"순이익","easyText":"남은 돈","treatment":"replaced"}]',
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
  summary_line_2,
  summary_line_3,
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
    ('f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35', 'home_summary', 'S2'),
    ('f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35', 'summary_line_1', 'S1'),
    ('f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35', 'summary_line_2', 'S2'),
    ('f21b4df0d67eb94caa6e9db042d77ec6026354ae8cbf35cdebf2db08572efd35', 'summary_line_3', 'S1'),
    ('8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82', 'headline', 'S1'),
    ('8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82', 'home_summary', 'S1'),
    ('8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82', 'summary_line_1', 'S1'),
    ('8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82', 'summary_line_2', 'S2'),
    ('8bf4861b341e7b0b893452d1840f695147dbe8db098f3eb70c838c68f26e2a82', 'summary_line_3', 'S3')
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
