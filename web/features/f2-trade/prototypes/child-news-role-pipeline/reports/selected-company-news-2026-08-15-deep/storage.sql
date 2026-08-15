-- selected-company-news-2026-08-15-deep
-- JSON/HTML 검수 결과에서 ready_for_storage인 기사만 공개 DB에 적재합니다.
-- rejected 판정의 상세 감사 기록은 report.json에만 남깁니다.
begin;

insert into public.news_pipeline_runs (
  run_key, run_date_kst, model, contract_version, prompt_version,
  source_count, ready_count, rejected_count, criteria_passed,
  started_at, completed_at
) values (
  'selected-company-news-2026-08-15-deep', '2026-08-15'::date,
  'gpt-5.6-luna', 'child-news-role-pipeline-v2',
  'approved-price-linked-max-v2',
  51, 22, 29, true,
  '2026-08-15T07:31:13.537Z'::timestamptz,
  '2026-08-15T09:35:37.676Z'::timestamptz
)
on conflict (run_key) do nothing;

insert into public.news_articles (
  pipeline_run_id, source_key, external_article_id, run_date_kst, scope,
  source_event_type, original_title, publisher, source_published_at,
  source_url, evidence_hash, pipeline_result
)
select
  run.id, item.source_key, item.external_article_id, item.run_date_kst,
  item.scope, item.source_event_type, item.original_title, item.publisher,
  item.source_published_at, item.source_url, item.evidence_hash,
  'ready_for_storage'
from public.news_pipeline_runs as run
cross join (
  values
    (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'NAVER-109-0005587838',
      '2026-08-15'::date, 'company',
      'earnings', '‘리니지 클래식 호조’ 엔씨, 2분기 매출 7705억 원…해외 매출 비중 52% 달성',
      'OSEN', '2026-08-13T07:43:11.000Z'::timestamptz,
      'http://www.osen.co.kr/article/G1112856478', '1f7fb86e5860543a07eff3cccb7b6b9dff934061a91faf3f451d24699f07bf0d'
    ),
    (
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'NAVER-003-0014123167',
      '2026-08-15'::date, 'company',
      'earnings', '더블유게임즈, 2분기 매출 2106억·영업익 701억…또 사상 최대',
      '뉴시스', '2026-08-12T05:26:31.000Z'::timestamptz,
      'https://www.newsis.com/view/NISX20260812_0003746230', '3c896af0fe21572d9dc0140292ebd327451ab94f6fae0a7200c9784241956cca'
    ),
    (
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'NAVER-008-0005399753',
      '2026-08-15'::date, 'company',
      'earnings', 'HMM, 2분기 영업익 52%↑…운임 반등에 ''뱃고동''',
      '머니투데이', '2026-08-13T06:47:30.000Z'::timestamptz,
      'https://www.mt.co.kr/industry/2026/08/13/2026081315080289964', 'fa7d19313477d0a35e41566ac316d56f855aaac49601566744f952a8e06c3e38'
    ),
    (
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'NAVER-081-0003670641',
      '2026-08-15'::date, 'company',
      'merger_or_ownership', '‘로봇·엔비디아’ 부스터에 LG전자 소액주주 100만명 돌파…구광모 LG회장 보수 48억',
      '서울신문', '2026-08-14T08:39:08.000Z'::timestamptz,
      'https://www.seoul.co.kr/news/economy/industry/2026/08/14/20260814500241?wlog_tag3=naver', '657d7ad1a26f1ee72cee79a3c794adc679f4d3c01c2a25ff5aa3a104d37a8dbe'
    ),
    (
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'NAVER-662-0000101956',
      '2026-08-15'::date, 'company',
      'earnings', '“해외서 잘나가네"…삼양식품 2분기 영업이익 전년 比46.7% ↑',
      '농민신문', '2026-08-14T09:29:10.000Z'::timestamptz,
      'https://www.nongmin.com/article/20260814500704', 'ce8b8940a36946e095cd04b90726de36329a75a8423a62641c18ad3143971e25'
    ),
    (
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'NAVER-009-0005720112',
      '2026-08-15'::date, 'company',
      'sales_or_production', '"가장 맛있는 순간 즐기세요"…과자·음료도 ''제철''에 뜬다',
      '매일경제', '2026-08-12T07:03:15.000Z'::timestamptz,
      'https://www.mk.co.kr/article/12125404', 'd59e9dbafdcfc10b3801c961a4eb034a65b641ef6b60a9d20000e9607c5a34f6'
    ),
    (
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'NAVER-031-0001049855',
      '2026-08-15'::date, 'company',
      'earnings', '''해외서 훨훨'' 농심, 2Q 영업이익 48% ''껑충''',
      '아이뉴스24', '2026-08-14T05:38:15.000Z'::timestamptz,
      'http://www.inews24.com/view/1995155', '3cc82dc4be276ee1f137ff77fedf51c7333a4b06e86bb4134ae8921450d1fabc'
    ),
    (
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'NAVER-020-0003740984',
      '2026-08-15'::date, 'company',
      'binding_contract', 'SK이노베이션, 美 케머러 원전사업 참여…테라파워와 SMR 협력 확대',
      '동아일보', '2026-08-14T09:11:09.000Z'::timestamptz,
      'https://www.donga.com/news/Economy/article/all/20260814/134481055/1', 'c52d5284518a38dd753280be517b1a7434a724a1a4cc4a72d27c373d734ab34e'
    ),
    (
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'NAVER-015-0005317620',
      '2026-08-15'::date, 'company',
      'earnings', '콘서트·광고 늘었다…SM, 2분기 매출·영업익 모두 증가',
      '한국경제', '2026-08-05T05:49:11.000Z'::timestamptz,
      'https://www.hankyung.com/article/2026080563897', '38db439577277150af33db199237f2895f8743354d8bb0c9f049fa96a8fac041'
    ),
    (
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'NAVER-008-0005390487',
      '2026-08-15'::date, 'company',
      'sales_or_production', '''JYP 글로벌 보이그룹'' 뻔푸소년CIIU, 내달 中 첫 번째 미니 앨범 발매',
      '머니투데이', '2026-07-24T04:30:26.000Z'::timestamptz,
      'https://www.mt.co.kr/stock/2026/07/24/2026072412260456288', '1d25aa6fa21fcd45829ba26eaf01cf3eaa50b85721233b272ca70cdb2b19a326'
    ),
    (
      'f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'NAVER-018-0006346792',
      '2026-08-15'::date, 'company',
      'earnings', 'YG엔터, 2분기 영업익 110억… 전년比 31.2% 증가',
      '이데일리', '2026-08-07T03:00:12.000Z'::timestamptz,
      'https://www.edaily.co.kr/news/newspath.asp?newsid=05861366645545024', '472d05e40bd094faf60d962e55d51568c258ffce39e7001b4dec987ff3a86bb2'
    ),
    (
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'NAVER-366-0001185692',
      '2026-08-15'::date, 'company',
      'earnings', 'LS證 “코웨이, 2분기 호실적 하반기에도 이어진다…목표가 12만원 상향”',
      '조선비즈', '2026-08-12T00:01:26.000Z'::timestamptz,
      'https://biz.chosun.com/stock/stock_general/2026/08/12/WQ54YIUZXBCNVKJC3IFLD5MMTU/?utm_source=naver&utm_medium=original&utm_campaign=biz', '92803f4ebbcd061a5b8fc997874c75c32b0c90cccd95b7d082563b8ec2de942e'
    ),
    (
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'NAVER-366-0001186412',
      '2026-08-15'::date, 'company',
      'earnings', 'SK스퀘어, 2분기 영업익 19조2354억원… 하이닉스 이익 급증에 ‘역대 최고 실적’',
      '조선비즈', '2026-08-14T08:02:14.000Z'::timestamptz,
      'https://biz.chosun.com/industry/company/2026/08/14/7QXH7M53FZCAXFMJZ6M3KPTPXI/?utm_source=naver&utm_medium=original&utm_campaign=biz', '24eae5d7030b062f7f7dd416824a8661515b87bb340de2d2a88c688450e887ca'
    ),
    (
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'NAVER-277-0005803462',
      '2026-08-15'::date, 'company',
      'material_operational_risk', '18일 현대차 노사 다시 협상 테이블에…하반기 실적 반등 ''분수령''',
      '아시아경제', '2026-08-14T23:00:00.000Z'::timestamptz,
      'https://view.asiae.co.kr/article/2026081416381162776', '7995bc98ba4a74cfb9e7533e15ebe9c8c32e5378d5cb8026a0e2c96ea60255ed'
    ),
    (
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'NAVER-629-0000524804',
      '2026-08-15'::date, 'company',
      'merger_or_ownership', '[주간사모펀드] 롯데렌탈 새 주인 찾았다…美 사모펀드 TPG에 매각',
      '더팩트', '2026-08-14T15:01:48.000Z'::timestamptz,
      'https://news.tf.co.kr/read/economy/2354403.htm', '2d27a81fdbb0a7e2c4c355c441f2a1da5185b8a5e4b746108eb403a0a745ca21'
    ),
    (
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'NAVER-079-0004178965',
      '2026-08-15'::date, 'company',
      'material_operational_risk', 'HD현대중공업 노조, 결국 파업 준비 수순…중노위 조정 신청',
      '노컷뉴스', '2026-08-14T07:35:14.000Z'::timestamptz,
      'https://www.nocutnews.co.kr/news/6563265?utm_source=naver&utm_medium=article&utm_campaign=20260814043431', 'f9587fd09a5eb458e89eea5cd980a82c4eb640f67f6bab50be9af7b26ad7c54e'
    ),
    (
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'NAVER-011-0004651865',
      '2026-08-15'::date, 'company',
      'regulatory_decision', '한화오션, 거제 조선소서 미 군함 2척 건조 문 열린다',
      '서울경제', '2026-08-14T07:15:11.000Z'::timestamptz,
      'https://www.sedaily.com/article/20079578?ref=naver', '6f6aa7d6d6cdc6f9ade22def0924cd1023087999103cd02607e2a166b2f4b31d'
    ),
    (
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'NAVER-003-0014129161',
      '2026-08-15'::date, 'company',
      'merger_or_ownership', '조원태號 ''ONE 대한항공'' 출범 박차…12월 17일 ''메가 캐리어''로 비상',
      '뉴시스', '2026-08-14T21:00:00.000Z'::timestamptz,
      'https://www.newsis.com/view/NISX20260812_0003746426', '4c33bc700a834d7215b16dfdcbadeed37ecb75700e3b5e3e3fda29168cb1cbbe'
    ),
    (
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'NAVER-648-0000049750',
      '2026-08-15'::date, 'company',
      'merger_or_ownership', '한진칼, 공익법인 지원에도 지분 ''찔끔'' 오른 이유',
      '비즈워치', '2026-08-12T01:39:12.000Z'::timestamptz,
      'https://news.bizwatch.co.kr/article/industry/2026/08/12/0006', 'fa6eeb87892e3147da0dfc6e09efa25ce3c7af49bbb82f472bb57df09caebf4e'
    ),
    (
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'NAVER-011-0004652066',
      '2026-08-15'::date, 'company',
      'earnings', '너도나도 최대 실적…K뷰티 글로벌 흥행에 브랜드도 ODM도 날았다 [김연하의 킬링이슈]',
      '서울경제', '2026-08-15T03:01:07.000Z'::timestamptz,
      'https://www.sedaily.com/article/20079555?ref=naver', '1f78c5a38d0df15bb572b745138c00c44eb5b4cc6239b689da8517c3d65ef32b'
    ),
    (
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'NAVER-421-0009112352',
      '2026-08-15'::date, 'company',
      'earnings', '달바글로벌, 2분기 영업익 472억 ''역대 최대''…해외 매출 76%',
      '뉴스1', '2026-08-13T04:49:37.000Z'::timestamptz,
      'https://www.news1.kr/industry/general-industry/6257951', 'de9347114fe36754eaad54c1ef5978338db786104893bed68a9de07612e29548'
    ),
    (
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'NAVER-024-0000107504',
      '2026-08-15'::date, 'company',
      'earnings', '‘차석용 매직’ 그늘 벗고 북미서 답 찾다',
      '매경이코노미', '2026-08-12T12:01:13.000Z'::timestamptz,
      'https://www.mk.co.kr/article/12120877', '05182fceb104297e9390511f40e4de360026d2e654093ef2f152e624f90635ed'
    )
) as item(
  source_key, external_article_id, run_date_kst, scope, source_event_type,
  original_title, publisher, source_published_at, source_url, evidence_hash
)
where run.run_key = 'selected-company-news-2026-08-15-deep'
on conflict (source_key) do nothing;

do $$
begin
  if exists (
    select 1
    from public.news_articles as article
    join (
      values
        ('bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', '1f7fb86e5860543a07eff3cccb7b6b9dff934061a91faf3f451d24699f07bf0d'),
        ('2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', '3c896af0fe21572d9dc0140292ebd327451ab94f6fae0a7200c9784241956cca'),
        ('89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'fa7d19313477d0a35e41566ac316d56f855aaac49601566744f952a8e06c3e38'),
        ('970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', '657d7ad1a26f1ee72cee79a3c794adc679f4d3c01c2a25ff5aa3a104d37a8dbe'),
        ('63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'ce8b8940a36946e095cd04b90726de36329a75a8423a62641c18ad3143971e25'),
        ('c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'd59e9dbafdcfc10b3801c961a4eb034a65b641ef6b60a9d20000e9607c5a34f6'),
        ('a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', '3cc82dc4be276ee1f137ff77fedf51c7333a4b06e86bb4134ae8921450d1fabc'),
        ('7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'c52d5284518a38dd753280be517b1a7434a724a1a4cc4a72d27c373d734ab34e'),
        ('56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', '38db439577277150af33db199237f2895f8743354d8bb0c9f049fa96a8fac041'),
        ('b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', '1d25aa6fa21fcd45829ba26eaf01cf3eaa50b85721233b272ca70cdb2b19a326'),
        ('f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', '472d05e40bd094faf60d962e55d51568c258ffce39e7001b4dec987ff3a86bb2'),
        ('0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', '92803f4ebbcd061a5b8fc997874c75c32b0c90cccd95b7d082563b8ec2de942e'),
        ('f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', '24eae5d7030b062f7f7dd416824a8661515b87bb340de2d2a88c688450e887ca'),
        ('d349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', '7995bc98ba4a74cfb9e7533e15ebe9c8c32e5378d5cb8026a0e2c96ea60255ed'),
        ('58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', '2d27a81fdbb0a7e2c4c355c441f2a1da5185b8a5e4b746108eb403a0a745ca21'),
        ('c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'f9587fd09a5eb458e89eea5cd980a82c4eb640f67f6bab50be9af7b26ad7c54e'),
        ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', '6f6aa7d6d6cdc6f9ade22def0924cd1023087999103cd02607e2a166b2f4b31d'),
        ('7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', '4c33bc700a834d7215b16dfdcbadeed37ecb75700e3b5e3e3fda29168cb1cbbe'),
        ('0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'fa6eeb87892e3147da0dfc6e09efa25ce3c7af49bbb82f472bb57df09caebf4e'),
        ('e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', '1f78c5a38d0df15bb572b745138c00c44eb5b4cc6239b689da8517c3d65ef32b'),
        ('55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'de9347114fe36754eaad54c1ef5978338db786104893bed68a9de07612e29548'),
        ('ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', '05182fceb104297e9390511f40e4de360026d2e654093ef2f152e624f90635ed')
    ) as expected(source_key, evidence_hash)
      on expected.source_key = article.source_key
    where article.evidence_hash <> expected.evidence_hash
  ) then
    raise exception 'NEWS_SOURCE_EVIDENCE_HASH_MISMATCH';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from public.news_articles as article
    join public.news_publications as publication
      on publication.article_id = article.id
    join (
      values
      (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'earnings',
      array['036570']::text[], '엔씨소프트가 2026년 2분기 매출 7705억 원, 영업이익 1739억 원, 당기순이익 1312억 원을 기록했다고 밝혔다.',
      '엔씨소프트, 2026년 2분기 매출 7705억 원·영업이익 1739억 원 기록', '엔씨소프트, 2026년 2분기 매출 7705억 원·영업이익 1739억 원 기록',
      '당기순이익은 1312억 원이에요.', 'net_income',
      '영업이익은 지난 분기보다 53% 늘었어요.', 'operating_profit_growth',
      '한국 매출 비중은 48%예요.', 'korea_revenue_share',
      'business_performance',
      'event_education',
      '이번 매출과 영업이익은 회사의 사업 성과를 보여주는 수치예요.',
      '[{"term":"해외 매출","easyText":"외국에서 제품이나 서비스를 팔아 번 돈","treatment":"explained","sourceIds":["S1","S7"]},{"term":"실적","easyText":"일정 기간 동안 사업을 한 결과","treatment":"explained","sourceIds":["S1","S2","S3"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S1","S3","S4","S5"]},{"term":"전년 대비","easyText":"지난해와 비교한 변화","treatment":"explained","sourceIds":["S1"]},{"term":"PC 매출","easyText":"컴퓨터 게임으로 번 돈","treatment":"explained","sourceIds":["S2"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S1","S2","S3","S4","S6","S7","S8"]},{"term":"실적 결산","easyText":"사업 결과를 모아 정리하는 일","treatment":"explained","sourceIds":["S3"]},{"term":"연결기준","easyText":"여러 회사의 결과를 합쳐 계산하는 방식","treatment":"explained","sourceIds":["S3"]},{"term":"당기순이익","easyText":"모든 비용을 빼고 마지막에 남은 돈","treatment":"explained","sourceIds":["S3"]},{"term":"전분기 대비","easyText":"바로 앞 분기와 비교한 변화","treatment":"explained","sourceIds":["S4"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교한 변화","treatment":"explained","sourceIds":["S4"]},{"term":"영업이익률","easyText":"매출 중 사업 뒤 남은 돈의 비율","treatment":"explained","sourceIds":["S5"]},{"term":"지역별 매출 비중","easyText":"전체로 번 돈에서 지역마다 차지한 몫","treatment":"explained","sourceIds":["S6"]},{"term":"해외 매출 비중","easyText":"전체로 번 돈에서 외국 몫의 비율","treatment":"explained","sourceIds":["S7"]},{"term":"증가세","easyText":"계속 늘어나는 흐름","treatment":"explained","sourceIds":["S7"]},{"term":"글로벌 모바일 게임 플랫폼","easyText":"세계 여러 곳에서 쓰는 모바일 게임 서비스","treatment":"explained","sourceIds":["S8"]},{"term":"최초 연결 편입","easyText":"처음으로 사업 결과를 함께 계산한 일","treatment":"explained","sourceIds":["S8"]},{"term":"모바일 캐주얼 사업","easyText":"휴대전화로 가볍게 즐기는 게임 사업","treatment":"explained","sourceIds":["S8"]},{"term":"전체 분기 매출","easyText":"한 분기 동안 회사가 번 모든 돈","treatment":"explained","sourceIds":["S8"]}]'::jsonb
    ),
      (
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'earnings',
      array['192080']::text[], '더블유게임즈가 2분기 매출 2106억원과 영업이익 701억원을 기록했다고 12일 공시했다.',
      '더블유게임즈, 2분기 매출 2106억원·영업이익 701억원 기록', '더블유게임즈, 2분기 매출 2106억원·영업이익 701억원 기록',
      '전년 동기 대비 매출 22.5%, 영업이익 29% 늘었어요.', 'growth_rates',
      '직접판매(DTC) 매출 비중은 47.5%예요.', 'dtc_revenue_share',
      '지난해 7월 인수한 와우게임즈 실적도 더해졌어요.', 'wowgames_performance',
      'business_performance',
      'event_education',
      '매출과 영업이익은 회사의 사업 결과를 보여주는 숫자예요.',
      '[{"term":"소셜카지노","easyText":"카지노처럼 즐기는 온라인 게임","treatment":"explained","sourceIds":["S3"]},{"term":"캐주얼게임 사업","easyText":"가볍게 즐기는 게임을 만드는 사업","treatment":"explained","sourceIds":["S3"]},{"term":"사상 최대 실적","easyText":"지금까지 가장 좋은 사업 결과","treatment":"explained","sourceIds":["S3"]},{"term":"연결 기준","easyText":"본사와 자회사를 합쳐 계산한 기준","treatment":"explained","sourceIds":["S4"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S4","S5","S6","S8"]},{"term":"영업이익","easyText":"사업 비용을 빼고 본업에서 남긴 돈","treatment":"explained","sourceIds":["S4","S5","S8"]},{"term":"공시","easyText":"회사가 중요한 내용을 공식적으로 알리는 일","treatment":"explained","sourceIds":["S4"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교해","treatment":"explained","sourceIds":["S5","S8"]},{"term":"자체 결제 시스템","easyText":"회사가 직접 결제를 처리하는 방법","treatment":"explained","sourceIds":["S7"]},{"term":"직접판매(DTC)","easyText":"중간 판매처 없이 고객에게 직접 파는 방식","treatment":"explained","sourceIds":["S7"]},{"term":"매출 비중","easyText":"전체 매출에서 차지하는 부분의 크기","treatment":"explained","sourceIds":["S7"]},{"term":"플랫폼 수수료","easyText":"플랫폼에 내는 이용료","treatment":"explained","sourceIds":["S7"]},{"term":"수익성 개선","easyText":"번 돈에서 비용을 뺀 결과가 좋아짐","treatment":"explained","sourceIds":["S7"]},{"term":"상반기 누적 매출","easyText":"한 해 전반기에 벌어들인 매출을 합한 금액","treatment":"explained","sourceIds":["S8"]},{"term":"인수한","easyText":"다른 회사나 사업을 사서 맡게 된","treatment":"explained","sourceIds":["S9"]},{"term":"실적","easyText":"회사가 사업에서 낸 결과","treatment":"explained","sourceIds":["S3","S9"]}]'::jsonb
    ),
      (
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'earnings',
      array['011200']::text[], 'HMM의 2분기 영업이익은 3541억원으로 전년 동기 대비 52% 증가했다.',
      'HMM, 2분기 영업이익 3541억원…전년 동기 대비 52% 증가', 'HMM, 2분기 영업이익 3541억원…전년 동기 대비 52% 증가',
      '영업이익은 직전 분기보다 31.6% 늘었어요.', 'operating_profit_qoq',
      '2분기 매출은 3조4020억원이에요.', 'q2_revenue',
      '물류 성수기가 예년보다 일찍 시작됐어요.', 'early_peak_season',
      'business_performance',
      'event_education',
      '영업이익과 매출 변화는 회사의 사업 성과와 연결돼요.',
      '[{"term":"2만4000TEU급 컨테이너선","easyText":"컨테이너를 아주 많이 실을 수 있는 큰 배","treatment":"explained","sourceIds":["S1"]},{"term":"TEU","easyText":"컨테이너를 실을 수 있는 양을 세는 단위","treatment":"explained","sourceIds":["S1"]},{"term":"매출","easyText":"물건이나 서비스를 팔아 들어온 전체 돈","treatment":"explained","sourceIds":["S1","S5","S7"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교한 것","treatment":"explained","sourceIds":["S1","S3"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S2","S3","S4"]},{"term":"실적","easyText":"회사가 일정 기간 동안 낸 사업 결과","treatment":"explained","sourceIds":["S6","S7"]},{"term":"반등","easyText":"줄어들던 수치가 다시 올라가는 것","treatment":"explained","sourceIds":["S6"]},{"term":"해상운임","easyText":"배로 물건을 나를 때 내는 운송료","treatment":"explained","sourceIds":["S6"]},{"term":"매출 손실","easyText":"물건을 팔아 벌 돈이 줄어든 것","treatment":"explained","sourceIds":["S7"]},{"term":"연료비","easyText":"배나 차량을 움직이는 연료에 드는 돈","treatment":"explained","sourceIds":["S7"]},{"term":"원가 부담","easyText":"만드는 데 드는 비용이 커져 생기는 부담","treatment":"explained","sourceIds":["S7"]},{"term":"물류 성수기","easyText":"물건을 나르는 일이 평소보다 바쁜 때","treatment":"explained","sourceIds":["S7"]},{"term":"수익성","easyText":"번 돈에서 비용을 뺀 뒤 얼마나 남는지 보여주는 정도","treatment":"explained","sourceIds":["S7"]},{"term":"상하이컨테이너운임지수(SCFI)","easyText":"상하이에서 배로 물건을 나르는 비용을 보여주는 숫자","treatment":"explained","sourceIds":["S8"]},{"term":"SCFI","easyText":"상하이에서 출발하는 컨테이너 운송료를 나타내는 숫자","treatment":"explained","sourceIds":["S8","S9"]},{"term":"전년 동기보다","easyText":"지난해 같은 기간보다","treatment":"explained","sourceIds":["S9"]},{"term":"직전 분기","easyText":"바로 앞의 사업 기간","treatment":"explained","sourceIds":["S4"]}]'::jsonb
    ),
      (
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'merger_or_ownership',
      array['066570']::text[], 'LG전자의 소액주주 수가 올해 상반기 처음 100만명을 넘어 6월 말 122만7359명으로 집계됐고, 소액주주 보유 지분은 전체 발행주식의 58.43%였다.',
      'LG전자, 올해 상반기 소액주주 수 100만명 첫 돌파', 'LG전자, 올해 상반기 소액주주 수 100만명 첫 돌파',
      'LG전자 반기보고서상 6월 말 소액주주는 122만 7359명이에요', 'june_shareholder_count',
      '소액주주 지분은 발행주식의 58.43%예요.', 'minority_share_ratio',
      '소액주주가 지난해 말보다 약 71만 6000명 늘었어요.', 'shareholder_count_increase',
      'ownership_and_credit',
      'event_education',
      '소액주주 수와 지분은 누가 회사 주식을 얼마나 갖는지 보여주는 정보예요.',
      '[{"term":"인공지능(AI)","easyText":"사람처럼 배우고 판단하는 컴퓨터 기술","treatment":"explained","sourceIds":["S5"]},{"term":"신사업","easyText":"회사가 새로 시작하거나 키우는 사업","treatment":"explained","sourceIds":["S5"]},{"term":"소액주주","easyText":"회사 주식을 적게 가진 사람","treatment":"explained","sourceIds":["S5","S6","S7"]},{"term":"반기보고서","easyText":"회사의 반년 사업 내용을 담은 보고서","treatment":"explained","sourceIds":["S6"]},{"term":"지분","easyText":"회사 전체 주식 중 가진 몫","treatment":"explained","sourceIds":["S7"]},{"term":"발행주식","easyText":"회사가 만들어 내놓은 주식 전체","treatment":"explained","sourceIds":["S7"]}]'::jsonb
    ),
      (
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'earnings',
      array['003230']::text[], '삼양식품이 2분기 연결 기준 매출 7703억원과 영업이익 1762억원을 공시했으며, 해외매출은 6458억원으로 전년 동기보다 46.7% 늘었다.',
      '삼양식품, 2분기 연결기준 매출액 7703억원·영업이익 1762억원 공시', '삼양식품, 2분기 연결기준 매출액 7703억원·영업이익 1762억원 공시',
      '매출액은 지난해보다 39.3% 늘었어요.', 'revenue_growth',
      '해외매출은 6458억원으로 46.7% 늘었어요.', 'overseas_revenue',
      '분기 해외매출이 6000억원을 넘은 건 처음이에요.', 'overseas_revenue_record',
      'business_performance',
      'event_education',
      '매출과 영업이익은 회사의 판매 규모와 사업 성과에 연결돼요.',
      '[{"term":"연결기준","easyText":"본사와 자회사의 숫자를 합쳐 계산한 기준","treatment":"explained","sourceIds":["S1"]},{"term":"매출액","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S1"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S1","S8"]},{"term":"공시","easyText":"회사의 중요한 내용을 공개하는 일","treatment":"explained","sourceIds":["S1"]},{"term":"실적","easyText":"회사가 일정 기간에 낸 사업 결과","treatment":"explained","sourceIds":["S3"]},{"term":"해외매출","easyText":"외국에서 제품을 팔아 얻은 금액","treatment":"explained","sourceIds":["S4","S5"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교한 것","treatment":"explained","sourceIds":["S4"]},{"term":"유통채널","easyText":"제품이 고객에게 가는 판매 경로","treatment":"explained","sourceIds":["S6"]},{"term":"입점 확대","easyText":"제품을 파는 매장을 더 늘리는 일","treatment":"explained","sourceIds":["S6"]},{"term":"진출국","easyText":"회사가 사업을 시작한 나라","treatment":"explained","sourceIds":["S7"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S1","S4","S5","S7","S8"]},{"term":"성장률","easyText":"얼마나 늘거나 줄었는지 나타내는 비율","treatment":"explained","sourceIds":["S7"]},{"term":"영업이익률","easyText":"매출에서 영업이익이 차지하는 비율","treatment":"explained","sourceIds":["S8"]},{"term":"유통망","easyText":"제품을 여러 곳에 보내고 파는 연결망","treatment":"explained","sourceIds":["S9"]},{"term":"판매채널","easyText":"제품을 고객에게 파는 방법이나 장소","treatment":"explained","sourceIds":["S9"]},{"term":"생산 효율","easyText":"같은 자원으로 제품을 만드는 정도","treatment":"explained","sourceIds":["S9"]},{"term":"고환율 효과","easyText":"외국 돈의 가치 변화가 사업에 미치는 영향","treatment":"explained","sourceIds":["S9"]},{"term":"수익성","easyText":"사업에서 이익을 낼 수 있는 정도","treatment":"explained","sourceIds":["S9"]}]'::jsonb
    ),
      (
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'sales_or_production',
      array['271560']::text[], '오리온은 국내산 햇감자 수확 시기에 감자스낵을 생산하고 생산능력을 늘리는 가운데, 지난해 6~11월 포카칩 매출이 2022년 같은 기간보다 36% 증가했고 글로벌 감자스낵 매출은 8740억원으로 전년 대비 약 10% 늘었다.',
      '오리온, 지난해 6~11월 포카칩 매출 36% 증가', '오리온, 지난해 6~11월 포카칩 매출 36% 증가',
      '2022년 같은 기간과 비교한 수치예요.', 'comparison_base',
      '지난해 글로벌 감자스낵 매출은 8740억원이에요.', 'global_sales_amount',
      '감자스낵 생산능력을 늘리고 있어요.', 'capacity_growth',
      'production_capacity',
      'event_education',
      '생산할 수 있는 양과 판매 규모는 회사 사업과 연결될 수 있어요.',
      '[{"term":"매출","easyText":"제품을 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S3","S8"]},{"term":"계약재배","easyText":"농가와 미리 약속해 농작물을 기르는 방식","treatment":"explained","sourceIds":["S5"]},{"term":"조달","easyText":"필요한 감자를 마련하는 일","treatment":"explained","sourceIds":["S5"]},{"term":"전년 대비","easyText":"지난해 같은 기간과 비교한 변화","treatment":"explained","sourceIds":["S8"]},{"term":"생산능력","easyText":"제품을 만들 수 있는 최대 규모","treatment":"explained","sourceIds":["S10"]}]'::jsonb
    ),
      (
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'earnings',
      array['004370']::text[], '농심은 2분기 연결 매출 9561억원과 영업이익 593억원을 기록했다고 공시했다.',
      '농심, 2분기 매출 9561억원·영업이익 593억원', '농심, 2분기 매출 9561억원·영업이익 593억원',
      '매출은 지난해 같은 기간보다 10.2% 늘었어요.', 'revenue_growth',
      '영업이익은 47.6% 늘었어요.', 'profit_growth',
      '해외사업 매출 비중은 40.2%로 높아졌어요.', 'overseas_sales_share',
      'business_performance',
      'event_education',
      '매출과 영업이익은 회사의 사업 성과를 보여주는 숫자예요.',
      '[{"term":"해외법인","easyText":"다른 나라에서 사업하는 회사","treatment":"explained","sourceIds":["S3"]},{"term":"국내 소비 둔화","easyText":"한국에서 물건을 사는 흐름이 느려지는 것","treatment":"explained","sourceIds":["S3"]},{"term":"원가 부담","easyText":"제품을 만드는 데 드는 돈이 커진 상태","treatment":"explained","sourceIds":["S3"]},{"term":"상쇄","easyText":"한쪽의 줄어든 부분을 다른 쪽이 메우는 것","treatment":"explained","sourceIds":["S3"]},{"term":"연결 기준","easyText":"본사와 다른 회사의 결과를 합쳐 계산하는 방법","treatment":"explained","sourceIds":["S4"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S4","S7"]},{"term":"지난해 같은 기간","easyText":"작년의 똑같은 시기","treatment":"explained","sourceIds":["S4"]},{"term":"공시","easyText":"회사의 중요한 내용을 공개하는 일","treatment":"explained","sourceIds":["S4"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S5"]},{"term":"국내 생산법인","easyText":"한국에서 제품을 만드는 회사","treatment":"explained","sourceIds":["S7"]},{"term":"수출","easyText":"우리나라 물건을 다른 나라에 파는 일","treatment":"explained","sourceIds":["S7"]},{"term":"해외사업 매출 비중","easyText":"해외 사업에서 번 돈이 전체 판매액에서 차지하는 몫","treatment":"explained","sourceIds":["S7"]}]'::jsonb
    ),
      (
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'binding_contract',
      array['096770']::text[], 'SK이노베이션이 테라파워와 나트륨 SMR 사업 협력 주요 조건 합의서를 체결했으며, 합의서에는 미국 케머러 1호기와 후속 상용 프로젝트 참여 확대가 포함됐다.',
      'SK이노베이션, 테라파워와 나트륨 SMR 협력 합의서 체결', 'SK이노베이션, 테라파워와 나트륨 SMR 협력 합의서 체결',
      '14일 서울에서 두 대표가 만났어요.', 'meeting_date_place',
      'SK와 SK이노베이션은 총 2억5000만달러를 공동 투자했어요.', 'joint_investment_total',
      '케머러 1호기와 후속 상용 프로젝트 참여를 확대할 계획이에요.', 'project_participation_plan',
      'contracted_business',
      'event_education',
      '사업 협력 합의는 회사의 사업 참여와 계약에 연결될 수 있어요.',
      '[{"term":"소형모듈원자로(SMR)","easyText":"원자력으로 전기를 만드는 작은 발전 시설","treatment":"explained","sourceIds":["S3"]},{"term":"SMR","easyText":"소형모듈원자로를 줄여 부르는 말","treatment":"explained","sourceIds":["S3","S4","S6","S7"]},{"term":"나트륨 SMR","easyText":"나트륨을 활용하는 작은 원자력 발전 시설","treatment":"explained","sourceIds":["S4","S6","S7"]},{"term":"사업협력 주요 조건 합의서","easyText":"사업을 함께하기로 정한 중요한 약속 문서","treatment":"explained","sourceIds":["S4"]},{"term":"최고경영자(CEO)","easyText":"회사의 일을 가장 책임지는 사람","treatment":"explained","sourceIds":["S4"]},{"term":"공동 투자","easyText":"여러 곳이 돈을 함께 넣는 투자","treatment":"explained","sourceIds":["S5"]},{"term":"2대 주주","easyText":"회사 주식을 두 번째로 많이 가진 사람이나 회사","treatment":"explained","sourceIds":["S5"]},{"term":"실증로","easyText":"새 원자로 기술이 실제로 작동하는지 시험하는 시설","treatment":"explained","sourceIds":["S6"]},{"term":"상용 프로젝트","easyText":"제품이나 서비스를 실제로 팔기 위한 사업","treatment":"explained","sourceIds":["S6","S7"]},{"term":"공급망","easyText":"제품을 만들고 옮기는 데 필요한 회사와 과정","treatment":"explained","sourceIds":["S6"]},{"term":"글로벌 프로젝트 공동 발굴","easyText":"세계 여러 곳의 사업을 함께 찾아내는 일","treatment":"explained","sourceIds":["S6"]}]'::jsonb
    ),
      (
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'earnings',
      array['041510']::text[], '에스엠이 2026년 2분기 연결 기준 매출 3496억원과 영업이익 529억원을 기록했다.',
      '에스엠, 2026년 2분기 매출 3496억원 기록', '에스엠, 2026년 2분기 매출 3496억원 기록',
      '영업이익은 529억원이었어요.', 'operating_profit',
      '별도 매출은 9.2% 늘어 2406억원이에요.', 'separate_revenue',
      '고연차 아티스트의 투어가 확대됐어요.', 'tour_expansion',
      'business_performance',
      'event_education',
      '매출과 영업이익은 회사의 사업 흐름을 보여주는 숫자예요.',
      '[{"term":"연결 기준","easyText":"본사와 자회사의 결과를 합쳐 계산하는 방식","treatment":"explained","sourceIds":["S4"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S4","S5","S8"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 빼고 남은 금액","treatment":"explained","sourceIds":["S4"]},{"term":"별도 매출","easyText":"자회사와 합치지 않고 따로 계산한 판매 금액","treatment":"explained","sourceIds":["S5"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교한 수치","treatment":"explained","sourceIds":["S5"]},{"term":"출연 매출","easyText":"출연 활동으로 받은 금액","treatment":"explained","sourceIds":["S5"]},{"term":"콘서트 매출","easyText":"콘서트를 열어 번 금액","treatment":"explained","sourceIds":["S5","S8"]},{"term":"MD·라이선싱 매출","easyText":"상품 판매와 사용 허가로 번 금액","treatment":"explained","sourceIds":["S5"]},{"term":"고연차 아티스트","easyText":"활동 경력이 오래된 가수나 연예인","treatment":"explained","sourceIds":["S8"]},{"term":"투어","easyText":"여러 지역을 돌며 공연하는 일정","treatment":"explained","sourceIds":["S8"]},{"term":"성장세","easyText":"사업 규모가 커지는 흐름","treatment":"explained","sourceIds":["S5"]},{"term":"성장을 견인","easyText":"성장 흐름을 이끌었다는 뜻","treatment":"explained","sourceIds":["S8"]}]'::jsonb
    ),
      (
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'sales_or_production',
      array['035900']::text[], 'JYP는 중국에서 뻔푸소년CIIU의 첫 번째 미니 앨범을 다음달 4일 발매한다고 밝혔다.',
      'JYP Ent., 뻔푸소년CIIU 중국 첫 미니 앨범 8월 4일 발매', 'JYP Ent., 뻔푸소년CIIU 중국 첫 미니 앨범 8월 4일 발매',
      '7월 14일 음원과 뮤직비디오를 선공개했어요.', 'pre_release_media',
      '타이틀곡은 ''Closer''예요.', 'title_track_name',
      '뻔푸소년CIIU는 글로벌 보이그룹이에요.', 'group_description',
      'business_performance',
      'event_education',
      '앨범 발매는 음악을 팔아 얻는 돈과 연결될 수 있어요.',
      '[{"term":"JYP Ent.","easyText":"뻔푸소년CIIU 앨범을 내는 회사 이름","treatment":"explained","sourceIds":["S1"]},{"term":"글로벌 보이그룹","easyText":"여러 나라에서 활동하는 남자 가수 그룹","treatment":"explained","sourceIds":["S1"]},{"term":"발매","easyText":"노래나 앨범을 사람들에게 내놓는 일","treatment":"explained","sourceIds":["S1"]},{"term":"미니 앨범","easyText":"노래를 몇 곡 담은 작은 앨범","treatment":"explained","sourceIds":["S1","S2"]},{"term":"타이틀곡","easyText":"앨범을 대표하는 노래","treatment":"explained","sourceIds":["S2"]},{"term":"컴백","easyText":"새 노래로 다시 활동하는 일","treatment":"explained","sourceIds":["S2"]},{"term":"수록곡","easyText":"앨범 안에 들어 있는 노래","treatment":"explained","sourceIds":["S5"]},{"term":"음원","easyText":"기기에서 들을 수 있는 노래 파일","treatment":"explained","sourceIds":["S5"]},{"term":"뮤직비디오","easyText":"노래에 맞춰 만든 영상","treatment":"explained","sourceIds":["S5"]},{"term":"선공개","easyText":"정식 발표 전에 먼저 공개하는 일","treatment":"explained","sourceIds":["S5"]}]'::jsonb
    ),
      (
      'f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'earnings',
      array['122870']::text[], '와이지엔터테인먼트는 2분기 연결 기준 매출 1277억 원과 영업이익 110억 원을 공시했고, 두 수치가 지난해 같은 기간보다 각각 27.2%와 31.2% 증가했다.',
      '와이지엔터테인먼트, 2분기 매출·영업이익 모두 증가', '와이지엔터테인먼트, 2분기 매출·영업이익 모두 증가',
      '매출은 1277억 원이었어요.', 'revenue_amount',
      '영업이익은 110억 원이었어요.', 'operating_profit_amount',
      'YG 측은 굿즈 판매가 잘됐다고 설명했어요.', 'merchandise_sales',
      'business_performance',
      'event_education',
      '사업으로 번 돈과 비용을 뺀 뒤 남은 돈은 회사의 사업 성과와 연결돼요.',
      '[{"term":"연결 기준","easyText":"본사와 다른 회사의 결과를 합쳐 계산하는 방식","treatment":"explained","sourceIds":["S1"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S1"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S1","S2"]},{"term":"공시","easyText":"회사의 중요한 내용을 공식적으로 알리는 일","treatment":"explained","sourceIds":["S1"]},{"term":"신보","easyText":"가수가 새로 내놓은 음악 앨범","treatment":"explained","sourceIds":["S3"]},{"term":"발매","easyText":"음악이나 상품을 새로 내놓는 일","treatment":"explained","sourceIds":["S3"]},{"term":"MD(굿즈)","easyText":"가수와 관련해 파는 기념 상품","treatment":"explained","sourceIds":["S3"]},{"term":"판매 호조","easyText":"상품이 잘 팔리는 상황","treatment":"explained","sourceIds":["S3"]},{"term":"디지털 콘텐츠","easyText":"인터넷이나 기기로 보는 영상·음악 자료","treatment":"explained","sourceIds":["S3"]},{"term":"수요 확대","easyText":"사고 싶어 하는 사람이 늘어나는 일","treatment":"explained","sourceIds":["S3"]},{"term":"실적 개선","easyText":"회사의 사업 결과가 더 좋아지는 것","treatment":"explained","sourceIds":["S3"]}]'::jsonb
    ),
      (
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'earnings',
      array['021240']::text[], '코웨이는 올해 2분기 연결 매출액 1조4422억원과 영업이익 2532억원을 기록했고, 두 항목 모두 분기 기준 역대 최대였다.',
      '코웨이, 2분기 연결 매출액·영업이익 분기 기준 역대 최대', '코웨이, 2분기 연결 매출액·영업이익 분기 기준 역대 최대',
      '연결 매출액은 1조4422억원이었어요.', 'revenue_amount',
      '영업이익은 2532억원이었어요.', 'operating_profit_amount',
      '영업이익률은 전년 동기보다 1.7%포인트 낮아졌어요.', 'margin_change',
      'business_performance',
      'event_education',
      '이번 실적은 코웨이의 매출과 영업이익을 보여줘 사업 성과와 연결돼요.',
      '[{"term":"연결 매출액","easyText":"여러 회사의 매출을 합한 금액","treatment":"explained","sourceIds":["S4"]},{"term":"매출액","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S4","S7","S9"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 얻은 전체 금액","treatment":"explained","sourceIds":["S5"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S4","S5","S6","S10"]},{"term":"영업이익률","easyText":"사업으로 번 이익이 매출에서 차지하는 비율","treatment":"explained","sourceIds":["S6"]},{"term":"전년 동기","easyText":"지난해 같은 기간","treatment":"explained","sourceIds":["S6"]},{"term":"포인트(P)","easyText":"퍼센트 차이를 나타내는 단위","treatment":"explained","sourceIds":["S6"]},{"term":"포천맑은물 사업 중단","easyText":"포천맑은물 사업을 그만둔 일","treatment":"explained","sourceIds":["S6"]},{"term":"렌털 판매량","easyText":"빌려 쓰는 방식으로 팔린 제품 수","treatment":"explained","sourceIds":["S8"]},{"term":"렌털 계정","easyText":"제품을 빌려 쓰는 계약의 수","treatment":"explained","sourceIds":["S8"]},{"term":"BEREX","easyText":"코웨이의 제품 이름으로 쓰인 말","treatment":"explained","sourceIds":["S8"]},{"term":"판매 호조","easyText":"제품이 잘 팔리는 상태","treatment":"explained","sourceIds":["S8","S9"]},{"term":"신규 카테고리 출시","easyText":"새로운 종류의 제품을 내놓는 일","treatment":"explained","sourceIds":["S9"]},{"term":"영업조직 확대","easyText":"판매를 맡는 조직을 더 크게 만드는 일","treatment":"explained","sourceIds":["S10"]},{"term":"방문판매","easyText":"판매원이 고객을 직접 찾아가는 방식","treatment":"explained","sourceIds":["S10"]},{"term":"시판","easyText":"제품을 일반 소비자에게 파는 일","treatment":"explained","sourceIds":["S10"]},{"term":"실적 개선","easyText":"사업 결과가 전보다 나아지는 일","treatment":"explained","sourceIds":["S10"]},{"term":"관세 환급","easyText":"관세로 낸 돈을 돌려받는 일","treatment":"explained","sourceIds":["S10"]}]'::jsonb
    ),
      (
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'earnings',
      array['402340']::text[], 'SK스퀘어가 2분기 연결 기준 영업이익 19조2354억원을 기록했으며, 전년 동기 대비 1273.8% 증가했다.',
      'SK스퀘어, 2분기 연결 기준 영업이익 19조2354억원 기록', 'SK스퀘어, 2분기 연결 기준 영업이익 19조2354억원 기록',
      '전년 동기 대비 1273.8% 급증했어요.', 'profit_growth_rate',
      '당기순이익은 18조6750억원이에요.', 'net_income_amount',
      '상반기 누적 영업이익은 27조5137억원이에요.', 'cumulative_operating_profit',
      'business_performance',
      'event_education',
      '이익 수치는 회사 사업에서 돈이 얼마나 남았는지 보여줘 사업 성과와 연결돼요.',
      '[{"term":"지분","easyText":"회사 전체 주식 중에서 가진 몫","treatment":"explained","sourceIds":["S2"]},{"term":"최대 주주","easyText":"회사 주식을 가장 많이 가진 사람이나 기관","treatment":"explained","sourceIds":["S2"]},{"term":"실적","easyText":"회사가 일정 기간 거둔 사업 결과","treatment":"explained","sourceIds":["S2","S6"]},{"term":"연결 기준","easyText":"본사와 함께 운영하는 회사를 합쳐 계산하는 방법","treatment":"explained","sourceIds":["S3"]},{"term":"영업이익","easyText":"주로 하는 사업에서 번 돈에서 비용을 뺀 금액","treatment":"explained","sourceIds":["S3","S5"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교한 것","treatment":"explained","sourceIds":["S3"]},{"term":"당기순이익","easyText":"모든 비용을 뺀 뒤 최종적으로 남은 이익","treatment":"explained","sourceIds":["S4"]},{"term":"누적 영업이익","easyText":"기간 동안 차곡차곡 모인 주된 사업의 이익","treatment":"explained","sourceIds":["S5"]},{"term":"누적 순이익","easyText":"기간 동안 차곡차곡 모인 최종 이익","treatment":"explained","sourceIds":["S5"]},{"term":"AI","easyText":"사람처럼 배우고 판단하는 컴퓨터 기술","treatment":"explained","sourceIds":["S6"]},{"term":"반도체 포트폴리오","easyText":"회사가 가진 여러 반도체 사업의 묶음","treatment":"explained","sourceIds":["S6"]},{"term":"주주 환원","easyText":"회사의 이익을 주식을 가진 사람에게 돌려주는 일","treatment":"explained","sourceIds":["S6"]}]'::jsonb
    ),
      (
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'material_operational_risk',
      array['005380']::text[], '현대차 노조의 파업으로 4만대가 넘는 생산 차질이 발생한 가운데, 현대차와 노조는 18일 오후 2시 본교섭을 재개하기로 했다.',
      '현대차 노동조합, 18일 오후 2시 본교섭 재개하기로', '현대차 노동조합, 18일 오후 2시 본교섭 재개하기로',
      '올해 파업으로 4만대 넘는 생산 차질이 났어요.', 'production_disruption',
      '노조는 18일까지 매일 4∼6시간 파업해요.', 'strike_schedule',
      '하반기 신차 출시를 통한 실적 반등이 필요해요.', 'h2_rebound_need',
      'operational_continuity',
      'event_education',
      '생산 차질은 차량을 만들고 팔 수 있는 수와 연결될 수 있어요.',
      '[{"term":"파업","easyText":"일하는 사람들이 요구를 알리려고 일을 멈추는 행동","treatment":"explained","sourceIds":["S3","S4","S6"]},{"term":"파업 수위","easyText":"파업을 얼마나 오래 또는 강하게 할지의 정도","treatment":"explained","sourceIds":["S3"]},{"term":"노동조합","easyText":"일하는 사람들이 권리를 지키려고 만든 모임","treatment":"explained","sourceIds":["S3"]},{"term":"사측","easyText":"회사를 운영하는 쪽","treatment":"explained","sourceIds":["S3"]},{"term":"교섭","easyText":"회사와 노동자가 조건을 의논하는 일","treatment":"explained","sourceIds":["S3","S4"]},{"term":"본교섭","easyText":"회사와 노동자가 공식적으로 하는 협상","treatment":"explained","sourceIds":["S3"]},{"term":"생산 차질","easyText":"제품을 계획대로 만들지 못하는 상황","treatment":"explained","sourceIds":["S4"]},{"term":"하반기","easyText":"한 해의 뒤쪽 절반","treatment":"explained","sourceIds":["S4"]},{"term":"신차 출시","easyText":"새 자동차를 시장에 내놓는 일","treatment":"explained","sourceIds":["S4"]},{"term":"실적 반등","easyText":"사업 결과가 다시 좋아지는 것","treatment":"explained","sourceIds":["S4"]},{"term":"노조","easyText":"일하는 사람들이 함께 만든 모임","treatment":"explained","sourceIds":["S6"]}]'::jsonb
    ),
      (
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'merger_or_ownership',
      array['089860']::text[], '호텔롯데와 부산롯데호텔이 보유한 롯데렌탈 지분 61.17%를 미국계 사모펀드 TPG에 매각했다.',
      '롯데렌탈, 호텔롯데·부산롯데호텔 보유 지분 61.17%를 TPG에 매각', '롯데렌탈, 호텔롯데·부산롯데호텔 보유 지분 61.17%를 TPG에 매각',
      '롯데렌탈은 국내 렌터카 1위 업체예요.', 'rental_car_rank',
      'TPG는 인수 대금 전액을 자체 펀드로 조달할 것으로 알려졌어요.', 'acquisition_funding',
      'TPG는 미국계 사모펀드예요.', 'buyer_type',
      'ownership_and_credit',
      'event_education',
      '지분 매각은 회사의 소유 구조와 중요한 결정 방식에 연결될 수 있어요.',
      '[{"term":"렌터카","easyText":"차를 빌려주는 서비스","treatment":"explained","sourceIds":["S2"]},{"term":"사모펀드","easyText":"몇몇 사람의 돈을 모아 회사에 투자하는 곳","treatment":"explained","sourceIds":["S2"]},{"term":"PEF","easyText":"사모펀드를 영어로 줄여 부르는 말","treatment":"explained","sourceIds":["S2"]},{"term":"TPG","easyText":"롯데렌탈의 몫을 산 미국계 투자 회사","treatment":"explained","sourceIds":["S2","S4","S5"]},{"term":"투자은행","easyText":"회사의 큰 거래와 돈 마련을 돕는 회사","treatment":"explained","sourceIds":["S4"]},{"term":"IB","easyText":"투자은행을 영어로 줄여 부르는 말","treatment":"explained","sourceIds":["S4"]},{"term":"지분","easyText":"회사의 전체 주식 중 누군가가 가진 몫","treatment":"explained","sourceIds":["S4"]},{"term":"매각","easyText":"가지고 있던 것을 다른 곳에 파는 일","treatment":"explained","sourceIds":["S4"]},{"term":"인수 대금","easyText":"지분을 사면서 내는 돈","treatment":"explained","sourceIds":["S5"]},{"term":"펀드","easyText":"투자에 쓰려고 모아 둔 돈","treatment":"explained","sourceIds":["S5"]},{"term":"조달","easyText":"필요한 돈을 마련하는 일","treatment":"explained","sourceIds":["S5"]}]'::jsonb
    ),
      (
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'material_operational_risk',
      array['329180']::text[], 'HD현대중공업 노동조합이 임금·단체협약 교섭 난항으로 중앙노동위원회에 노동 쟁의 조정을 신청했고, 25일부터 27일까지 파업 찬반 투표를 진행할 예정이다.',
      'HD현대중공업 노조, 중앙노동위원회에 노동 쟁의 조정 신청', 'HD현대중공업 노조, 중앙노동위원회에 노동 쟁의 조정 신청',
      '노동 쟁의 조정 신청일은 14일이에요.', 'application_date',
      '25~27일 파업 찬반 투표가 예정됐어요.', 'strike_vote_dates',
      '6월 상견례 뒤 15차례 교섭했지만 의견 차이를 못 좁혔어요.', 'negotiation_count',
      'operational_continuity',
      'event_education',
      '파업 여부는 회사 운영의 지속성과 연결될 수 있어요.',
      '[{"term":"노동조합","easyText":"일하는 사람들이 근무 조건을 함께 의논하는 모임","treatment":"explained","sourceIds":["S2"]},{"term":"임금·단체협약","easyText":"월급과 일터 규칙을 함께 정한 약속","treatment":"explained","sourceIds":["S2"]},{"term":"교섭","easyText":"회사와 일하는 사람들이 조건을 의논하는 일","treatment":"explained","sourceIds":["S2","S6"]},{"term":"중앙노동위원회","easyText":"일터에서 생긴 다툼을 다루는 기관","treatment":"explained","sourceIds":["S3","S4"]},{"term":"노동 쟁의 조정","easyText":"일터 다툼을 풀 방법을 찾는 절차","treatment":"explained","sourceIds":["S3"]},{"term":"조정 중지","easyText":"다툼을 풀려는 절차를 멈추는 결정","treatment":"explained","sourceIds":["S4"]},{"term":"노사","easyText":"회사와 일하는 사람들","treatment":"explained","sourceIds":["S4","S6"]},{"term":"파업 찬반 투표","easyText":"파업을 할지 말지 묻는 투표","treatment":"explained","sourceIds":["S4","S5"]},{"term":"과반 찬성","easyText":"절반보다 많은 사람이 찬성하는 것","treatment":"explained","sourceIds":["S4"]},{"term":"합법적인 파업권","easyText":"법에 맞게 일을 멈출 수 있는 권리","treatment":"explained","sourceIds":["S4"]},{"term":"조합원","easyText":"일하는 사람들 모임에 가입한 사람","treatment":"explained","sourceIds":["S5"]},{"term":"상견례","easyText":"교섭을 시작하며 서로 인사하는 자리","treatment":"explained","sourceIds":["S6"]},{"term":"기본급","easyText":"월급의 기본이 되는 금액","treatment":"explained","sourceIds":["S7"]},{"term":"상여금","easyText":"월급과 따로 받는 보너스","treatment":"explained","sourceIds":["S7"]},{"term":"요구안","easyText":"상대에게 이루어 달라고 내놓은 내용","treatment":"explained","sourceIds":["S7"]},{"term":"영업이익","easyText":"사업으로 번 돈에서 운영 비용을 뺀 금액","treatment":"explained","sourceIds":["S8"]},{"term":"성과 공유","easyText":"일의 결과로 얻은 것을 함께 나누는 것","treatment":"explained","sourceIds":["S8"]},{"term":"통상임금 산입","easyText":"평소 받는 임금에 어떤 돈을 넣어 계산하는 것","treatment":"explained","sourceIds":["S8"]}]'::jsonb
    ),
      (
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'regulatory_decision',
      array['042660']::text[], '미국 대통령이 13일(현지 시간) 외국 조선소에서 군함을 2척까지 건조하는 방안을 조건부로 허용하는 각서에 서명했다. 한화오션과 한화시스템 컨소시엄은 2024년 미국 필라델피아 필리조선소 지분 100%를 인수했고, 기사에서는 한화가 이 조건에 부합한다고 전했다.',
      '한화오션·한화시스템, 미국 군함 건조 조건에 부합', '한화오션·한화시스템, 미국 군함 건조 조건에 부합',
      '조건을 지키면 외국 조선소에서 군함 2척까지 지을 수 있어요.', 'warship_build_limit',
      '한화오션·한화시스템은 필리조선소 지분 100%를 인수했어요.', 'shipyard_stake_acquired',
      '이후 모든 선박을 만들고 고칠 때 미국 내 공급망을 써야 해요.', 'us_supply_chain',
      'regulatory_permission',
      'event_education',
      '미국 군함 건조 허용 조건은 한화오션의 미국 조선소 생산 활동과 연결될 수 있어요.',
      '[{"term":"조선소","easyText":"배를 만들고 고치는 곳","treatment":"explained","sourceIds":["S4","S6","S7","S8","S9"]},{"term":"군함","easyText":"나라의 군대가 쓰는 배","treatment":"explained","sourceIds":["S4"]},{"term":"건조","easyText":"배를 새로 만드는 일","treatment":"explained","sourceIds":["S4","S9"]},{"term":"조건부로 허용","easyText":"정해진 조건을 지키면 할 수 있게 함","treatment":"explained","sourceIds":["S4"]},{"term":"각서","easyText":"약속이나 계획을 적은 문서","treatment":"explained","sourceIds":["S6"]},{"term":"조선산업 기반 재건","easyText":"배 만드는 산업의 바탕을 다시 세우는 일","treatment":"explained","sourceIds":["S6"]},{"term":"소유권","easyText":"무언가를 가질 수 있는 권리","treatment":"explained","sourceIds":["S6"]},{"term":"과반 지분","easyText":"회사 주식의 절반보다 많은 몫","treatment":"explained","sourceIds":["S6"]},{"term":"외국 조선업체","easyText":"다른 나라에서 배를 만드는 회사","treatment":"explained","sourceIds":["S6"]},{"term":"인수","easyText":"다른 회사나 재산을 넘겨받는 일","treatment":"explained","sourceIds":["S7","S8"]},{"term":"컨소시엄","easyText":"여러 회사가 함께 만든 모임","treatment":"explained","sourceIds":["S8"]},{"term":"지분","easyText":"회사 전체에서 가진 주식의 몫","treatment":"explained","sourceIds":["S6","S8"]},{"term":"유지·보수","easyText":"고장 없이 쓰도록 관리하고 고치는 일","treatment":"explained","sourceIds":["S9"]},{"term":"공급망","easyText":"제품을 만들고 옮기는 데 이어진 회사와 과정","treatment":"explained","sourceIds":["S9"]}]'::jsonb
    ),
      (
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'merger_or_ownership',
      array['003490', '020560']::text[], '대한항공 이사회와 아시아나항공 임시 주주총회가 두 회사의 합병 관련 안건을 각각 가결했다.',
      '대한항공·아시아나항공, 합병 관련 안건 각각 통과', '대한항공·아시아나항공, 합병 관련 안건 각각 통과',
      '통합 법인은 12월 17일 공식 출범할 예정이에요.', 'launch_date',
      '통합 대한항공은 연 매출 23조 원 이상이에요.', 'annual_revenue',
      '아시아나항공 노선을 조인트벤처 판매망에 넣을 계획이에요.', 'route_network_plan',
      'business_combination',
      'event_education',
      '합병은 두 회사의 운영 방식과 규모를 바꾸는 일이라 회사 주식 가격과 관련될 수 있어요.',
      '[{"term":"합병","easyText":"두 회사가 하나로 합쳐지는 일","treatment":"explained","sourceIds":["S4","S6","S7"]},{"term":"인수 결정","easyText":"다른 회사를 사들이기로 정한 일","treatment":"explained","sourceIds":["S4"]},{"term":"행정 절차","easyText":"공식 일을 처리하는 과정","treatment":"explained","sourceIds":["S4"]},{"term":"통합 법인","easyText":"두 회사가 합쳐져 새로 만든 회사","treatment":"explained","sourceIds":["S4"]},{"term":"합병 절차","easyText":"두 회사가 하나가 되기까지의 과정","treatment":"explained","sourceIds":["S4"]},{"term":"존속법인","easyText":"합병 뒤에도 계속 남는 회사","treatment":"explained","sourceIds":["S6"]},{"term":"이사회","easyText":"회사의 중요한 일을 결정하는 모임","treatment":"explained","sourceIds":["S6"]},{"term":"합병 승인의 건","easyText":"합병을 허락할지 정하는 안건","treatment":"explained","sourceIds":["S6"]},{"term":"가결","easyText":"회의에서 안건이 통과되는 일","treatment":"explained","sourceIds":["S6"]},{"term":"주주총회","easyText":"주식을 가진 사람들이 중요한 일을 정하는 회의","treatment":"explained","sourceIds":["S7"]},{"term":"합병계약 체결 승인의 건","easyText":"합병 계약을 맺는 일을 허락할지 정하는 안건","treatment":"explained","sourceIds":["S7"]},{"term":"매출","easyText":"물건이나 서비스를 팔아 번 전체 금액","treatment":"explained","sourceIds":["S8"]},{"term":"임직원","easyText":"회사에서 일하는 모든 사람","treatment":"explained","sourceIds":["S8"]},{"term":"조인트벤처(JV)","easyText":"두 회사가 함께 운영하는 사업","treatment":"explained","sourceIds":["S10"]},{"term":"판매망","easyText":"제품을 파는 곳들이 연결된 체계","treatment":"explained","sourceIds":["S10"]},{"term":"미주 노선","easyText":"미주 지역을 오가는 비행기 길","treatment":"explained","sourceIds":["S10"]}]'::jsonb
    ),
      (
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'merger_or_ownership',
      array['180640']::text[], '한진그룹 공익법인이 한진칼 지분을 사들이고 이명희 고문이 일부를 매각한 뒤, 한진칼이 공시한 조원태 회장 등 특수관계자 지분은 31.15%로 6280주(0.01%) 늘었다.',
      '한진칼, 특수관계자 지분 31.15%로 늘어', '한진칼, 특수관계자 지분 31.15%로 늘어',
      '특수관계자 지분은 2079만6274주예요.', 'stake_shares',
      '한진그룹 공익법인이 한진칼 지분을 샀어요.', 'foundation_purchase',
      '이명희 고문은 일부 지분을 매각했어요.', 'advisor_sale',
      'ownership_and_credit',
      'event_education',
      '지분을 가진 사람이나 단체의 변화는 회사의 중요한 결정과 연결될 수 있어요.',
      '[{"term":"지분","easyText":"회사에서 차지하는 몫","treatment":"explained","sourceIds":["S3","S4","S6","S9"]},{"term":"매각","easyText":"가지고 있던 몫을 파는 일","treatment":"explained","sourceIds":["S3","S4"]},{"term":"공익법인","easyText":"좋은 일을 위해 만든 단체","treatment":"explained","sourceIds":["S3"]},{"term":"지주사","easyText":"다른 회사의 몫을 가진 회사","treatment":"explained","sourceIds":["S3"]},{"term":"특수관계자","easyText":"회사와 특별한 관계인 사람","treatment":"explained","sourceIds":["S6"]},{"term":"공시","easyText":"회사 정보를 공식적으로 알리는 일","treatment":"explained","sourceIds":["S6"]}]'::jsonb
    ),
      (
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'earnings',
      array['278470', '483650']::text[], '에이피알과 달바글로벌이 분기 기준 역대 최대 실적을 기록했다.',
      '에이피알·달바글로벌, 분기 기준 역대 최대 실적 기록', '에이피알·달바글로벌, 분기 기준 역대 최대 실적 기록',
      '에이피알 매출액은 7675억 원이에요.', 'apr_revenue',
      '에이피알 영업이익은 1906억 원이에요.', 'apr_operating_profit',
      '달바글로벌 영업이익은 472억 원이에요.', 'dalba_operating_profit',
      'business_performance',
      'event_education',
      '매출액과 영업이익은 회사의 사업 성과와 연결될 수 있어요.',
      '[{"term":"매출액","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S8","S9","S10"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S8","S10"]},{"term":"분기 기준","easyText":"한 해를 나눈 기간을 기준으로 보는 것","treatment":"explained","sourceIds":["S8","S10"]},{"term":"실적","easyText":"회사가 일정 기간 동안 거둔 결과","treatment":"explained","sourceIds":["S10"]}]'::jsonb
    ),
      (
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'earnings',
      array['483650']::text[], '달바글로벌의 2분기 연결 기준 영업이익은 472억 4100만원으로 전년 동기 대비 61.6% 증가했다.',
      '달바글로벌, 2분기 영업이익 61.6% 증가', '달바글로벌, 2분기 영업이익 61.6% 증가',
      '영업이익은 472억 4100만원이에요.', 'operating_profit_amount',
      '매출은 1868억 6100만 원으로 45.6% 늘었어요.', 'revenue_amount',
      '해외 매출은 1415억 원으로 74% 늘었어요.', 'overseas_revenue',
      'business_performance',
      'event_education',
      '매출과 영업이익의 증가는 회사의 사업 성과와 연결돼요.',
      '[{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S3","S5","S9"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S3","S4"]},{"term":"금융감독원 전자공시시스템(DART)","easyText":"회사의 중요한 정보를 인터넷에 공개하는 곳","treatment":"explained","sourceIds":["S4"]},{"term":"DART","easyText":"회사의 중요한 정보를 인터넷에 공개하는 곳","treatment":"explained","sourceIds":["S4"]},{"term":"연결 기준","easyText":"본사와 함께 운영하는 회사들을 합쳐 계산하는 방법","treatment":"explained","sourceIds":["S4"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교해서","treatment":"explained","sourceIds":["S4"]},{"term":"공시","easyText":"회사가 중요한 정보를 공식적으로 알리는 일","treatment":"explained","sourceIds":["S4"]},{"term":"당기순이익","easyText":"회사가 번 돈에서 모든 비용을 뺀 뒤 남은 돈","treatment":"explained","sourceIds":["S5"]},{"term":"실적","easyText":"회사가 일정 기간에 거둔 사업 결과","treatment":"explained","sourceIds":["S9"]},{"term":"해외 매출","easyText":"다른 나라에서 제품을 팔아 얻은 돈","treatment":"explained","sourceIds":["S9"]},{"term":"전년 동기보다","easyText":"지난해 같은 기간보다","treatment":"explained","sourceIds":["S9"]},{"term":"화이트 트러플","easyText":"흰 송로버섯을 뜻하는 말","treatment":"explained","sourceIds":["S10"]},{"term":"핵심 원료","easyText":"제품을 만드는 데 중요한 재료","treatment":"explained","sourceIds":["S10"]},{"term":"프리미엄 비건 스킨케어","easyText":"동물성 재료를 쓰지 않는 고급 피부 관리 제품","treatment":"explained","sourceIds":["S10"]}]'::jsonb
    ),
      (
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'earnings',
      array['051900']::text[], 'LG생활건강은 2분기 연결 매출 1조6574억원과 영업이익 1028억원을 기록했고, 화장품 부문은 영업이익 444억원으로 흑자전환했으며 북미 법인도 분기 흑자를 냈다.',
      'LG생활건강, 2분기 영업이익 87.5% 증가', 'LG생활건강, 2분기 영업이익 87.5% 증가',
      '2분기 연결 매출은 1조6574억원이에요.', 'revenue_amount',
      '화장품 부문 영업이익은 444억원으로 흑자전환했어요.', 'cosmetics_profit_turnaround',
      '북미 법인도 분기 흑자를 냈어요.', 'north_america_profit',
      'business_performance',
      'event_education',
      '매출과 영업이익은 회사의 사업 성과와 연결돼요.',
      '[{"term":"연결 매출","easyText":"회사와 관련 회사의 판매 금액을 합한 것","treatment":"explained","sourceIds":["S6"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 돈","treatment":"explained","sourceIds":["S6","S7","S8"]},{"term":"영업이익","easyText":"사업에 쓴 돈을 빼고 남은 돈","treatment":"explained","sourceIds":["S6","S7"]},{"term":"시장 전망치","easyText":"시장이 미리 예상한 실적 숫자","treatment":"explained","sourceIds":["S6"]},{"term":"사업부문","easyText":"회사의 여러 사업 분야","treatment":"explained","sourceIds":["S7"]},{"term":"적자","easyText":"번 돈보다 쓴 돈이 더 많은 상태","treatment":"explained","sourceIds":["S7"]},{"term":"흑자","easyText":"쓴 돈보다 번 돈이 더 많은 상태","treatment":"explained","sourceIds":["S7","S8"]},{"term":"흑자전환","easyText":"손해 보던 상태에서 돈이 남는 상태로 바뀌는 것","treatment":"explained","sourceIds":["S7"]},{"term":"마케팅비","easyText":"제품을 알리고 팔려고 쓰는 돈","treatment":"explained","sourceIds":["S8"]},{"term":"법인","easyText":"회사가 세운 별도의 사업 회사","treatment":"explained","sourceIds":["S8"]},{"term":"자체 브랜드 비중","easyText":"직접 만든 이름의 제품이 차지하는 비율","treatment":"explained","sourceIds":["S8"]}]'::jsonb
    )
    ) as expected(
      source_key, event_type, stock_codes, focus_statement,
      headline, home_summary,
      summary_line_1, summary_line_1_fact_key,
      summary_line_2, summary_line_2_fact_key,
      summary_line_3, summary_line_3_fact_key,
      price_connection_kind, price_connection_basis,
      price_connection_text, term_treatments
    ) on expected.source_key = article.source_key
    where publication.selector_event_type <> expected.event_type
      or publication.reviewer_event_type <> expected.event_type
      or publication.selector_stock_codes <> expected.stock_codes
      or publication.reviewer_stock_codes <> expected.stock_codes
      or publication.focus_statement <> expected.focus_statement
      or publication.headline <> expected.headline
      or publication.home_summary <> expected.home_summary
      or publication.summary_line_1 <> expected.summary_line_1
      or publication.summary_line_1_fact_key <> expected.summary_line_1_fact_key
      or publication.summary_line_2 <> expected.summary_line_2
      or publication.summary_line_2_fact_key <> expected.summary_line_2_fact_key
      or publication.summary_line_3 <> expected.summary_line_3
      or publication.summary_line_3_fact_key <> expected.summary_line_3_fact_key
      or publication.price_connection_kind <> expected.price_connection_kind
      or publication.price_connection_basis <> expected.price_connection_basis
      or publication.price_connection_text <> expected.price_connection_text
      or publication.term_treatments <> expected.term_treatments
  ) then
    raise exception 'NEWS_SOURCE_PUBLICATION_OUTPUT_MISMATCH';
  end if;
end;
$$;

insert into public.news_source_units (
  article_id, source_unit_id, ordinal, source_text, source_text_hash,
  is_selected, is_anchor
)
select article.id, unit.source_unit_id, unit.ordinal, unit.source_text,
  unit.source_text_hash, unit.is_selected, unit.is_anchor
from public.news_articles as article
join (
  values
    (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'S1', 1::smallint,
      '[OSEN=고용준 기자] 해외 매출 뿐만 아니라 &lsquo;리니지 클래식&rsquo;의 실적이 반영되면서 영업이익에서는 전년 대비 1053% 상승이 이뤄졌다.', 'dff0fac920bfef3b2e0b2152627f4565c43f790ccae7270b212a373ea5d51fb9',
      true, false
    ),
    (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'S2', 2::smallint,
      '엔씨가 2분기 연속 역대 최고 PC 매출 경신한 2026년 2분기 실적을 발표했다.', '221ecb4885a7333c9b410fcebe51bda564c24a797933374e2933731cc9be53ba',
      true, false
    ),
    (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'S3', 3::smallint,
      '엔씨소프트는 지난 11일 2026년 2분기 실적 결산(연결기준) 결과 매출 7705억 원, 영업이익 1739억 원, 당기순이익 1312억 원을 기록했다고 밝혔다.', '8a35855a2c584112af4008d6f4a6d99f319f668edd8ca2d6e9ebff5ce6cf947b',
      true, true
    ),
    (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'S4', 4::smallint,
      '매출과 영업이익은 전분기 대비 각각 38%, 53% 증가했으며, 전년 동기 대비로는 각각 101%, 1,053% 상승했다.', 'f869ba5ac57e5728d2f3e46be657a79f89031523b4557ec83cfc0d991b8f28c6',
      true, false
    ),
    (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'S5', 5::smallint,
      '이번 분기 영업이익률은 23%로 집계됐다.', '01247b85a2ee08bdb875657ff5bbf70cf50f929cab05113488ac135493194937',
      true, false
    ),
    (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'S6', 6::smallint,
      '지역별 매출 비중은 한국 48%, 아시아 25%, 북미&middot;유럽 등 27% 순이다.', 'c169a1944c2bb4988ce4f243a20ddb373aa49d92bdc9942443ec570374ead51e',
      true, false
    ),
    (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'S7', 7::smallint,
      '엔씨소프트에 따르면 해외 매출 비중은 4분기 연속 증가세를 기록하고 있다.', '8871faac3988b6b11c07e2cd887efc7c357adb91d4fcb7f6446eba7c543d2013',
      true, false
    ),
    (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'S8', 8::smallint,
      '이는 글로벌 모바일 게임 플랫폼 ''저스트플레이(JustPlay)''의 최초 연결 편입에 따른 결과로, 모바일 캐주얼 사업은 엔씨소프트 전체 분기 매출의 22%를 차지하게 됐다.', '0bdd7f558d10fa743c27473333d817492bceb2ab2632b25e97b577fe45964fd7',
      true, false
    ),
    (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'S9', 9::smallint,
      '한편 엔씨소프트는 오는 8월 26일 독일 쾰른에서 개막하는 게임쇼 &lsquo;게임스컴 2026&rsquo;에 참가할 예정이다.', 'a43e9c75e13deec23c57b833869363e08a2eb61780bfed35b1611f98a17ee618',
      false, false
    ),
    (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'S10', 10::smallint,
      '엔씨소프트는 해당 행사에서 아이온2, 신더시티, 프로젝트 본파이어 등 개발 중인 글로벌 신작 라인업을 공개할 계획이다.', 'd91c2f7ebf36c6ce449e3519b47fd996414bd2a3690abfe72e06e99cf7e2979b',
      false, false
    ),
    (
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'S1', 1::smallint,
      '전년 대비 매출 22.5%·영업이익 29% 증가…영업이익률 33.3%', '9ed3004bb296602c68bd2ad012121dea57b55ea54a8addc1f2a162e33546a3c6',
      false, false
    ),
    (
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'S2', 2::smallint,
      '팍시게임즈 매출 126% 급증…AI 기반 신작 비중 81%', 'a465bbf0b5121a7b5792e8fdc87403ac6830d362d8ddadf7f7b10dcc07a1562b',
      false, false
    ),
    (
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'S3', 3::smallint,
      '[서울=뉴시스]오동현 기자 = 더블유게임즈가 소셜카지노의 안정적인 성장과 캐주얼게임 사업 확대에 힘입어 2개 분기 연속 사상 최대 실적을 경신했다.', 'aa98d82c673a82287bff354c7c3b8e13fb336fe104002f3f88d997c08429f333',
      true, false
    ),
    (
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'S4', 4::smallint,
      '더블유게임즈는 올해 2분기 연결 기준 매출 2106억원, 영업이익 701억원을 기록했다고 12일 공시했다.', 'a9476e627b95448f8d856cf9aba3b774d86cd8ac998877ab4a356f0479f6b3d1',
      true, true
    ),
    (
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'S5', 5::smallint,
      '전년 동기 대비 매출은 22.5%, 영업이익은 29% 증가했다.', 'a132ae00afefecfd600e8ab04ca51aa436c93397ad69c6c3da087fed6b6b125a',
      true, false
    ),
    (
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'S6', 6::smallint,
      '매출은 7개 분기 연속 성장했다.', '5e43ae00fc221b8e21a87e934a3637e65153970e9a365049d98267d2e1b7a0bf',
      true, false
    ),
    (
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'S7', 7::smallint,
      '자체 결제 시스템을 이용하는 직접판매(DTC) 매출 비중이 47.5%까지 확대되면서 플랫폼 수수료 부담을 줄인 것이 수익성 개선으로 이어졌다.', 'e55eb11ee77fe248ad533f81cdab42a6290056880fb53283d12fbfad61e62bd7',
      true, false
    ),
    (
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'S8', 8::smallint,
      '상반기 누적 매출은 전년 동기 대비 24.5% 증가한 4156억원, 영업이익은 27% 늘어난 1385억원으로 집계됐다.', 'bbee514e721e9ddb7b6f782965da8df21ce34ad2d86f7c23f77a73359440a076',
      true, false
    ),
    (
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'S9', 9::smallint,
      '더블유카지노와 더블다운카지노 등 기존 게임의 안정적인 운영에 지난해 7월 인수한 와우게임즈의 실적이 더해졌다.', '8eaf7f93cd5d5c5ab6b9cd63ce096aec3551574253bb09b4dc7ebfd8b55670f2',
      true, false
    ),
    (
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'S10', 10::smallint,
      '더블유게임즈 관계자는 "소셜카지노의 안정적인 수익 기반 위에서 캐주얼게임과 아이게이밍 사업의 성장이 본격화하고 있다"며 "하반기에도 신규 성장동력의 성과를 확대해 실적 성장세를 이어갈 것"이라고 말했다.', 'fd2bbc23aaf716f01e3b79f14a89ef7cf855a95afe15271ea5bf90d8b65d83ac',
      false, false
    ),
    (
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'S1', 1::smallint,
      'HMM 2만4000TEU급 컨테이너선 HMM헬싱키·르아브르 호 르포 /사진=김훈남 HMM이 올해 상반기 매출 6조1207억원을 기록해 전년 동기 대비 12% 증가했다고 13일 밝혔다.', '04d01a6063cf387a2779c97e19c8a5946910aebf09ca76f3523d5d3c4474ce74',
      true, false
    ),
    (
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'S2', 2::smallint,
      '다만 영업이익은 6232억원으로 같은 기간 26% 감소했다.', '0c9ccba30e6b4ecc9b0093239ba44f4c45bad685ebde2213a82e9c480cda32fa',
      true, false
    ),
    (
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'S3', 3::smallint,
      'HMM의 지난 1분기 영업이익은 2691억원으로 전년 동기 대비 56% 감소했지만, 2분기에는 3541억원으로 전년 동기 대비 52% 증가했다.', 'dba89add542b6a6da2e8e38cb73c7e2ea52c40d9159e92450a9fd5a69f88750d',
      true, true
    ),
    (
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'S4', 4::smallint,
      '직전 분기와 비교해도 영업이익이 31.6% 늘었다.', '26787b74a05ec28fc884a0d48538591da5b03578ab2a2e5c7da513bf80aad88e',
      true, false
    ),
    (
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'S5', 5::smallint,
      '매출 역시 1분기 2조7187억원에서 2분기 3조4020억원으로 25.1% 증가했다.', '940921785cfc5537ea107286820d26b927d0a835968b18aa7e2a63f2e9602566',
      true, false
    ),
    (
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'S6', 6::smallint,
      '2분기 실적이 반등한 배경에는 5월 말부터 시작된 해상운임 상승이 있다.', '52ac3978650be0a3fd57c5478b37cafc16608f4ad61c729b35105da9b45ee7b4',
      true, false
    ),
    (
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'S7', 7::smallint,
      '지난 3월 중동 사태로 발생한 매출 손실과 연료비 등 원가 부담이 1분기 실적을 끌어내렸지만, 물류 성수기가 예년보다 일찍 시작되면서 2분기 수익성이 개선됐다.', '93b15f403d1ae951ac84dda1b179d459a04cffe62881f401c425a7fda7f48ad2',
      true, false
    ),
    (
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'S8', 8::smallint,
      '올해 상반기 상하이컨테이너운임지수(SCFI)는 평균 1957포인트로 지난해 같은 기간 평균 1701포인트보다 15% 상승했다.', 'd262bebbfdfa5a00c4a7181f7bec236a196ccc889900ae3a90bdea96874347d2',
      true, false
    ),
    (
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'S9', 9::smallint,
      '실제 올해 1분기 평균 SCFI는 1507포인트로 전년 동기보다 14% 낮았다.', '1860f61d2d4d0ff5c1993b07ebdf0178c9ff01c54ed50c3d8b2427df881d03e0',
      true, false
    ),
    (
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'S10', 10::smallint,
      'HMM 관계자는 "상반기 영업이익률은 10.2%로 글로벌 선사 중 상위권을 유지했다"며 "중동 사태 이후 고유가에 대비한 연료비 최적화와 ''허브 앤 스포크'' 전략 등을 바탕으로 선대 운영 효율성을 극대화할 것"이라고 말했다.', 'c5680c0f666222d662d59a60b4bd4b0ba760d3486853ae48b5d5084148e6c496',
      false, false
    ),
    (
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'S1', 1::smallint,
      'LG전자 소액주주 100만명 첫 돌파', '0d5bd14934050c9f2e5fd113d04c2f1d0412e371fc71c6830dd11903610b66d5',
      false, false
    ),
    (
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'S2', 2::smallint,
      '6월 장중 주가 43만 8000원까지 상승', '80a5ebeb223df57ff32211ef6e38b3a69097af489dab0be03a2c37a4ad56ae22',
      false, false
    ),
    (
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'S3', 3::smallint,
      '반도체·구리 가격 상승에 원재료 매입비 1조↑', '42de265699cd6dfa6b36415f36ceebc074e5c6727401b31818ffedf67e22392f',
      false, false
    ),
    (
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'S4', 4::smallint,
      '구광모 회장 상반기 보수 48억원 수령', 'dbf17d046d70520ee13cdf8001978fd9be7b0b2349cffaa53e0c7bb76678fd8b',
      false, false
    ),
    (
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'S5', 5::smallint,
      '로봇과 인공지능(AI) 신사업을 확장하며 기대를 모았던 LG전자의 소액주주 수가 올해 상반기 처음으로 100만명을 돌파했다.', '0121b98a750de2e46e1043e6ad1d8629ebaf054cc1cb0dbbf1f2f32efd487f40',
      true, false
    ),
    (
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'S6', 6::smallint,
      '14일 LG전자 반기보고서에 따르면 올해 6월 말 기준 소액주주 수는 122만 7359명으로 지난해 말(51만 1135명)보다 약 71만 6000명 증가했다.', '0aa8675cd9777ecce07ce191bbdfdc63a31dbb6af8e267a0b57b9257999c94fe',
      true, true
    ),
    (
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'S7', 7::smallint,
      '소액주주가 보유한 지분은 전체 발행주식의 58.43%다.', '66fcfab3a57f5db49337fda16f4d394717be3bf8b2c4598b0cd00f0167c27064',
      true, false
    ),
    (
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'S8', 8::smallint,
      '올해 초 8만~9만원대에 머물던 LG전자 주가는 실적 개선과 피지컬 AI·로보틱스 등 미래 사업 확대 기대감에 힘입어 상승세를 탔다.', '53c0e07723ae7b15cd7d154368c17aeb858c1fbbb61446b8a656d96c6d090643',
      false, false
    ),
    (
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'S9', 9::smallint,
      '한편 반도체와 구리 등 주요 원자재 가격 상승 여파로 LG전자의 올해 상반기 원재료 매입액은 지난해보다 1조원 이상 늘어났다.', 'c9d9a86a0a2c6b0c5f542122e68ae6b716aa6664a875804cd210111ede4d7bc1',
      false, false
    ),
    (
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'S10', 10::smallint,
      'LG전자에서는 지난해 말 퇴임한 조주완 전 최고경영자(CEO)가 급여 5억 1000만원, 상여 6억 7300만원, 퇴직소득 41억 200만원을 포함해 총 52억 8500만원을 받았다.', 'daa2303f560cc09fba0d9f1ae659dcca6eb70071f11332c324487272c9dd2f52',
      false, false
    ),
    (
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'S1', 1::smallint,
      '삼양식품 삼양식품이 올 2분기 연결기준 매출액이 7703억원, 영업이익은 1762억원으로 집계됐다고 14일 공시했다.', '89df31df327e3ce002891e4420b0156b23b4b4e8a154f2e8f0dde7a4b0891c6d',
      true, true
    ),
    (
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'S2', 2::smallint,
      '지난해 같은 기간보다 각각 39.3%, 46.7% 늘어난 규모다.', 'a3772eb64cfb8db0624eca42bcfbe5da99f0d656d957346e991f76c715e643a9',
      true, false
    ),
    (
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'S3', 3::smallint,
      '실적 성장은 해외사업이 이끌었다.', '3012f0c1d8a693ceb2c3e0a0c5d8e7a8b74a6224efacbbf40ee27a0c9ba97e6d',
      true, false
    ),
    (
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'S4', 4::smallint,
      '2분기 해외매출은 6458억원으로 전년 동기 대비 46.7% 증가했다.', '3f2fc1ac43728f32432177fff1308d62d79ca4eb70acf61ef26f070933c3720d',
      true, false
    ),
    (
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'S5', 5::smallint,
      '분기 해외매출이 6000억원을 넘어선 것은 처음이다.', 'd1f0e3e4daf976941c8668602ccf484d274e99f99d33a06c21ae4922a19860fb',
      true, false
    ),
    (
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'S6', 6::smallint,
      '삼양식품 측은 미국 내 일반 유통채널과 아시아계 유통채널 입점 확대, 멕시코 등 중미지역의 판매 증가가 영향을 미쳤다고 설명했다.', '43f1cf186df186c24a391f96162b4822bcd7e7e627e8a1ff9c41d971d40b80da',
      true, false
    ),
    (
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'S7', 7::smallint,
      '독일·프랑스 등에서 판매가 늘고 진출국이 확대된 유럽에선 매출 806억원을 달성해 61% 성장률을 보였다.', '5223f957a15db95426adf98c38aa1578e26c721001d3944412e1fd03bb91efde',
      true, false
    ),
    (
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'S8', 8::smallint,
      '매출 증가에 힘입어 영업이익률은 23%를 기록했고, 지난해 1분기부터 6분기 연속 20%대 영업이익률을 유지했다.', '15c7dd02c33af50640c933ca64ef890fe0cbd3de33bd0c6b73dfc1844915767c',
      true, false
    ),
    (
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'S9', 9::smallint,
      '해외 유통망 확대에 따른 판매채널 개선과 생산 효율 증대, 고환율 효과 등이 수익성 향상에 영향을 준 것으로 분석됐다.', 'b566361f6dab55c3cb7c72d4c032055df690276b926730fbad3643aa908d17e6',
      true, false
    ),
    (
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'S10', 10::smallint,
      '삼양식품 관계자는 “해외사업을 중심으로 한 성장세가 이어지고 있다”며 “지역별 해외법인의 역할과 국내외 생산 기반을 강화해 글로벌 수요 증가에 대응하겠다”고 밝혔다.', '905f77ba1723ae9bb0db04708cb1384d87b5e5d61839a6ade720fbaee020693b',
      false, false
    ),
    (
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'S1', 1::smallint,
      '사계절 내내 원하는 식재료를 구할 수 있는 시대에 오히려 ''지금이 아니면 맛볼 수 없는 맛''을 찾는 소비자가 늘고 있다.', '1e6a236e9073566ebda54b9ea0a3fd2055a0ff639fbb16467939c77c4e186746',
      false, false
    ),
    (
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'S2', 2::smallint,
      '오리온은 매년 6월부터 국내산 햇감자가 수확되는 시기에 맞춰 ''포카칩''과 ''스윙칩''을 생산한다.', '58bcc3058bcb6ef5fac55fcc0026d88ee8b648fad42f1af1e36873097dd3dd94',
      true, false
    ),
    (
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'S3', 3::smallint,
      '지난해 6~11월 국내산 햇감자로 생산한 포카칩 매출은 ''제철 과자'' 열풍이 본격화하기 전인 2022년 같은 기간보다 36% 증가했다.', '539c48c71a4722cecb2be74663db600cb6f607417be102b99079c60dc7f59675',
      true, true
    ),
    (
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'S4', 4::smallint,
      '오리온은 1988년 국내 식품업계 최초로 감자연구소를 설립하고 감자칩에 적합한 품종과 재배 기술 등을 연구해왔다.', 'fb83ece89164743302c812a38c172d624bcd8019aacc984cb421f3ca0732edde',
      false, false
    ),
    (
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'S5', 5::smallint,
      '현재 오리온은 국내에서 300여 농가와 계약재배를 통해 연간 1만5000t 규모의 국산 감자를 조달하고 있다.', 'e125616a4f053d0ee2c804068fc2d3ce99e2c725e1e0797881559866abc364b5',
      true, false
    ),
    (
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'S6', 6::smallint,
      '해외에서도 베트남 현지 농가와 계약재배를 통해 연간 약 1만7000t의 감자를 확보하고 있으며, 중국에서는 내몽골 직영농장을 운영하는 동시에 감자 플레이크 공장을 구축해 원재료부터 제품 생산까지 이어지는 공급망을 갖췄다.', '7955be4b9d085b70d30e5912a15cb4089ace9121291088dce71277601e0a2742',
      false, false
    ),
    (
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'S7', 7::smallint,
      '오리온이 사용하는 감자는 국내외를 합쳐 연간 약 23만t에 달한다.', '86040ad11b2014d72146b2571cdeabe8f05a46e7c4488f894db74197f65e0c8c',
      false, false
    ),
    (
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'S8', 8::smallint,
      '지난해 오리온의 글로벌 감자스낵 매출은 8740억원으로 전년 대비 약 10% 증가했다.', '3308478329f3cb7e41dd03f8ad8304de75f5775af780da2c544a9c3d0efec054',
      true, false
    ),
    (
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'S9', 9::smallint,
      '오리온은 포카칩·오!감자·스윙칩·예감 등 감자스낵 4종을 중국과 베트남 등 해외 시장에서 성장시키고 있다.', '0edee8d572dc076849dd1064e9f52b7cc76b7d8167dfb9f73574b9375da20b0a',
      false, false
    ),
    (
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'S10', 10::smallint,
      '오리온은 감자스낵 사업 확대에 맞춰 생산능력을 늘리고 있다.', '776a6fffa9977e95f6f31239eb5c978d45c28b5fc8cc4b2c138aae831eec5cd2',
      true, false
    ),
    (
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'S1', 1::smallint,
      '상반기 매출 1조8901억…전년比 7.3%↑', 'dffba2eedc8d233d2976f45d519e2a4720ea4ea6edfb3f82914c572f18fec17a',
      false, false
    ),
    (
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'S2', 2::smallint,
      '영업이익도 1267억으로 31.7% 증가 농심이 해외사업 성장에 힘입어 올 2분기 매출과 영업이익을 모두 끌어올렸다.', 'b230166a62dfe8824b12e8e93491a676efd16d698cb67265501b7541e0894a53',
      false, false
    ),
    (
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'S3', 3::smallint,
      '미국과 중국 등 주요 해외법인이 성장한 데다 유럽 사업이 빠르게 확대되면서 국내 소비 둔화와 원가 부담을 상쇄했다.', 'd13debeef7e2822c2e4cceb26cf8a023664779dc3e4b22cc8f4d29f5e11f739a',
      true, false
    ),
    (
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'S4', 4::smallint,
      '농심은 올해 2분기 연결 기준 매출이 9561억원으로 지난해 같은 기간보다 10.2% 증가했다고 14일 공시했다.', 'b2bd0a178d7009d7d06f4f8e55e6e69552db3b87aa5bbb4ffdbdcf459ff46e2b',
      true, true
    ),
    (
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'S5', 5::smallint,
      '영업이익은 593억원으로 47.6% 늘었다.', 'a2e16bc74c228a2c42f49485d15e14cc34e73b6bdb756d6e0c0e0916fa48cf29',
      true, false
    ),
    (
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'S6', 6::smallint,
      '영업이익은 1267억원으로 31.7%, 당기순이익은 1153억원으로 30.2% 늘었다.', 'd51318a606b21d3230dde08cb8051737b58893d9d3a2e7ecba499b428ccd5266',
      false, false
    ),
    (
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'S7', 7::smallint,
      '국내 생산법인의 수출을 합친 해외사업 매출 비중은 40.2%로 높아졌다.', 'cd030f1b6b79467db962194c7f08d4c20efa603bce7645594542e2d5d4585c9e',
      true, false
    ),
    (
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'S8', 8::smallint,
      '농심의 상반기 매출총이익률은 지난해 28.2%에서 올해 30.4%로 2.2%포인트 상승했다.', '374808343ad43fed9cf976f3b7695b006bc1d273dfbb7e8df41609156a863498',
      false, false
    ),
    (
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'S9', 9::smallint,
      '농심의 2분기 별도 기준 매출은 7384억원으로 전년 동기보다 6.4%, 영업이익은 321억원으로 4.2% 증가했다.', 'd3922d01e92d5ad3a65db0760bddcde5eaf8007431ce83fc896dca819dbdbddb',
      false, false
    ),
    (
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'S10', 10::smallint,
      '전 분기와 비교하면 매출은 3.3% 늘었지만 영업이익은 32.0% 감소했다.', '86d806773ac515a166af8abfa70dcf655d9e3d68d363ee3c69b050569acd11e9',
      false, false
    ),
    (
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'S1', 1::smallint,
      '美 케머러 1호기·후속 상용 프로젝트 참여 확대', '6aa9d7f8d52fa0154da146224cb5c0620ff34cfef9caffa9624fded45990ed41',
      false, false
    ),
    (
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'S2', 2::smallint,
      '국내 원전 공급망 활용 검토…LNG·ESS·SMR 묶은 통합 에너지 사업 추진', 'a4aa9eccb0044a68ec4ce09569005e5b00932291af244599dd673d31239f11e0',
      false, false
    ),
    (
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'S3', 3::smallint,
      '뉴스1 SK이노베이션이 미국 원전기업 테라파워와 차세대 소형모듈원자로(SMR) ‘나트륨(Natrium)’ 사업 협력을 확대한다.', '60955c334995be544cae60259e00eebf24fea315693f463013e49b0fa50d4b34',
      true, false
    ),
    (
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'S4', 4::smallint,
      'SK이노베이션은 14일 서울에서 추형욱 SK이노베이션 대표이사와 크리스 르베크 테라파워 최고경영자(CEO)가 만나 나트륨 SMR 사업 협력과 글로벌 시장 진출을 위한 사업협력 주요 조건 합의서를 체결했다고 밝혔다.', '07262843b2f8829a876bad0347a9331dc606fd2a95fa878882e116166d19f4a7',
      true, true
    ),
    (
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'S5', 5::smallint,
      'SK이노베이션과 SK는 2022년 테라파워에 총 2억5000만달러(약 3534억 원)를 공동 투자해 2대 주주가 됐다.', '83cab9551546832d8a5a99cb5491ed49a4d003c362c8f43eae8c99bfa15310d8',
      true, false
    ),
    (
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'S6', 6::smallint,
      '합의서에는 테라파워가 미국에서 추진 중인 나트륨 SMR 실증로와 후속 상용 프로젝트에 대한 SK이노베이션의 참여 확대를 비롯해 국내 SMR 공급망 활용, 국내 나트륨 SMR 사업 개발, 글로벌 프로젝트 공동 발굴 등의 내용이 담겼다.', '6c0d2b2c102249c2e79036955284b0498f7dbae5a093cca740ef07d79067df4b',
      true, false
    ),
    (
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'S7', 7::smallint,
      'SK이노베이션은 테라파워가 미국 와이오밍주에서 추진하고 있는 나트륨 SMR 프로젝트 ‘케머러 1호기’와 이후 진행될 상용 프로젝트에 참여를 확대할 계획이다.', 'f3afeaa8ad55376b8d548e1746f01f880e19c8b7aab9cf0b8967025425158cfb',
      true, false
    ),
    (
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'S8', 8::smallint,
      'SK이노베이션은 미국 사업 참여를 통해 차세대 원전의 설계와 건설, 운영 과정에서 경험을 확보하고 이를 향후 국내 사업 검토와 해외 프로젝트 개발에 활용한다는 방침이다.', '03b8cc92ec4e4c01b163fa98551cdb0338bd1f2a5f98b4cddf6bcdafff30c6e5',
      false, false
    ),
    (
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'S9', 9::smallint,
      'SK이노베이션은 이번 협력을 회사의 전기화 전략과도 연결한다.', 'd4d221d5d4508c021424aab4239a4f66cac0c3f21e627b28f77615b31aed431a',
      false, false
    ),
    (
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'S10', 10::smallint,
      'SK이노베이션은 LNG 직도입과 LNG 발전, 전력사업 역량을 보유하고 있으며 SK온을 통해 배터리와 에너지저장장치(ESS) 사업도 확대하고 있다.', '6b69d643cb62662cd9477c43aee8544c75d2b99d1130445270ebc5c2b0541d0c',
      false, false
    ),
    (
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'S1', 1::smallint,
      '매출 3496억·영업익 529억…15.4%·11% 증가', '351e7553356935a7d151293082abce18966eab2716498ac25fab20ae3f791c9c',
      false, false
    ),
    (
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'S2', 2::smallint,
      '공연 규모 확대·광고 및 행사 매출 늘어', '7c44b5353a071466a7f47b15d1e8da6cb1afdb1a4a62ced92c07e7b01a6c859c',
      false, false
    ),
    (
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'S3', 3::smallint,
      '드림메이커·디어유 등 종속 법인도 실적 기여', '4fcf2c8343031da1e5c3574b2a7b6f2ce6ce5495e510924f9b11238fe4284d9e',
      false, false
    ),
    (
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'S4', 4::smallint,
      '에스엠 엔터테인먼트(SM, 041510)가 2026년 2분기 연결 기준 매출 3496억원, 영업이익 529억원을 기록했다.', 'a61394adfdda9150061c636875e30d5abcc2e864d3a0a534fb3a54f2ac617db1',
      true, true
    ),
    (
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'S5', 5::smallint,
      '별도 매출은 전년 동기 대비 9.2% 증가한 2406억원으로, 출연 매출 27.9%, 콘서트 매출 23.6%, MD·라이선싱 매출이 22% 증가하는 등 고른 성장세를 보였다.', 'dc894ff0e708474997079041d54e8a04e1ead4b603f9c9280b5b021dddd051b4',
      true, false
    ),
    (
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'S6', 6::smallint,
      '영업이익과 당기순이익은 전년 동기 대비 각각 4.6%와 18.1% 감소한 438억원과 241억원을 기록했다.', 'cfa16433c852356cd3e64e35d758d055f500f900756c05e9ade0e906653de797',
      false, false
    ),
    (
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'S7', 7::smallint,
      '레거시 IP의 공연 규모 확대에 따른 콘서트 매출 성장과 주요 종속 법인 매출 확대가 실적에 기여했다.', 'dc21b82bc8bee8a2029f81deffec3eee0d88ce5d4d696a516c64c516d70463c3',
      false, false
    ),
    (
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'S8', 8::smallint,
      '고연차 아티스트의 투어가 확대하면서 콘서트 매출이 늘었고, 광고 및 행사도 증가해 성장을 견인했다.', '3a003fb37d61e4744f30b2932f707743af4c59806d9793278ed662389fa1d9bc',
      true, false
    ),
    (
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'S9', 9::smallint,
      '동방신기(TVXQ!), 슈퍼주니어(SUPER JUNIOR), 엑소(EXO), 에스파(aespa), NCT 위시(WISH) 등 다양한 아티스트들이 글로벌 투어를 진행했고, 대규모 공연 MD 판매와 더불어 NCT 10주년 기념 팝업, 에스파, 라이즈(RIIZE), NCT 위시 신보 발매와 연계된 팝업 이벤트 등을 열었다.', '1f90f41731db9405e4c0268c455ebcade8553ab01834055436165e30a0332f95',
      false, false
    ),
    (
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'S10', 10::smallint,
      '주요 종속법인들 역시 각 사업 분야에서 견조한 실적을 보였다.', '3bb4fd3d0850aaff9412083e9f92a6cdcb3286d376a784f8066858b28cb6a39e',
      false, false
    ),
    (
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'S1', 1::smallint,
      '/사진제공=JYP엔터테인먼트 JYP엔터테인먼트(이하 JYP, JYP Ent.)는 글로벌 보이그룹 뻔푸소년CIIU(씨투유)가 현지 첫 미니 앨범을 발매한다고 24일 밝혔다.', 'e82bc07cff8cb89965a777cdda2aa42b20c0d24ca8ae49c9e56b6db057cb7ca0',
      true, true
    ),
    (
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'S2', 2::smallint,
      '뻔푸소년CIIU는 다음달 4일 첫 번째 미니 앨범 ''Closer To ''You''(?近·?)''(클로저 투 ''유''(카오진·니))와 타이틀곡 ''Closer''(클로저)로 중국에서 컴백한다.', 'f80c3c61cda1279606bd3f57b82f1618b37de776e0949c8f377d1f394ebae7a9',
      true, false
    ),
    (
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'S3', 3::smallint,
      '이 그룹은 지난 8일 앨범 포스터와 콘셉트 필름 공개를 시작으로 컴백 준비를 시작했다.', 'b545ba2bb1efe62b9c9cfae01d0763b72a3fa380716302e694f8543a0b31c4f6',
      false, false
    ),
    (
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'S4', 4::smallint,
      '새 앨범은 ''너에게 가까워지는 과정'' 속 청춘의 다양한 감정을 하나의 이야기로 풀어냈다.', 'f9c2d9c1505c55099eec4d19791fff8ebc129d215f638f858e142b369087bc72',
      false, false
    ),
    (
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'S5', 5::smallint,
      '지난 14일에는 수록곡 ''一步一步(Step By Step)''(이부이부(스텝 바이 스텝)) 음원과 뮤직비디오를 선공개했다.', '1940ddea9fa12b6e81372c77ebb20ea832beb94383cdae100a00145c6b04dbad',
      true, false
    ),
    (
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'S6', 6::smallint,
      '뻔푸소년CIIU는 중국에서 유명 브랜드와의 잇단 협업과 대형 무대를 누비며 음악계 유망주로서 영향력을 넓히고 있다.', '56a0fdecfe8890aa3df2375cced5f4cf4d66c0ce93032c65955c33a0e3ec5a32',
      false, false
    ),
    (
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'S7', 7::smallint,
      '다음달 22일에는 중화권 대형 음악 시상식 ''2026 TIMA''(TMELive International Music Awards)에 출격한다.', 'a9e2fd879cd7d1b8d5b4a401f85f3175483f66fc3f8219b67a6faab4f6ae4461',
      false, false
    ),
    (
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'S8', 8::smallint,
      '지난해 ''2025 TIMA''를 통해 정식 데뷔를 알린지 약 1년 만이다.', '90c591403d719e01911c238885a9ba974c34a8a4e5f366aee59516c63b05a2b8',
      false, false
    ),
    (
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'S9', 9::smallint,
      'JYP의 현지화 전략 ''글로벌라이제이션 바이 로컬라이제이션''(Globalization by Localization)의 일환으로 탄생한 뻔푸소년CIIU는 2025년 8월 데뷔 앨범 타이틀곡 ''출발의 여름''으로 중국 최대 음악 플랫폼 QQ 뮤직 일간 인기 차트, 일간 트렌딩 차트 톱 10에 오르기도 했다.', '3473b62553265e2477989486cb641e08db9f5a76da0099ccd9e29686a752a0b5',
      false, false
    ),
    (
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'S10', 10::smallint,
      '한편 JYP는 박진영 대표 프로듀서를 필두로 트와이스, 스트레이 키즈, 데이식스 등 글로벌 탑티어 아티스트를 보유한 종합 엔터테인먼트 기업이다.', 'e9f5b144d202ccf9ad11668e2a9b0ab87595a05bc578aef70903e288ff31d65a',
      false, false
    ),
    (
      'f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'S1', 1::smallint,
      '하반기 빅뱅 투어·신인 데뷔도 [이데일리 윤기백 기자] 와이지엔터테인먼트(122870)는 7일 올해 2분기 연결 기준 매출 1277억 원, 영업이익 110억 원을 기록했다고 공시했다.', 'cfb1680751c795daf594a770adcb587c9cac5e4a4b5b02214a3c72ee00717734',
      true, true
    ),
    (
      'f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'S2', 2::smallint,
      '지난해 같은 기간보다 매출은 27.2%, 영업이익은 31.2% 증가했다.', '9ad2d2805e770c0182e1a42b0c104bb5927a0f6c4c565f832912690808eda8ed',
      true, false
    ),
    (
      'f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'S3', 3::smallint,
      'YG 측은 베이비몬스터와 트레저의 신보 발매와 연계한 MD(굿즈) 판매 호조, 디지털 콘텐츠 수요 확대 등이 실적 개선을 이끌었다고 설명했다.', '660bc70b18ab2eb33ae4c831d8ad76a522b4f3e02e7526437fa1333934f0154a',
      true, false
    ),
    (
      'f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'S4', 4::smallint,
      '하반기에는 소속 아티스트들의 활동이 본격화되며 성장세를 이어간다는 계획이다.', '5faf79361647b37551ea468974822e5b8b837a78346492acdf6dac847f8e9285',
      false, false
    ),
    (
      'f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'S5', 5::smallint,
      '빅뱅은 8월부터 총 19개 도시, 33회 규모의 월드투어를 시작하며, 베이비몬스터는 서울 공연을 시작으로 라틴아메리카와 오세아니아, 유럽까지 무대를 넓혀 두 번째 월드투어를 진행 중이다.', 'e30a827656dddf6bea2d453137850e0e4c1ff4a7ae5ea425632b91674a9ac7c4',
      false, false
    ),
    (
      'f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'S6', 6::smallint,
      '트레저 역시 다양한 활동을 이어갈 예정이다.', '44850908ca861f350a6177c5053f6874e2d3030db0d2a470736994f4b5a35725',
      false, false
    ),
    (
      'f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'S7', 7::smallint,
      '여기에 오는 9월 신규 보이그룹 데뷔도 예고했다.', '23162859942523a96a35ceb618f0802802fb3814b7dfd5e2c3141c10255526a3',
      false, false
    ),
    (
      'f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'S8', 8::smallint,
      'YG는 기존 아티스트의 글로벌 활동과 함께 신인 지식재산권(IP)을 확보하며 중장기 성장 동력을 강화한다는 방침이다.', 'c393032370e645225688c2fece4853a1ae98e5c8df27ae7eaba6435792241708',
      false, false
    ),
    (
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'S1', 1::smallint,
      'LS증권이 12일 2분기 역대 최대 실적을 기록한 코웨이에 대해 하반기에도 해외 법인 호조에 힘입어 실적 성장을 이어갈 것으로 전망했다.', '2fb6f0e93a398775093b754920c124ee10bc21c0912baa6e11ae8715952084b2',
      false, false
    ),
    (
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'S2', 2::smallint,
      '투자의견 ‘매수(BUY)’를 유지하고 목표 주가를 기존 11만원에서 12만원으로 상향했다.', '49f1f49773f1ef0e98afe6786ccb516a47e7fdda93772e519df168fb690b41aa',
      false, false
    ),
    (
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'S3', 3::smallint,
      '전 거래일 코웨이 종가는 9만7600원이다.', '868680cdce54c807fd272eef59934a46d410ee82bc516317f0469f0fa820ad02',
      false, false
    ),
    (
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'S4', 4::smallint,
      '앞서 코웨이는 올해 2분기 연결 매출액 1조4422억원, 영업이익 2532억원을 기록했다고 밝혔다.', '30a051addfac0adb61b89b3a2b93945a40c809c4539a001bedc8ccca87953ae4',
      true, true
    ),
    (
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'S5', 5::smallint,
      '매출과 영업이익 모두 분기 기준 역대 최대 규모다.', '02fffdb5f2468110dd15a9e3282066152120e0e03b2a88bf7bd0ff74faabfe81',
      true, false
    ),
    (
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'S6', 6::smallint,
      '다만 “포천맑은물 사업 중단 영향으로 영업이익률은 전년 동기보다 1.7%포인트(P) 하락한 17.6%를 기록했다”고 설명했다.', '2798cac636fc21359cddb2c8944882574ee41ba4f14eda9358bdd756d8f64196',
      true, false
    ),
    (
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'S7', 7::smallint,
      '국내 부문 매출액은 7.7% 증가한 7868억원을 기록했다.', '0ca430fb7b10be526614368835d66347b9926a83f954f38c762ef841917e8a6e',
      true, false
    ),
    (
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'S8', 8::smallint,
      '렌털 판매량이 3.1% 증가한 49만6000대로 나타났고, 정수기와 BEREX 판매 호조로 렌털 계정도 51.6% 증가한 24만2000계정이 됐다.', '70a0d3e77aec316e82b36ff79ee5485317ded7c9c8fb779c13011c9056446669',
      true, false
    ),
    (
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'S9', 9::smallint,
      '말레이시아 매출액은 주요 제품 판매 호조와 신규 카테고리 출시 효과로 22.2% 증가한 4345억원을 기록했다.', 'f7ac2d79c4d05503eaa0e428e13f416a9a0040c53cc90702b689d896d2f01965',
      true, false
    ),
    (
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'S10', 10::smallint,
      '태국 매출액은 영업조직 확대와 마케팅 효과로 53.9% 증가했으며, 미국도 방문판매와 시판 실적 개선 및 관세 환급 효과로 영업이익이 83.0% 늘었다.', 'e4f2b01316ad3784e36c00bd17425c65d63daac510cd276beca10578fb2bbf86',
      true, false
    ),
    (
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'S1', 1::smallint,
      'SK그룹의 투자 지주회사인 SK스퀘어가 올해 2분기에 사상 최대 수준의 영업이익을 거둔 것으로 나타났다.', 'b54ea3d34348d618c36e517bdbddf6fe1a143cc9a2c7fb6c0050b02757ca9efd',
      false, false
    ),
    (
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'S2', 2::smallint,
      'SK하이닉스의 이익이 급증하면서 지분 약 20%를 보유한 최대 주주인 SK스퀘어 역시 실적이 큰 폭으로 개선된 것이다.', 'd6d1312ea0dceab55f6cd51660a10fefcefbad052520183a8c63d0ebf85fff27',
      true, false
    ),
    (
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'S3', 3::smallint,
      '14일 금융감독원에 따르면 SK스퀘어는 2분기 연결 기준 영업이익이 전년 동기 대비 1273.8% 급증한 19조2354억원을 기록했다.', 'fc0b2ac44519c335ab841cdc449c39cde904a21f2b9503e907a9091cf0b4086e',
      true, true
    ),
    (
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'S4', 4::smallint,
      '당기순이익도 1190.5% 늘어난 18조6750억원에 달했다.', 'a0e8675fe8110c87596a6b00592e392f0e49389edff9c8e5fb54955c60c4d34c',
      true, false
    ),
    (
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'S5', 5::smallint,
      '상반기 누적 영업이익은 27조5137억원, 누적 순이익은 27조498억원으로 각각 집계됐다.', '6bec85596a165856b9a8651b824697232279db2f2af90e36a295055db8411ffb',
      true, false
    ),
    (
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'S6', 6::smallint,
      'SK스퀘어는 이 같은 실적 개선이 SK하이닉스의 실적 호조와 함께 인공지능(AI), 반도체 포트폴리오에 집중하고 꾸준히 주주 환원을 이어온 결과라고 설명했다.', '0f9183d81245ece76e1d1dce7c7943ac10a8d2936eda435f9e39548c01a54716',
      true, false
    ),
    (
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'S7', 7::smallint,
      'SK스퀘어는 AI와 반도체 업종 투자에 집중하기 위해 지난 1월 디지털 광고 회사 인크로스를 SK네트웍스에 매각했다.', 'd17f5c30ed0607e0e3cd75b40fcd4e7d3efbd5a6d3bac4a6ac84feb21883bc03',
      false, false
    ),
    (
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'S8', 8::smallint,
      '올해 상반기에 취득한 자사주 400억원을 지난달 모두 소각한 데 이어, 내년 초까지 700억원의 자사주를 추가로 매입해 소각할 예정이다.', 'da15496892fe2447c887210cb352da386a7f148e7755691d927f1d2e16306c50',
      false, false
    ),
    (
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'S9', 9::smallint,
      'SK스퀘어는 AI와 반도체 중심의 신규 투자를 이어가면서 AI 전환(AX)에도 속도를 낼 계획이라고 밝혔다.', '320d2c379130c4acc43b17efd58e5435841650ee5bccaccaf457f524370cab6c',
      false, false
    ),
    (
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'S10', 10::smallint,
      '김정규 SK스퀘어 사장은 “기업가치 제고를 위해 주주와 적극 소통하고 AX와 반도체 신규 투자를 준비해 나가겠다”고 말했다.', 'c7a2f6fe2c283c409caf12d8ac49f9efecdaa633eedf0c75657231c708515d0e',
      false, false
    ),
    (
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'S1', 1::smallint,
      '현대차 노조, 사측 교섭 재개 요청에 18일 파업 유보', '9360638b9b5a61aca08f33e61eed4c83ee284efc1a26071902f574e5578bb8dd',
      false, false
    ),
    (
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'S2', 2::smallint,
      '신차 효과 앞두고 노사 갈등 봉합 여부 주목 현대자동차 노사가 한 달여 만에 다시 협상 테이블에 앉는다.', '508b0bdb8e45e5e44ad78569e7c83218b33d5469b48dc1864963e36c2d21c8a7',
      false, false
    ),
    (
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'S3', 3::smallint,
      '여름휴가 이후 파업 수위를 높이던 현대자동차 노동조합이 사측의 교섭 재개 요청을 받아들이면서 오는 18일 오후 2시 본교섭을 재개하기로 했다.', '85f2f49646b1687568e6b8ddf480bfc6951bf7d77741ce8fbc6a88b4a6cf1de8',
      true, true
    ),
    (
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'S4', 4::smallint,
      '특히 올해 파업으로 이미 4만대가 넘는 생산 차질이 발생한 데다 하반기 신차 출시를 통한 실적 반등이 필요한 상황인 만큼 18일 교섭 결과가 현대차의 하반기 경영 성적을 좌우할 주요 분수령이 될 전망이다.', '4c32c36606f4244ebe31dc9f549207b31c3941567c7db9cdcec113b119ade0f4',
      true, false
    ),
    (
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'S5', 5::smallint,
      '12일 울산시 북구 현대자동차 울산공장 명촌정문에서 오전조 근무자들이 4시간 부분파업으로 일찍 퇴근하고 있다.', '2070a6ee42f41d5c6f8c2658f3e7094dd8e828dbbedc9377df4522b4d9373fa9',
      false, false
    ),
    (
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'S6', 6::smallint,
      '현대차 노조는 이날부터 18일까지 매일 4∼6시간 파업을 이어간다.', '9517ac4cb9f36cc429ef6fa6aae004702462da7c4cff821dcfe5b6a64381bd0e',
      true, false
    ),
    (
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'S7', 7::smallint,
      '현대차 노조는 지난달 13~15일 근무조별 매일 2시간씩 부분파업을 벌인 데 이어 20~22일과 29~31일에도 매일 4시간씩 파업했다.', 'be9c8b1cf3a7f9763afb0216c237a8aa2e91404188e3e60d9b74a1b3fe7609b3',
      false, false
    ),
    (
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'S8', 8::smallint,
      '현대차 입장에서는 하반기 실적 반등을 위해 생산 정상화가 어느 때보다 중요한 시점이다.', '602ecb3532c6d11bc150f5cc3343960c7b6bb78580df14f32f9662a942259cc1',
      false, false
    ),
    (
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'S9', 9::smallint,
      '상반기 부진을 만회하기 위해 하반기 신차 효과와 판매 확대에 기대를 걸고 있지만, 파업이 장기화하면 신차를 생산하고 적기에 공급하는 데 차질이 생길 수밖에 없다.', '796107f0c2aeda5b5445880879786e1ce23341570774231e425dae7276546fd8',
      false, false
    ),
    (
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'S10', 10::smallint,
      '현대차가 제시한 기본급 8만9000원과 성과금 350%+1000만원, 자사주 15주보다 높은 수준이다.', 'faaee4c11763e5f19d413f9e91d0ace6291fbbf2377ffc44252fb89b41280515',
      false, false
    ),
    (
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'S1', 1::smallint,
      '호텔롯데, 부산롯데호텔 보유 지분 61.17% 매각', '563059f081c0fdd4b1795bd60cdd74b6138bcfcf8228f0067ba7baddfe072d68',
      false, false
    ),
    (
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'S2', 2::smallint,
      '국내 렌터카 업체 1위 롯데렌탈이 미국계 사모펀드(PEF) 텍사스퍼시픽그룹(TPG) 품에 안겼다.', 'bccf0be11023aada384d894333550361c4878dd22c8cb92a123b902ce35f0899',
      true, false
    ),
    (
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'S3', 3::smallint,
      '[더팩트ㅣ장혜승 기자] 국내 렌터카 시장 점유율 1위 업체 롯데렌탈이 미국계 사모펀드(PEF) 텍사스퍼시픽그룹(TPG)에 매각됐다.', '6f4dae6add5a64028042eb4a171257e2a5d870569b543e2d41e297cce0cd4dff',
      false, false
    ),
    (
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'S4', 4::smallint,
      '15일 투자은행(IB) 업계에 따르면 롯데렌탈은 최근 호텔롯데와 부산롯데호텔이 보유 중인 롯데렌탈 지분 61.17%를 TPG에 매각했다.', 'c1683a61dbb05b5a33bc84b3e0031d59d2444fce1825c70072e831d424d96d90',
      true, true
    ),
    (
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'S5', 5::smallint,
      'TPG는 롯데렌탈 인수 대금을 전액 자체 펀드를 통해 조달할 것으로 알려졌다.', '286287032b340aead83ce907c96e6a62385441a6a62961e4f06164e73d34e297',
      true, false
    ),
    (
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'S6', 6::smallint,
      '1989년 금호아시아나그룹 내 ''금호렌터카''로 출발한 롯데렌탈은 2010년 KT로 주인이 바뀌었고 2015년 또 한번 롯데그룹에 매각됐다.', 'c774a90c444103543cf91283aa7bc52981ebd8734d2b721034395d2e191957d6',
      false, false
    ),
    (
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'S7', 7::smallint,
      '롯데렌탈은 지난해 사모펀드인 어피니티에쿼티파트너스가 인수를 시도했으나 공정거래위원회가 올해 1월 독과점 우려를 들어 기업결합을 불허하면서 작업이 무산됐다.', '6af1913e1b7f857d5ed72e7fb204b25926fd2d451c319c0c8740484f66cfa77b',
      false, false
    ),
    (
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'S8', 8::smallint,
      '이후 한국앤컴퍼니도 롯데렌탈 인수에 관심을 보였으나 최종적으로는 TPG가 롯데렌탈을 품게 됐다.', '6cda611ebc237af8c56593758d0a9a0db1119bb165a386beeb2240448a273fcb',
      false, false
    ),
    (
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'S9', 9::smallint,
      '앞서 증권가에서는 TPG의 인수가 롯데렌탈 재평가로 이어질 수 있다는 분석이 나왔다.', '853c4e3f561b314e2a93e3855e6946e3b2c831768186702e2e5c4882678d9c1a',
      false, false
    ),
    (
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'S10', 10::smallint,
      '지난해 매출 약 1100억원, 상각전영업이익(EBITDA)은 240억원을 기록했다.', '2422a7db48490832e38a76fd614f9b55b26ce7f485cc296fafe93d02a5a8e535',
      false, false
    ),
    (
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'S1', 1::smallint,
      '노조 8월 25~27일 파업 찬반 투표 예정 "조선업 호황…기본급 상여금 대폭 인상을"', '51bf5c8460ba50e4ef2913c3986e9a316b9d51e157e968df477aecc26df3cb13',
      false, false
    ),
    (
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'S2', 2::smallint,
      'HD현대중공업 노동조합이 올해 임금·단체협약 교섭 난항으로 파업 준비 수순에 들어갔다.', 'dcc202185040e9d464fd996e2419e6969882b03678c6abcdf3a333481cfb9c57',
      true, false
    ),
    (
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'S3', 3::smallint,
      '금속노조 현대중공업지부(이하 노조)는 14일 중앙노동위원회에 노동 쟁의 조정을 신청했다.', '36acfa540dd5443f119db05928c0ae4912b122ffbb0a8323c0d0d07ca2f68977',
      true, true
    ),
    (
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'S4', 4::smallint,
      '중앙노동위원회가 노사 입장 차가 크다고 판단해 ''조정 중지'' 결정을 내리고, 파업 찬반 투표에서 과반 찬성이 나오면 노조는 합법적인 파업권을 확보하게 된다.', '2813149929836ce00feee13ee8a0dc409072b8d454aa09cb40913d693d5a62fb',
      true, false
    ),
    (
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'S5', 5::smallint,
      '노조는 25일부터 27일까지 조합원을 대상으로 파업 찬반 투표를 진행할 예정이다.', 'd951a3ce4567b99fd7806ba3d459994e0dfa8da6400769d2b9418767b3dce0f7',
      true, false
    ),
    (
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'S6', 6::smallint,
      '앞서 HD현대중공업 노사는 6월 상견례 이후 15차례 교섭을 진행했으나 이견을 좁히지 못했다.', '011b531da25f9ac6829b1b726101eadb15a02be7056641a60577d1d8ba7efc30',
      true, false
    ),
    (
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'S7', 7::smallint,
      '월 기본급 14만 9600원 인상과 상여금 100% 인상을 요구안으로 제시했다.', '28959259eed80aa5da372e8fc2e39c488fd596d106f27209230303ab93bc7c91',
      true, false
    ),
    (
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'S8', 8::smallint,
      '또 영업이익의 30% 성과 공유와 휴가비 등을 통상임금 산입도 요구하고 있다.', 'be99ac1fef2b3dd6692472d03a03da65a820c4cfa4d0a61668bac2d1849c2b4a',
      true, false
    ),
    (
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'S9', 9::smallint,
      '각종 비리와 부당대우, 사건사고와 미담 등 모든 얘깃거리를 알려주세요.', '3be285ac4fe95202832d734b594fbded3b8808d5c2b5142dc5456282f43cf9b0',
      false, false
    ),
    (
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'S10', 10::smallint,
      '사이트 : https://url.kr/b71afn', '55e76e8a534c4081371586b203bcd33f0538535e8be9cd98889f3c44b4c31703',
      false, false
    ),
    (
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'S1', 1::smallint,
      '트럼프, 해군·조선 재건 각서 서명', '3f61c8004b3e0bbd72636df6db57fcc96ce859a878afef467357d23f34669a10',
      false, false
    ),
    (
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'S2', 2::smallint,
      '수상전투함·유조선·로로선 등 제한', '9dfb29642042b5e24d18d1900cb1210139e803bd39986c1507e5d63a2dcb4d8e',
      false, false
    ),
    (
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'S3', 3::smallint,
      '신규 조선소도 건설, 韓 수혜 기대', '1afc65d05a0d10b502a863c0ec2d7c09cb67e6c2a1112e632cc2ce6e44a17722',
      false, false
    ),
    (
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'S4', 4::smallint,
      '이태규 특파원 도널드 트럼프 미국 대통령이 외국 조선소에서 군함을 2척까지 건조하는 방안을 조건부로 허용했다.', 'fb3f707274f9c5ee9a018ce3fed48692d8fef006fcfe49ac92226ce33a271252',
      true, false
    ),
    (
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'S5', 5::smallint,
      '한화오션의 거제 조선소에서 미국 군함을 건조할 수 있는 길이 열릴 수 있다는 기대와 함께 의회가 변수가 될 수 있다는 신중론도 나온다.', '704672069b32aeffd946a034cd48c56d2a7726f03cb5e93fa43ee65b277487bb',
      false, false
    ),
    (
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'S6', 6::smallint,
      '트럼프 대통령은 13일(현지 시간) ‘미 해군과 조선산업 기반 재건’이라는 각서에 서명하고 “미국에 조선소를 건설하거나 기존 조선소의 소유권 또는 과반 지분을 확보한 외국 조선업체가 대상”이라고 밝혔다.', '9f673b1f996538420ad9c3d9e80039707711870490838be9c42039d61c6efdfa',
      true, true
    ),
    (
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'S7', 7::smallint,
      '미국 필라델피아 필리조선소를 인수한 한화가 이 조건에 부합한다.', 'cde5c5c6b1d7046facce11f585669d3f8bf99d2c7470da3769cc83387e28d607',
      true, false
    ),
    (
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'S8', 8::smallint,
      '한화오션과 한화시스템 컨소시엄은 2024년 지분 100%를 인수했다.', 'c7fbee39ac74807bb6b68c7d17184b627d09ee3264d66b5304887e76e30f09e6',
      true, false
    ),
    (
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'S9', 9::smallint,
      '또 최초 2척 이후 미국 조선소에서 이뤄지는 모든 선박의 건조와 유지·보수에 미국 내 공급망을 활용해야 한다는 조건도 달았다.', '9b1291917e82b416f3e50e2ab80c9bb851cec9c276435f06e3325d77524b6bb0',
      true, false
    ),
    (
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'S10', 10::smallint,
      '향후 행정부와 상하원 간 의견 조율이 우리 업체의 최종 계약에 변수가 될 것으로 보인다.', '8172af24da7f003eb7f84e5ae7091a3cf892def22cb5ebe7cb33d28e0e686229',
      false, false
    ),
    (
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'S1', 1::smallint,
      '양사 이사회 및 주총서 합병안 최종 가결…5년9개월 절차 마무리', 'e135d2d74c7d59fe46a51b590d0e188d8c7a8e22c0014ec69f67335fce6f042d',
      false, false
    ),
    (
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'S2', 2::smallint,
      '매출 23조원·항공기 230대…여객 15위·화물 5위 재탄생', 'e639bb61d7fa4bba158228a6a51cfebe4beafc14d90def2db321e3dfa3bc1d27',
      false, false
    ),
    (
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'S3', 3::smallint,
      '[서울=뉴시스]남주현 기자 = 조원태 한진그룹 회장이 추진해 온 대한항공과 아시아나항공의 인수·합병(M&A) 절차가 이사회 및 주주총회를 통과하며 막바지 단계에 진입했다.', 'b1d7b107acfd40a8575770a4b61cbcbb1a6f9e8aedc2ff57e2981a158c94bc94',
      false, false
    ),
    (
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'S4', 4::smallint,
      '두 회사는 남은 행정 절차를 거쳐 오는 12월 17일 통합 법인을 공식 출범해 2020년 11월 인수 결정 발표 이후 5년 9개월 만에 합병 절차를 마무리 지을 예정이다.', 'e7d060adb04b8c0c32f2e81b4276e46882d6ceca0ca6a83a5797fed0d5e1ea45',
      true, false
    ),
    (
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'S5', 5::smallint,
      '15일 항공업계에 따르면 대한항공과 아시아나항공은 연말까지 합병 등기 등 남은 절차를 차질 없이 완료할 계획이다.', 'c4833ff61bbfb16c678c001f4fd14fe7751cc32a7ed9ece351f254f63c5cd3f3',
      false, false
    ),
    (
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'S6', 6::smallint,
      '존속법인인 대한항공은 서울 중구 서소문 빌딩에서 정기 이사회를 열고 ''합병 승인의 건''을 가결했다.', '9f2210b8b5138353ed667c518efa525a2089ea4ab8bf30a706ddee762191d6f7',
      true, true
    ),
    (
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'S7', 7::smallint,
      '아시아나항공도 서울 강서구 본사에서 임시 주주총회를 열고 지난 5월 대한항공과 체결한 ''합병계약 체결 승인의 건''을 통과시켰다.', 'a6956e677222a4927a6a9b30912bc2c219843a36cbeb600b8ba200cbcef0a3da',
      true, false
    ),
    (
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'S8', 8::smallint,
      '새로 출범하는 통합 대한항공은 연 매출 23조 원 이상, 보유 항공기 230여 대, 임직원 2만8000명 규모를 갖추게 된다.', '2c6ce4a2a40665c0be3fceae4491d762f6dc12d68b8133f563a0920591789ed7',
      true, false
    ),
    (
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'S9', 9::smallint,
      '[인천공항=뉴시스] 박주성 기자 = 아시아나항공이 임시주주총회를 열고 대한항공과 합병 체결을 가결한 12일 인천국제공항 제2여객터미널 활주로에 대한항공과 아시아나 항공기가 이동하고 있다.', '2f59d53c4453b04228fe1d6804581eb5fe20adc5c3415f931549deb3f5fabbd6',
      false, false
    ),
    (
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'S10', 10::smallint,
      '특히 대한항공과 델타항공이 맺은 조인트벤처(JV) 판매망에 아시아나항공 노선을 편입해 미주 노선 경쟁력을 높일 계획이다.', 'd35d24b3ed51a6fbfe7dc1dc74426389115ec2ba5154a2ea01f972c4dfb95619',
      true, false
    ),
    (
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'S1', 1::smallint,
      '한진칼, 특수관계자 지분 0.01%p 확대', '1f19a69a1adb17a9f013b44cfde40ad3a4d86040ed624864d0700ef67a7bd290',
      false, false
    ),
    (
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'S2', 2::smallint,
      '공익법인은 주식 사고 이명희 고문은 팔고', 'cd82a094bc38dc9782bebf5234e8612abe779b0c71cc6419d2277e797714b874',
      false, false
    ),
    (
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'S3', 3::smallint,
      '이명희, 지분 1.83%...5년간 1088억 매각 한진그룹 공익법인이 예고한 대로 지주사 한진칼 지분을 사들였다.', '9b9ba6e6402a07c452226d08916f390ef5680e79ac38ff3ff30310266f05d1b9',
      true, false
    ),
    (
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'S4', 4::smallint,
      '조원태 한진칼 회장(사진)의 모친 이명희 정석기업 고문이 일부 지분을 매각하면서다.', '822db18bf250d2adea8e1b8f14eac8b5448e7bca1fd166e8073475880dc41975',
      true, false
    ),
    (
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'S5', 5::smallint,
      '호반그룹이 한진칼 지분을 사들이며 한진칼 경영진을 압박하는 가운데 한진칼의 소규모 지분변동도 민감해지는 분위기다.', 'c0b4de6bfc8596000e474454312abb05d3e4ec4625efd8fddeb5407d921e9def',
      false, false
    ),
    (
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'S6', 6::smallint,
      '한진칼은 지난 11일 조 회장 등 특수관계자 지분이 기존 31.15%(2079만6274주)로 기존보다 6280주(0.01%) 늘었다고 공시했다.', '3756e85abd43a5adfe044f5f87f627bfbb6e029c2412eb28a089f338063b6071',
      true, true
    ),
    (
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'S7', 7::smallint,
      '이 공익법인은 지난 6~7월 ''올 연말까지 한진칼 지분을 취득하겠다''고 공시했고, 이번에 예고대로 한진칼 지분 매입에 나선 것이다.', '24fab50e0f7b3f0e155120969b25196813a4703dae086b27f2d33c1036e5ccae',
      false, false
    ),
    (
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'S8', 8::smallint,
      '1023억원 규모 한진칼 지분을 취득하겠다고 밝힌 정석물류학술재단은 연말까지 추가로 930억원 규모 지분 매입에 나설 것으로 보인다.', '00c31d0cd3318b66e6f2bb5edae2ee40b7e77f7019f80bf653d5ce539dd9efaa',
      false, false
    ),
    (
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'S9', 9::smallint,
      '지난달 기준 호반그룹은 한진칼 지분 20.15%를 보유하고 있다.', '1b24a2d195567fcad9f4fbf3713eeb7f1d8704938ea86048fc999276f2883251',
      true, false
    ),
    (
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'S10', 10::smallint,
      '한진칼 지분 보유 현황을 보면 △호반건설 11.5% △호반호텔앤리조트 8.34% △호반산업 0.17% △호반 0.15% 등으로 2022년부터 한진칼 주식 매입에 총 8782억원을 투입했다.', '452461b8f7512066fcacbc557f983cabc092f6b3b559725777f4b7a3a2dc5bff',
      false, false
    ),
    (
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'S1', 1::smallint,
      '한국콜마·코스맥스·코스메카코리아 매출 사상 최대', 'b4a46da43c5f584216691fa0096edb41eb56e2acd47b3885efee89369a729e06',
      false, false
    ),
    (
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'S2', 2::smallint,
      '에이피알·달바글로벌·애경산업 등도 합류해', '1a58540459f0174204afe5e602e9426769a9cc0e35d09e3a46f325ecd9af690c',
      false, false
    ),
    (
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'S3', 3::smallint,
      '수출 지역 다변화에 하반기에도 호실적 기대', '240672db48c3bb3a9575851f3a8a97d3683c40af60eb4ee42db1a7cee728461f',
      false, false
    ),
    (
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'S4', 4::smallint,
      '사진제공=에이피알 K뷰티의 인기가 글로벌 시장으로 빠르게 확산되면서 국내 화장품 브랜드사에서부터 제조업자개발생산(ODM) 업체까지 모두 잇달아 최대 실적을 경신했다.', '31c2354a820d1b193d201a1d0cb825f95cf532ed27ceee9cd9bdc49470939705',
      false, false
    ),
    (
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'S5', 5::smallint,
      '코스맥스의 2분기 매출액과 영업이익은 각각 7949억 원과 737억 원으로 전년 동기 대비 27.5%, 21.2%의 증가율을 보였다.', '48c87efd9cf6278ecee91dd1e1e67cae0863225fcf6a5315b921177409c73aab',
      false, false
    ),
    (
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'S6', 6::smallint,
      '특히 한국법인의 매출액은 전년 동기 대비 23% 증가한 5184억 원을 기록하며 분기 기준 처음으로 5000억 원을 넘어섰고, 부진했던 미국 법인은 창사 이래 처음으로 흑자 전환에 성공했다.', '14cee8226757b3435fe7205e717ad0deb4b19087ce09cd23ae6cdca3f7dd2b73',
      false, false
    ),
    (
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'S7', 7::smallint,
      '코스메카코리아도 매출액 2261억 원(+39.8%)과 영업이익 321억 원(+39.3%)을 기록하며 분기 기준 역대 최대 실적을 기록했다.', '7401a98facf1ae96d75345658bcaee991b94638a8911a50cfc09a9ba40d48759',
      false, false
    ),
    (
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'S8', 8::smallint,
      '대표적으로 에이피알은 북미와 유럽 시장에서 가파르게 성장하며 분기 기준 역대 최대인 매출액 7675억 원(+ 134.2%)과 영업이익 1906억 원(+134.5%)을 기록했다.', 'cc568f0945b42b1f527e51c5b34eb6634474bfeca49171c91b85824ee4687877',
      true, true
    ),
    (
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'S9', 9::smallint,
      '이로써 에이피알이 거둔 올 상반기 매출액은 1조 3609억 원으로, 지난해 연간 매출액(1조 5273억 원)에 맞먹는다.', 'fb47da5f88eca55db33b732b8ec9c6b5058720a6f2ab98ea94d9487919e6bd2c',
      true, false
    ),
    (
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'S10', 10::smallint,
      '달바글로벌 역시 올 2분기 매출액 1869억 원(+46%)과 영업이익 472억 원(+62%)을 기록하며 분기 기준 역대 최대 실적 행렬에 합류했다.', '5dd5be0213b0f76b1535e0245d1c03631865dcbda3c66176d5ccc700195e7e75',
      true, false
    ),
    (
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'S1', 1::smallint,
      '매출도 1869억으로 최대…북미·유럽 판매 확대', 'f3ebcc49223add1b34f66e701c75901036bc6d21eb58cec6e448b750d3eae721',
      false, false
    ),
    (
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'S2', 2::smallint,
      '달바글로벌 제품 (달바글로벌 제공)', '7324a65cad9b01afbe4f981f7b7fef8dd6b6baf3bde959401b245cb6b7b06b35',
      false, false
    ),
    (
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'S3', 3::smallint,
      '(서울=뉴스1) 정윤영 기자 = 달바글로벌이 해외 화장품 판매 확대에 힘입어 올해 2분기 역대 최대 분기 매출과 영업이익을 기록했다.', '8fb60d6dfd71a03f02aea5c50a389ae2ac194a88aea7bcb185b385e831fe1c11',
      true, false
    ),
    (
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'S4', 4::smallint,
      '13일 달바글로벌은 금융감독원 전자공시시스템(DART)을 통해 올해 2분기 연결 기준 영업이익이 472억 4100만원으로 전년 동기 대비 61.6% 증가했다고 공시했다.', '068b0d8dde82da32bc0bc9a05cc16042470822d1c60ff70f08cda8c06702c340',
      true, true
    ),
    (
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'S5', 5::smallint,
      '같은 기간 매출은 1868억 6100만 원으로 45.6% 늘었으며 당기순이익은 380억 6000만 원으로 92.2% 증가했다.', '20b84f5e15ddb7e3a7d69542c4adcae32498e956b6da74a2c78831b6c02a7bd1',
      true, false
    ),
    (
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'S6', 6::smallint,
      '직전 분기와 비교하면 매출은 9.1%, 영업이익은 4.8%, 당기순이익은 4.7% 각각 늘었다.', 'c4b8a62212825b1a78476db20784ea1c8e39bb6a25eaa5649887fadbe3075c83',
      false, false
    ),
    (
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'S7', 7::smallint,
      '2분기 영업이익률은 25.3%로 전년 동기보다 2.5%포인트(p) 상승했다.', '9b9938bfbbee2583c232663408b019adab09fee6518fbe9f0a46fb7a4f3421be',
      false, false
    ),
    (
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'S8', 8::smallint,
      '영업이익은 923억 3100만 원으로 55.8%, 당기순이익은 743억 9700만 원으로 67.0% 각각 늘었다.', '58a38c8f8d111761a95cad10b1b1602b0296ffac14f454517157de807ec182bc',
      false, false
    ),
    (
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'S9', 9::smallint,
      '달바글로벌이 이날 공개한 실적 자료에 따르면 2분기 해외 매출은 1415억 원으로 전년 동기보다 74% 증가했다.', '8b7ac54a5f1512d587476a01aa349546c5bf8ee11f01c9c34f4c950d35d86513',
      true, false
    ),
    (
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'S10', 10::smallint,
      '달바글로벌은 화이트 트러플을 핵심 원료로 사용하는 프리미엄 비건 스킨케어 브랜드 ''달바''를 운영하는 화장품 기업이다.', 'dcac9527135f4d2f4c1757f5e280ea619d9097eb9b4b3d9c352ee3e1e9264b1b',
      true, false
    ),
    (
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'S1', 1::smallint,
      '중국과 면세점 부진에 짓눌려 ‘만년 저평가주’ 취급을 받던 LG생활건강이다.', '598e78be98dbbe69e6c46f5a964a3c980fa052b604f559cb5f5aaf13b4ae184d',
      false, false
    ),
    (
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'S2', 2::smallint,
      '2분기 실적 발표 직후인 7월 30일 하루에만 주가가 11% 급등했고, 8월 초에도 15% 넘게 뛰며 코스피 대형주 가운데 가장 높은 상승률을 기록했다.', '0767bba5d7e4d3f7853211d70f12470051e85232c6e53f487ff02679b11bbab9',
      false, false
    ),
    (
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'S3', 3::smallint,
      '그는 LG생활건강 영업이익이 올해 3940억원으로 전년보다 130% 늘고, 내년에는 6230억원까지 불어날 것으로 내다봤다.', '17ca7628969f41fad6b97b551025ae3852830b10c3e0039a740c0ba31955ca02',
      false, false
    ),
    (
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'S4', 4::smallint,
      '2005년부터 17년간 회사를 이끈 차석용 전 부회장은 코카콜라음료, 더페이스샵, 해태음료, 피지오겔 등 20건 넘는 인수합병(M&A)을 성사시키며 매 분기 사상 최대 실적을 갈아치웠다.', '3bfc8ce55bfa58eeb8dc9653655be1e709d9ebed508b03b164389da82b2231ad',
      false, false
    ),
    (
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'S5', 5::smallint,
      '‘두피도 피부처럼 관리한다’는 스키니피케이션 트렌드에 올라타 아마존 프라임데이에서 전년 대비 46% 매출 성장을 기록했고, 8월부터 미국 세포라 400여개 매장으로 판매를 확대한다.', '28534f591bb6519f63156df10d886bd0bf44db3aeb5b7e2b76ed2e594e45031a',
      false, false
    ),
    (
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'S6', 6::smallint,
      '2분기 연결 매출 1조6574억원(3.3% 증가), 영업이익 1028억원(87.5% 증가)으로 시장 전망치를 37% 웃돌았다.', '9e403d1d7020c1673d075ba0512554c1784edcb25d4a4a15c71cee7f067d29a2',
      true, true
    ),
    (
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'S7', 7::smallint,
      '화장품·생활용품·음료 전 사업부문 매출이 성장세로 돌아선 가운데, 적자에 시달리던 화장품 부문이 영업이익 444억원으로 흑자전환했다.', 'ce032132baeab403a707f980534f1486be10390625549c5b19765aa5f3943277',
      true, false
    ),
    (
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'S8', 8::smallint,
      '마케팅비를 늘리고도 북미 법인이 분기 흑자를 냈고, 북미 매출에서 자체 브랜드 비중은 50%까지 높아졌다.', '2a4a9da8fbccc5b34071596de514319204f87203510ca1594c9a55ba367d471b',
      true, false
    ),
    (
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'S9', 9::smallint,
      '박현진 애널리스트는 “일회성 수익인 미국 관세 환급 150억원을 제거하고 봐도 호실적”이라며 2026년 순이익 추정치를 20% 상향했다.', 'b7954918445efa22f35b992368d3079ec40ba9df6018b4587999b638dedce29d',
      false, false
    ),
    (
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'S10', 10::smallint,
      '폭락장에서 실적의 힘으로 역주행한 LG생활건강이 단기 반등을 넘어 본격적인 재평가로 나아갈지, 하반기 북미 사업 성과가 시금석이다.', 'e72f60f18d63a24002e3ca0a7853c60f0286c07277e52ffa30cfe71fa3fbc279',
      false, false
    )
) as unit(
  source_key, source_unit_id, ordinal, source_text, source_text_hash,
  is_selected, is_anchor
) on unit.source_key = article.source_key
where not exists (
  select 1 from public.news_source_units as existing
  where existing.article_id = article.id
    and existing.source_unit_id = unit.source_unit_id
)
on conflict (article_id, source_unit_id) do nothing;

insert into public.news_article_stocks (article_id, stock_id, subject_role)
select article.id, stock.stock_id, 'primary'
from public.news_articles as article
join (
  values
    ('bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', '036570'),
    ('2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', '192080'),
    ('89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', '011200'),
    ('970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', '066570'),
    ('63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', '003230'),
    ('c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', '271560'),
    ('a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', '004370'),
    ('7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', '096770'),
    ('56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', '041510'),
    ('b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', '035900'),
    ('f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', '122870'),
    ('0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', '021240'),
    ('f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', '402340'),
    ('d349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', '005380'),
    ('58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', '089860'),
    ('c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', '329180'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', '042660'),
    ('7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', '003490'),
    ('7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', '020560'),
    ('0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', '180640'),
    ('e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', '278470'),
    ('e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', '483650'),
    ('55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', '483650'),
    ('ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', '051900')
) as subject(source_key, stock_code) on subject.source_key = article.source_key
join public.stocks as stock on stock.stock_code = subject.stock_code
where not exists (
  select 1 from public.news_article_stocks as existing
  where existing.article_id = article.id
    and existing.stock_id = stock.stock_id
)
on conflict (article_id, stock_id) do nothing;

insert into public.news_publications (
  article_id, status, selector_event_type, reviewer_event_type,
  selector_stock_codes, reviewer_stock_codes, focus_statement,
  headline, home_summary,
  summary_line_1, summary_line_1_fact_key,
  summary_line_2, summary_line_2_fact_key,
  summary_line_3, summary_line_3_fact_key,
  price_connection_kind, price_connection_basis, price_connection_text,
  term_treatments, deterministic_facts_pass,
  review_allowed_scope, review_primary_subject, review_direct_materiality,
  review_source_fidelity, review_focus_alignment,
  review_concise_three_line_summary, review_no_irrelevant_detail,
  review_attribution_and_timing, review_all_terms_easy,
  review_same_headline_across_surfaces, review_distinct_summary_facts,
  review_price_connection_grounded, review_term_explanation_coverage,
  review_investment_safety, review_no_sentiment_label,
  editor_attempts, ready_at
)
select
  article.id, 'draft', publication.event_type, publication.event_type,
  publication.stock_codes, publication.stock_codes,
  publication.focus_statement, publication.headline, publication.home_summary,
  publication.summary_line_1, publication.summary_line_1_fact_key,
  publication.summary_line_2, publication.summary_line_2_fact_key,
  publication.summary_line_3, publication.summary_line_3_fact_key,
  publication.price_connection_kind, publication.price_connection_basis,
  publication.price_connection_text, publication.term_treatments,
  true, publication.allowed_scope, publication.primary_subject,
  publication.direct_materiality, publication.source_fidelity,
  publication.focus_alignment, publication.concise_three_line_summary,
  publication.no_irrelevant_detail, publication.attribution_and_timing,
  publication.all_terms_easy, publication.same_headline_across_surfaces,
  publication.distinct_summary_facts, publication.price_connection_grounded,
  publication.term_explanation_coverage, publication.investment_safety,
  publication.no_sentiment_label, publication.editor_attempts, now()
from public.news_articles as article
join (
  values
    (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'earnings',
      array['036570']::text[], '엔씨소프트가 2026년 2분기 매출 7705억 원, 영업이익 1739억 원, 당기순이익 1312억 원을 기록했다고 밝혔다.',
      '엔씨소프트, 2026년 2분기 매출 7705억 원·영업이익 1739억 원 기록', '엔씨소프트, 2026년 2분기 매출 7705억 원·영업이익 1739억 원 기록',
      '당기순이익은 1312억 원이에요.', 'net_income',
      '영업이익은 지난 분기보다 53% 늘었어요.', 'operating_profit_growth',
      '한국 매출 비중은 48%예요.', 'korea_revenue_share',
      'business_performance',
      'event_education',
      '이번 매출과 영업이익은 회사의 사업 성과를 보여주는 수치예요.',
      '[{"term":"해외 매출","easyText":"외국에서 제품이나 서비스를 팔아 번 돈","treatment":"explained","sourceIds":["S1","S7"]},{"term":"실적","easyText":"일정 기간 동안 사업을 한 결과","treatment":"explained","sourceIds":["S1","S2","S3"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S1","S3","S4","S5"]},{"term":"전년 대비","easyText":"지난해와 비교한 변화","treatment":"explained","sourceIds":["S1"]},{"term":"PC 매출","easyText":"컴퓨터 게임으로 번 돈","treatment":"explained","sourceIds":["S2"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S1","S2","S3","S4","S6","S7","S8"]},{"term":"실적 결산","easyText":"사업 결과를 모아 정리하는 일","treatment":"explained","sourceIds":["S3"]},{"term":"연결기준","easyText":"여러 회사의 결과를 합쳐 계산하는 방식","treatment":"explained","sourceIds":["S3"]},{"term":"당기순이익","easyText":"모든 비용을 빼고 마지막에 남은 돈","treatment":"explained","sourceIds":["S3"]},{"term":"전분기 대비","easyText":"바로 앞 분기와 비교한 변화","treatment":"explained","sourceIds":["S4"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교한 변화","treatment":"explained","sourceIds":["S4"]},{"term":"영업이익률","easyText":"매출 중 사업 뒤 남은 돈의 비율","treatment":"explained","sourceIds":["S5"]},{"term":"지역별 매출 비중","easyText":"전체로 번 돈에서 지역마다 차지한 몫","treatment":"explained","sourceIds":["S6"]},{"term":"해외 매출 비중","easyText":"전체로 번 돈에서 외국 몫의 비율","treatment":"explained","sourceIds":["S7"]},{"term":"증가세","easyText":"계속 늘어나는 흐름","treatment":"explained","sourceIds":["S7"]},{"term":"글로벌 모바일 게임 플랫폼","easyText":"세계 여러 곳에서 쓰는 모바일 게임 서비스","treatment":"explained","sourceIds":["S8"]},{"term":"최초 연결 편입","easyText":"처음으로 사업 결과를 함께 계산한 일","treatment":"explained","sourceIds":["S8"]},{"term":"모바일 캐주얼 사업","easyText":"휴대전화로 가볍게 즐기는 게임 사업","treatment":"explained","sourceIds":["S8"]},{"term":"전체 분기 매출","easyText":"한 분기 동안 회사가 번 모든 돈","treatment":"explained","sourceIds":["S8"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      2::smallint
    ),
    (
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'earnings',
      array['192080']::text[], '더블유게임즈가 2분기 매출 2106억원과 영업이익 701억원을 기록했다고 12일 공시했다.',
      '더블유게임즈, 2분기 매출 2106억원·영업이익 701억원 기록', '더블유게임즈, 2분기 매출 2106억원·영업이익 701억원 기록',
      '전년 동기 대비 매출 22.5%, 영업이익 29% 늘었어요.', 'growth_rates',
      '직접판매(DTC) 매출 비중은 47.5%예요.', 'dtc_revenue_share',
      '지난해 7월 인수한 와우게임즈 실적도 더해졌어요.', 'wowgames_performance',
      'business_performance',
      'event_education',
      '매출과 영업이익은 회사의 사업 결과를 보여주는 숫자예요.',
      '[{"term":"소셜카지노","easyText":"카지노처럼 즐기는 온라인 게임","treatment":"explained","sourceIds":["S3"]},{"term":"캐주얼게임 사업","easyText":"가볍게 즐기는 게임을 만드는 사업","treatment":"explained","sourceIds":["S3"]},{"term":"사상 최대 실적","easyText":"지금까지 가장 좋은 사업 결과","treatment":"explained","sourceIds":["S3"]},{"term":"연결 기준","easyText":"본사와 자회사를 합쳐 계산한 기준","treatment":"explained","sourceIds":["S4"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S4","S5","S6","S8"]},{"term":"영업이익","easyText":"사업 비용을 빼고 본업에서 남긴 돈","treatment":"explained","sourceIds":["S4","S5","S8"]},{"term":"공시","easyText":"회사가 중요한 내용을 공식적으로 알리는 일","treatment":"explained","sourceIds":["S4"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교해","treatment":"explained","sourceIds":["S5","S8"]},{"term":"자체 결제 시스템","easyText":"회사가 직접 결제를 처리하는 방법","treatment":"explained","sourceIds":["S7"]},{"term":"직접판매(DTC)","easyText":"중간 판매처 없이 고객에게 직접 파는 방식","treatment":"explained","sourceIds":["S7"]},{"term":"매출 비중","easyText":"전체 매출에서 차지하는 부분의 크기","treatment":"explained","sourceIds":["S7"]},{"term":"플랫폼 수수료","easyText":"플랫폼에 내는 이용료","treatment":"explained","sourceIds":["S7"]},{"term":"수익성 개선","easyText":"번 돈에서 비용을 뺀 결과가 좋아짐","treatment":"explained","sourceIds":["S7"]},{"term":"상반기 누적 매출","easyText":"한 해 전반기에 벌어들인 매출을 합한 금액","treatment":"explained","sourceIds":["S8"]},{"term":"인수한","easyText":"다른 회사나 사업을 사서 맡게 된","treatment":"explained","sourceIds":["S9"]},{"term":"실적","easyText":"회사가 사업에서 낸 결과","treatment":"explained","sourceIds":["S3","S9"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      2::smallint
    ),
    (
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'earnings',
      array['011200']::text[], 'HMM의 2분기 영업이익은 3541억원으로 전년 동기 대비 52% 증가했다.',
      'HMM, 2분기 영업이익 3541억원…전년 동기 대비 52% 증가', 'HMM, 2분기 영업이익 3541억원…전년 동기 대비 52% 증가',
      '영업이익은 직전 분기보다 31.6% 늘었어요.', 'operating_profit_qoq',
      '2분기 매출은 3조4020억원이에요.', 'q2_revenue',
      '물류 성수기가 예년보다 일찍 시작됐어요.', 'early_peak_season',
      'business_performance',
      'event_education',
      '영업이익과 매출 변화는 회사의 사업 성과와 연결돼요.',
      '[{"term":"2만4000TEU급 컨테이너선","easyText":"컨테이너를 아주 많이 실을 수 있는 큰 배","treatment":"explained","sourceIds":["S1"]},{"term":"TEU","easyText":"컨테이너를 실을 수 있는 양을 세는 단위","treatment":"explained","sourceIds":["S1"]},{"term":"매출","easyText":"물건이나 서비스를 팔아 들어온 전체 돈","treatment":"explained","sourceIds":["S1","S5","S7"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교한 것","treatment":"explained","sourceIds":["S1","S3"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S2","S3","S4"]},{"term":"실적","easyText":"회사가 일정 기간 동안 낸 사업 결과","treatment":"explained","sourceIds":["S6","S7"]},{"term":"반등","easyText":"줄어들던 수치가 다시 올라가는 것","treatment":"explained","sourceIds":["S6"]},{"term":"해상운임","easyText":"배로 물건을 나를 때 내는 운송료","treatment":"explained","sourceIds":["S6"]},{"term":"매출 손실","easyText":"물건을 팔아 벌 돈이 줄어든 것","treatment":"explained","sourceIds":["S7"]},{"term":"연료비","easyText":"배나 차량을 움직이는 연료에 드는 돈","treatment":"explained","sourceIds":["S7"]},{"term":"원가 부담","easyText":"만드는 데 드는 비용이 커져 생기는 부담","treatment":"explained","sourceIds":["S7"]},{"term":"물류 성수기","easyText":"물건을 나르는 일이 평소보다 바쁜 때","treatment":"explained","sourceIds":["S7"]},{"term":"수익성","easyText":"번 돈에서 비용을 뺀 뒤 얼마나 남는지 보여주는 정도","treatment":"explained","sourceIds":["S7"]},{"term":"상하이컨테이너운임지수(SCFI)","easyText":"상하이에서 배로 물건을 나르는 비용을 보여주는 숫자","treatment":"explained","sourceIds":["S8"]},{"term":"SCFI","easyText":"상하이에서 출발하는 컨테이너 운송료를 나타내는 숫자","treatment":"explained","sourceIds":["S8","S9"]},{"term":"전년 동기보다","easyText":"지난해 같은 기간보다","treatment":"explained","sourceIds":["S9"]},{"term":"직전 분기","easyText":"바로 앞의 사업 기간","treatment":"explained","sourceIds":["S4"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      2::smallint
    ),
    (
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'merger_or_ownership',
      array['066570']::text[], 'LG전자의 소액주주 수가 올해 상반기 처음 100만명을 넘어 6월 말 122만7359명으로 집계됐고, 소액주주 보유 지분은 전체 발행주식의 58.43%였다.',
      'LG전자, 올해 상반기 소액주주 수 100만명 첫 돌파', 'LG전자, 올해 상반기 소액주주 수 100만명 첫 돌파',
      'LG전자 반기보고서상 6월 말 소액주주는 122만 7359명이에요', 'june_shareholder_count',
      '소액주주 지분은 발행주식의 58.43%예요.', 'minority_share_ratio',
      '소액주주가 지난해 말보다 약 71만 6000명 늘었어요.', 'shareholder_count_increase',
      'ownership_and_credit',
      'event_education',
      '소액주주 수와 지분은 누가 회사 주식을 얼마나 갖는지 보여주는 정보예요.',
      '[{"term":"인공지능(AI)","easyText":"사람처럼 배우고 판단하는 컴퓨터 기술","treatment":"explained","sourceIds":["S5"]},{"term":"신사업","easyText":"회사가 새로 시작하거나 키우는 사업","treatment":"explained","sourceIds":["S5"]},{"term":"소액주주","easyText":"회사 주식을 적게 가진 사람","treatment":"explained","sourceIds":["S5","S6","S7"]},{"term":"반기보고서","easyText":"회사의 반년 사업 내용을 담은 보고서","treatment":"explained","sourceIds":["S6"]},{"term":"지분","easyText":"회사 전체 주식 중 가진 몫","treatment":"explained","sourceIds":["S7"]},{"term":"발행주식","easyText":"회사가 만들어 내놓은 주식 전체","treatment":"explained","sourceIds":["S7"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      2::smallint
    ),
    (
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'earnings',
      array['003230']::text[], '삼양식품이 2분기 연결 기준 매출 7703억원과 영업이익 1762억원을 공시했으며, 해외매출은 6458억원으로 전년 동기보다 46.7% 늘었다.',
      '삼양식품, 2분기 연결기준 매출액 7703억원·영업이익 1762억원 공시', '삼양식품, 2분기 연결기준 매출액 7703억원·영업이익 1762억원 공시',
      '매출액은 지난해보다 39.3% 늘었어요.', 'revenue_growth',
      '해외매출은 6458억원으로 46.7% 늘었어요.', 'overseas_revenue',
      '분기 해외매출이 6000억원을 넘은 건 처음이에요.', 'overseas_revenue_record',
      'business_performance',
      'event_education',
      '매출과 영업이익은 회사의 판매 규모와 사업 성과에 연결돼요.',
      '[{"term":"연결기준","easyText":"본사와 자회사의 숫자를 합쳐 계산한 기준","treatment":"explained","sourceIds":["S1"]},{"term":"매출액","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S1"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S1","S8"]},{"term":"공시","easyText":"회사의 중요한 내용을 공개하는 일","treatment":"explained","sourceIds":["S1"]},{"term":"실적","easyText":"회사가 일정 기간에 낸 사업 결과","treatment":"explained","sourceIds":["S3"]},{"term":"해외매출","easyText":"외국에서 제품을 팔아 얻은 금액","treatment":"explained","sourceIds":["S4","S5"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교한 것","treatment":"explained","sourceIds":["S4"]},{"term":"유통채널","easyText":"제품이 고객에게 가는 판매 경로","treatment":"explained","sourceIds":["S6"]},{"term":"입점 확대","easyText":"제품을 파는 매장을 더 늘리는 일","treatment":"explained","sourceIds":["S6"]},{"term":"진출국","easyText":"회사가 사업을 시작한 나라","treatment":"explained","sourceIds":["S7"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S1","S4","S5","S7","S8"]},{"term":"성장률","easyText":"얼마나 늘거나 줄었는지 나타내는 비율","treatment":"explained","sourceIds":["S7"]},{"term":"영업이익률","easyText":"매출에서 영업이익이 차지하는 비율","treatment":"explained","sourceIds":["S8"]},{"term":"유통망","easyText":"제품을 여러 곳에 보내고 파는 연결망","treatment":"explained","sourceIds":["S9"]},{"term":"판매채널","easyText":"제품을 고객에게 파는 방법이나 장소","treatment":"explained","sourceIds":["S9"]},{"term":"생산 효율","easyText":"같은 자원으로 제품을 만드는 정도","treatment":"explained","sourceIds":["S9"]},{"term":"고환율 효과","easyText":"외국 돈의 가치 변화가 사업에 미치는 영향","treatment":"explained","sourceIds":["S9"]},{"term":"수익성","easyText":"사업에서 이익을 낼 수 있는 정도","treatment":"explained","sourceIds":["S9"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      1::smallint
    ),
    (
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'sales_or_production',
      array['271560']::text[], '오리온은 국내산 햇감자 수확 시기에 감자스낵을 생산하고 생산능력을 늘리는 가운데, 지난해 6~11월 포카칩 매출이 2022년 같은 기간보다 36% 증가했고 글로벌 감자스낵 매출은 8740억원으로 전년 대비 약 10% 늘었다.',
      '오리온, 지난해 6~11월 포카칩 매출 36% 증가', '오리온, 지난해 6~11월 포카칩 매출 36% 증가',
      '2022년 같은 기간과 비교한 수치예요.', 'comparison_base',
      '지난해 글로벌 감자스낵 매출은 8740억원이에요.', 'global_sales_amount',
      '감자스낵 생산능력을 늘리고 있어요.', 'capacity_growth',
      'production_capacity',
      'event_education',
      '생산할 수 있는 양과 판매 규모는 회사 사업과 연결될 수 있어요.',
      '[{"term":"매출","easyText":"제품을 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S3","S8"]},{"term":"계약재배","easyText":"농가와 미리 약속해 농작물을 기르는 방식","treatment":"explained","sourceIds":["S5"]},{"term":"조달","easyText":"필요한 감자를 마련하는 일","treatment":"explained","sourceIds":["S5"]},{"term":"전년 대비","easyText":"지난해 같은 기간과 비교한 변화","treatment":"explained","sourceIds":["S8"]},{"term":"생산능력","easyText":"제품을 만들 수 있는 최대 규모","treatment":"explained","sourceIds":["S10"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      1::smallint
    ),
    (
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'earnings',
      array['004370']::text[], '농심은 2분기 연결 매출 9561억원과 영업이익 593억원을 기록했다고 공시했다.',
      '농심, 2분기 매출 9561억원·영업이익 593억원', '농심, 2분기 매출 9561억원·영업이익 593억원',
      '매출은 지난해 같은 기간보다 10.2% 늘었어요.', 'revenue_growth',
      '영업이익은 47.6% 늘었어요.', 'profit_growth',
      '해외사업 매출 비중은 40.2%로 높아졌어요.', 'overseas_sales_share',
      'business_performance',
      'event_education',
      '매출과 영업이익은 회사의 사업 성과를 보여주는 숫자예요.',
      '[{"term":"해외법인","easyText":"다른 나라에서 사업하는 회사","treatment":"explained","sourceIds":["S3"]},{"term":"국내 소비 둔화","easyText":"한국에서 물건을 사는 흐름이 느려지는 것","treatment":"explained","sourceIds":["S3"]},{"term":"원가 부담","easyText":"제품을 만드는 데 드는 돈이 커진 상태","treatment":"explained","sourceIds":["S3"]},{"term":"상쇄","easyText":"한쪽의 줄어든 부분을 다른 쪽이 메우는 것","treatment":"explained","sourceIds":["S3"]},{"term":"연결 기준","easyText":"본사와 다른 회사의 결과를 합쳐 계산하는 방법","treatment":"explained","sourceIds":["S4"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S4","S7"]},{"term":"지난해 같은 기간","easyText":"작년의 똑같은 시기","treatment":"explained","sourceIds":["S4"]},{"term":"공시","easyText":"회사의 중요한 내용을 공개하는 일","treatment":"explained","sourceIds":["S4"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S5"]},{"term":"국내 생산법인","easyText":"한국에서 제품을 만드는 회사","treatment":"explained","sourceIds":["S7"]},{"term":"수출","easyText":"우리나라 물건을 다른 나라에 파는 일","treatment":"explained","sourceIds":["S7"]},{"term":"해외사업 매출 비중","easyText":"해외 사업에서 번 돈이 전체 판매액에서 차지하는 몫","treatment":"explained","sourceIds":["S7"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      2::smallint
    ),
    (
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'binding_contract',
      array['096770']::text[], 'SK이노베이션이 테라파워와 나트륨 SMR 사업 협력 주요 조건 합의서를 체결했으며, 합의서에는 미국 케머러 1호기와 후속 상용 프로젝트 참여 확대가 포함됐다.',
      'SK이노베이션, 테라파워와 나트륨 SMR 협력 합의서 체결', 'SK이노베이션, 테라파워와 나트륨 SMR 협력 합의서 체결',
      '14일 서울에서 두 대표가 만났어요.', 'meeting_date_place',
      'SK와 SK이노베이션은 총 2억5000만달러를 공동 투자했어요.', 'joint_investment_total',
      '케머러 1호기와 후속 상용 프로젝트 참여를 확대할 계획이에요.', 'project_participation_plan',
      'contracted_business',
      'event_education',
      '사업 협력 합의는 회사의 사업 참여와 계약에 연결될 수 있어요.',
      '[{"term":"소형모듈원자로(SMR)","easyText":"원자력으로 전기를 만드는 작은 발전 시설","treatment":"explained","sourceIds":["S3"]},{"term":"SMR","easyText":"소형모듈원자로를 줄여 부르는 말","treatment":"explained","sourceIds":["S3","S4","S6","S7"]},{"term":"나트륨 SMR","easyText":"나트륨을 활용하는 작은 원자력 발전 시설","treatment":"explained","sourceIds":["S4","S6","S7"]},{"term":"사업협력 주요 조건 합의서","easyText":"사업을 함께하기로 정한 중요한 약속 문서","treatment":"explained","sourceIds":["S4"]},{"term":"최고경영자(CEO)","easyText":"회사의 일을 가장 책임지는 사람","treatment":"explained","sourceIds":["S4"]},{"term":"공동 투자","easyText":"여러 곳이 돈을 함께 넣는 투자","treatment":"explained","sourceIds":["S5"]},{"term":"2대 주주","easyText":"회사 주식을 두 번째로 많이 가진 사람이나 회사","treatment":"explained","sourceIds":["S5"]},{"term":"실증로","easyText":"새 원자로 기술이 실제로 작동하는지 시험하는 시설","treatment":"explained","sourceIds":["S6"]},{"term":"상용 프로젝트","easyText":"제품이나 서비스를 실제로 팔기 위한 사업","treatment":"explained","sourceIds":["S6","S7"]},{"term":"공급망","easyText":"제품을 만들고 옮기는 데 필요한 회사와 과정","treatment":"explained","sourceIds":["S6"]},{"term":"글로벌 프로젝트 공동 발굴","easyText":"세계 여러 곳의 사업을 함께 찾아내는 일","treatment":"explained","sourceIds":["S6"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      1::smallint
    ),
    (
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'earnings',
      array['041510']::text[], '에스엠이 2026년 2분기 연결 기준 매출 3496억원과 영업이익 529억원을 기록했다.',
      '에스엠, 2026년 2분기 매출 3496억원 기록', '에스엠, 2026년 2분기 매출 3496억원 기록',
      '영업이익은 529억원이었어요.', 'operating_profit',
      '별도 매출은 9.2% 늘어 2406억원이에요.', 'separate_revenue',
      '고연차 아티스트의 투어가 확대됐어요.', 'tour_expansion',
      'business_performance',
      'event_education',
      '매출과 영업이익은 회사의 사업 흐름을 보여주는 숫자예요.',
      '[{"term":"연결 기준","easyText":"본사와 자회사의 결과를 합쳐 계산하는 방식","treatment":"explained","sourceIds":["S4"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S4","S5","S8"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 빼고 남은 금액","treatment":"explained","sourceIds":["S4"]},{"term":"별도 매출","easyText":"자회사와 합치지 않고 따로 계산한 판매 금액","treatment":"explained","sourceIds":["S5"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교한 수치","treatment":"explained","sourceIds":["S5"]},{"term":"출연 매출","easyText":"출연 활동으로 받은 금액","treatment":"explained","sourceIds":["S5"]},{"term":"콘서트 매출","easyText":"콘서트를 열어 번 금액","treatment":"explained","sourceIds":["S5","S8"]},{"term":"MD·라이선싱 매출","easyText":"상품 판매와 사용 허가로 번 금액","treatment":"explained","sourceIds":["S5"]},{"term":"고연차 아티스트","easyText":"활동 경력이 오래된 가수나 연예인","treatment":"explained","sourceIds":["S8"]},{"term":"투어","easyText":"여러 지역을 돌며 공연하는 일정","treatment":"explained","sourceIds":["S8"]},{"term":"성장세","easyText":"사업 규모가 커지는 흐름","treatment":"explained","sourceIds":["S5"]},{"term":"성장을 견인","easyText":"성장 흐름을 이끌었다는 뜻","treatment":"explained","sourceIds":["S8"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      2::smallint
    ),
    (
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'sales_or_production',
      array['035900']::text[], 'JYP는 중국에서 뻔푸소년CIIU의 첫 번째 미니 앨범을 다음달 4일 발매한다고 밝혔다.',
      'JYP Ent., 뻔푸소년CIIU 중국 첫 미니 앨범 8월 4일 발매', 'JYP Ent., 뻔푸소년CIIU 중국 첫 미니 앨범 8월 4일 발매',
      '7월 14일 음원과 뮤직비디오를 선공개했어요.', 'pre_release_media',
      '타이틀곡은 ''Closer''예요.', 'title_track_name',
      '뻔푸소년CIIU는 글로벌 보이그룹이에요.', 'group_description',
      'business_performance',
      'event_education',
      '앨범 발매는 음악을 팔아 얻는 돈과 연결될 수 있어요.',
      '[{"term":"JYP Ent.","easyText":"뻔푸소년CIIU 앨범을 내는 회사 이름","treatment":"explained","sourceIds":["S1"]},{"term":"글로벌 보이그룹","easyText":"여러 나라에서 활동하는 남자 가수 그룹","treatment":"explained","sourceIds":["S1"]},{"term":"발매","easyText":"노래나 앨범을 사람들에게 내놓는 일","treatment":"explained","sourceIds":["S1"]},{"term":"미니 앨범","easyText":"노래를 몇 곡 담은 작은 앨범","treatment":"explained","sourceIds":["S1","S2"]},{"term":"타이틀곡","easyText":"앨범을 대표하는 노래","treatment":"explained","sourceIds":["S2"]},{"term":"컴백","easyText":"새 노래로 다시 활동하는 일","treatment":"explained","sourceIds":["S2"]},{"term":"수록곡","easyText":"앨범 안에 들어 있는 노래","treatment":"explained","sourceIds":["S5"]},{"term":"음원","easyText":"기기에서 들을 수 있는 노래 파일","treatment":"explained","sourceIds":["S5"]},{"term":"뮤직비디오","easyText":"노래에 맞춰 만든 영상","treatment":"explained","sourceIds":["S5"]},{"term":"선공개","easyText":"정식 발표 전에 먼저 공개하는 일","treatment":"explained","sourceIds":["S5"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      2::smallint
    ),
    (
      'f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'earnings',
      array['122870']::text[], '와이지엔터테인먼트는 2분기 연결 기준 매출 1277억 원과 영업이익 110억 원을 공시했고, 두 수치가 지난해 같은 기간보다 각각 27.2%와 31.2% 증가했다.',
      '와이지엔터테인먼트, 2분기 매출·영업이익 모두 증가', '와이지엔터테인먼트, 2분기 매출·영업이익 모두 증가',
      '매출은 1277억 원이었어요.', 'revenue_amount',
      '영업이익은 110억 원이었어요.', 'operating_profit_amount',
      'YG 측은 굿즈 판매가 잘됐다고 설명했어요.', 'merchandise_sales',
      'business_performance',
      'event_education',
      '사업으로 번 돈과 비용을 뺀 뒤 남은 돈은 회사의 사업 성과와 연결돼요.',
      '[{"term":"연결 기준","easyText":"본사와 다른 회사의 결과를 합쳐 계산하는 방식","treatment":"explained","sourceIds":["S1"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S1"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S1","S2"]},{"term":"공시","easyText":"회사의 중요한 내용을 공식적으로 알리는 일","treatment":"explained","sourceIds":["S1"]},{"term":"신보","easyText":"가수가 새로 내놓은 음악 앨범","treatment":"explained","sourceIds":["S3"]},{"term":"발매","easyText":"음악이나 상품을 새로 내놓는 일","treatment":"explained","sourceIds":["S3"]},{"term":"MD(굿즈)","easyText":"가수와 관련해 파는 기념 상품","treatment":"explained","sourceIds":["S3"]},{"term":"판매 호조","easyText":"상품이 잘 팔리는 상황","treatment":"explained","sourceIds":["S3"]},{"term":"디지털 콘텐츠","easyText":"인터넷이나 기기로 보는 영상·음악 자료","treatment":"explained","sourceIds":["S3"]},{"term":"수요 확대","easyText":"사고 싶어 하는 사람이 늘어나는 일","treatment":"explained","sourceIds":["S3"]},{"term":"실적 개선","easyText":"회사의 사업 결과가 더 좋아지는 것","treatment":"explained","sourceIds":["S3"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      2::smallint
    ),
    (
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'earnings',
      array['021240']::text[], '코웨이는 올해 2분기 연결 매출액 1조4422억원과 영업이익 2532억원을 기록했고, 두 항목 모두 분기 기준 역대 최대였다.',
      '코웨이, 2분기 연결 매출액·영업이익 분기 기준 역대 최대', '코웨이, 2분기 연결 매출액·영업이익 분기 기준 역대 최대',
      '연결 매출액은 1조4422억원이었어요.', 'revenue_amount',
      '영업이익은 2532억원이었어요.', 'operating_profit_amount',
      '영업이익률은 전년 동기보다 1.7%포인트 낮아졌어요.', 'margin_change',
      'business_performance',
      'event_education',
      '이번 실적은 코웨이의 매출과 영업이익을 보여줘 사업 성과와 연결돼요.',
      '[{"term":"연결 매출액","easyText":"여러 회사의 매출을 합한 금액","treatment":"explained","sourceIds":["S4"]},{"term":"매출액","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S4","S7","S9"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 얻은 전체 금액","treatment":"explained","sourceIds":["S5"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S4","S5","S6","S10"]},{"term":"영업이익률","easyText":"사업으로 번 이익이 매출에서 차지하는 비율","treatment":"explained","sourceIds":["S6"]},{"term":"전년 동기","easyText":"지난해 같은 기간","treatment":"explained","sourceIds":["S6"]},{"term":"포인트(P)","easyText":"퍼센트 차이를 나타내는 단위","treatment":"explained","sourceIds":["S6"]},{"term":"포천맑은물 사업 중단","easyText":"포천맑은물 사업을 그만둔 일","treatment":"explained","sourceIds":["S6"]},{"term":"렌털 판매량","easyText":"빌려 쓰는 방식으로 팔린 제품 수","treatment":"explained","sourceIds":["S8"]},{"term":"렌털 계정","easyText":"제품을 빌려 쓰는 계약의 수","treatment":"explained","sourceIds":["S8"]},{"term":"BEREX","easyText":"코웨이의 제품 이름으로 쓰인 말","treatment":"explained","sourceIds":["S8"]},{"term":"판매 호조","easyText":"제품이 잘 팔리는 상태","treatment":"explained","sourceIds":["S8","S9"]},{"term":"신규 카테고리 출시","easyText":"새로운 종류의 제품을 내놓는 일","treatment":"explained","sourceIds":["S9"]},{"term":"영업조직 확대","easyText":"판매를 맡는 조직을 더 크게 만드는 일","treatment":"explained","sourceIds":["S10"]},{"term":"방문판매","easyText":"판매원이 고객을 직접 찾아가는 방식","treatment":"explained","sourceIds":["S10"]},{"term":"시판","easyText":"제품을 일반 소비자에게 파는 일","treatment":"explained","sourceIds":["S10"]},{"term":"실적 개선","easyText":"사업 결과가 전보다 나아지는 일","treatment":"explained","sourceIds":["S10"]},{"term":"관세 환급","easyText":"관세로 낸 돈을 돌려받는 일","treatment":"explained","sourceIds":["S10"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      2::smallint
    ),
    (
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'earnings',
      array['402340']::text[], 'SK스퀘어가 2분기 연결 기준 영업이익 19조2354억원을 기록했으며, 전년 동기 대비 1273.8% 증가했다.',
      'SK스퀘어, 2분기 연결 기준 영업이익 19조2354억원 기록', 'SK스퀘어, 2분기 연결 기준 영업이익 19조2354억원 기록',
      '전년 동기 대비 1273.8% 급증했어요.', 'profit_growth_rate',
      '당기순이익은 18조6750억원이에요.', 'net_income_amount',
      '상반기 누적 영업이익은 27조5137억원이에요.', 'cumulative_operating_profit',
      'business_performance',
      'event_education',
      '이익 수치는 회사 사업에서 돈이 얼마나 남았는지 보여줘 사업 성과와 연결돼요.',
      '[{"term":"지분","easyText":"회사 전체 주식 중에서 가진 몫","treatment":"explained","sourceIds":["S2"]},{"term":"최대 주주","easyText":"회사 주식을 가장 많이 가진 사람이나 기관","treatment":"explained","sourceIds":["S2"]},{"term":"실적","easyText":"회사가 일정 기간 거둔 사업 결과","treatment":"explained","sourceIds":["S2","S6"]},{"term":"연결 기준","easyText":"본사와 함께 운영하는 회사를 합쳐 계산하는 방법","treatment":"explained","sourceIds":["S3"]},{"term":"영업이익","easyText":"주로 하는 사업에서 번 돈에서 비용을 뺀 금액","treatment":"explained","sourceIds":["S3","S5"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교한 것","treatment":"explained","sourceIds":["S3"]},{"term":"당기순이익","easyText":"모든 비용을 뺀 뒤 최종적으로 남은 이익","treatment":"explained","sourceIds":["S4"]},{"term":"누적 영업이익","easyText":"기간 동안 차곡차곡 모인 주된 사업의 이익","treatment":"explained","sourceIds":["S5"]},{"term":"누적 순이익","easyText":"기간 동안 차곡차곡 모인 최종 이익","treatment":"explained","sourceIds":["S5"]},{"term":"AI","easyText":"사람처럼 배우고 판단하는 컴퓨터 기술","treatment":"explained","sourceIds":["S6"]},{"term":"반도체 포트폴리오","easyText":"회사가 가진 여러 반도체 사업의 묶음","treatment":"explained","sourceIds":["S6"]},{"term":"주주 환원","easyText":"회사의 이익을 주식을 가진 사람에게 돌려주는 일","treatment":"explained","sourceIds":["S6"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      2::smallint
    ),
    (
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'material_operational_risk',
      array['005380']::text[], '현대차 노조의 파업으로 4만대가 넘는 생산 차질이 발생한 가운데, 현대차와 노조는 18일 오후 2시 본교섭을 재개하기로 했다.',
      '현대차 노동조합, 18일 오후 2시 본교섭 재개하기로', '현대차 노동조합, 18일 오후 2시 본교섭 재개하기로',
      '올해 파업으로 4만대 넘는 생산 차질이 났어요.', 'production_disruption',
      '노조는 18일까지 매일 4∼6시간 파업해요.', 'strike_schedule',
      '하반기 신차 출시를 통한 실적 반등이 필요해요.', 'h2_rebound_need',
      'operational_continuity',
      'event_education',
      '생산 차질은 차량을 만들고 팔 수 있는 수와 연결될 수 있어요.',
      '[{"term":"파업","easyText":"일하는 사람들이 요구를 알리려고 일을 멈추는 행동","treatment":"explained","sourceIds":["S3","S4","S6"]},{"term":"파업 수위","easyText":"파업을 얼마나 오래 또는 강하게 할지의 정도","treatment":"explained","sourceIds":["S3"]},{"term":"노동조합","easyText":"일하는 사람들이 권리를 지키려고 만든 모임","treatment":"explained","sourceIds":["S3"]},{"term":"사측","easyText":"회사를 운영하는 쪽","treatment":"explained","sourceIds":["S3"]},{"term":"교섭","easyText":"회사와 노동자가 조건을 의논하는 일","treatment":"explained","sourceIds":["S3","S4"]},{"term":"본교섭","easyText":"회사와 노동자가 공식적으로 하는 협상","treatment":"explained","sourceIds":["S3"]},{"term":"생산 차질","easyText":"제품을 계획대로 만들지 못하는 상황","treatment":"explained","sourceIds":["S4"]},{"term":"하반기","easyText":"한 해의 뒤쪽 절반","treatment":"explained","sourceIds":["S4"]},{"term":"신차 출시","easyText":"새 자동차를 시장에 내놓는 일","treatment":"explained","sourceIds":["S4"]},{"term":"실적 반등","easyText":"사업 결과가 다시 좋아지는 것","treatment":"explained","sourceIds":["S4"]},{"term":"노조","easyText":"일하는 사람들이 함께 만든 모임","treatment":"explained","sourceIds":["S6"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      2::smallint
    ),
    (
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'merger_or_ownership',
      array['089860']::text[], '호텔롯데와 부산롯데호텔이 보유한 롯데렌탈 지분 61.17%를 미국계 사모펀드 TPG에 매각했다.',
      '롯데렌탈, 호텔롯데·부산롯데호텔 보유 지분 61.17%를 TPG에 매각', '롯데렌탈, 호텔롯데·부산롯데호텔 보유 지분 61.17%를 TPG에 매각',
      '롯데렌탈은 국내 렌터카 1위 업체예요.', 'rental_car_rank',
      'TPG는 인수 대금 전액을 자체 펀드로 조달할 것으로 알려졌어요.', 'acquisition_funding',
      'TPG는 미국계 사모펀드예요.', 'buyer_type',
      'ownership_and_credit',
      'event_education',
      '지분 매각은 회사의 소유 구조와 중요한 결정 방식에 연결될 수 있어요.',
      '[{"term":"렌터카","easyText":"차를 빌려주는 서비스","treatment":"explained","sourceIds":["S2"]},{"term":"사모펀드","easyText":"몇몇 사람의 돈을 모아 회사에 투자하는 곳","treatment":"explained","sourceIds":["S2"]},{"term":"PEF","easyText":"사모펀드를 영어로 줄여 부르는 말","treatment":"explained","sourceIds":["S2"]},{"term":"TPG","easyText":"롯데렌탈의 몫을 산 미국계 투자 회사","treatment":"explained","sourceIds":["S2","S4","S5"]},{"term":"투자은행","easyText":"회사의 큰 거래와 돈 마련을 돕는 회사","treatment":"explained","sourceIds":["S4"]},{"term":"IB","easyText":"투자은행을 영어로 줄여 부르는 말","treatment":"explained","sourceIds":["S4"]},{"term":"지분","easyText":"회사의 전체 주식 중 누군가가 가진 몫","treatment":"explained","sourceIds":["S4"]},{"term":"매각","easyText":"가지고 있던 것을 다른 곳에 파는 일","treatment":"explained","sourceIds":["S4"]},{"term":"인수 대금","easyText":"지분을 사면서 내는 돈","treatment":"explained","sourceIds":["S5"]},{"term":"펀드","easyText":"투자에 쓰려고 모아 둔 돈","treatment":"explained","sourceIds":["S5"]},{"term":"조달","easyText":"필요한 돈을 마련하는 일","treatment":"explained","sourceIds":["S5"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      1::smallint
    ),
    (
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'material_operational_risk',
      array['329180']::text[], 'HD현대중공업 노동조합이 임금·단체협약 교섭 난항으로 중앙노동위원회에 노동 쟁의 조정을 신청했고, 25일부터 27일까지 파업 찬반 투표를 진행할 예정이다.',
      'HD현대중공업 노조, 중앙노동위원회에 노동 쟁의 조정 신청', 'HD현대중공업 노조, 중앙노동위원회에 노동 쟁의 조정 신청',
      '노동 쟁의 조정 신청일은 14일이에요.', 'application_date',
      '25~27일 파업 찬반 투표가 예정됐어요.', 'strike_vote_dates',
      '6월 상견례 뒤 15차례 교섭했지만 의견 차이를 못 좁혔어요.', 'negotiation_count',
      'operational_continuity',
      'event_education',
      '파업 여부는 회사 운영의 지속성과 연결될 수 있어요.',
      '[{"term":"노동조합","easyText":"일하는 사람들이 근무 조건을 함께 의논하는 모임","treatment":"explained","sourceIds":["S2"]},{"term":"임금·단체협약","easyText":"월급과 일터 규칙을 함께 정한 약속","treatment":"explained","sourceIds":["S2"]},{"term":"교섭","easyText":"회사와 일하는 사람들이 조건을 의논하는 일","treatment":"explained","sourceIds":["S2","S6"]},{"term":"중앙노동위원회","easyText":"일터에서 생긴 다툼을 다루는 기관","treatment":"explained","sourceIds":["S3","S4"]},{"term":"노동 쟁의 조정","easyText":"일터 다툼을 풀 방법을 찾는 절차","treatment":"explained","sourceIds":["S3"]},{"term":"조정 중지","easyText":"다툼을 풀려는 절차를 멈추는 결정","treatment":"explained","sourceIds":["S4"]},{"term":"노사","easyText":"회사와 일하는 사람들","treatment":"explained","sourceIds":["S4","S6"]},{"term":"파업 찬반 투표","easyText":"파업을 할지 말지 묻는 투표","treatment":"explained","sourceIds":["S4","S5"]},{"term":"과반 찬성","easyText":"절반보다 많은 사람이 찬성하는 것","treatment":"explained","sourceIds":["S4"]},{"term":"합법적인 파업권","easyText":"법에 맞게 일을 멈출 수 있는 권리","treatment":"explained","sourceIds":["S4"]},{"term":"조합원","easyText":"일하는 사람들 모임에 가입한 사람","treatment":"explained","sourceIds":["S5"]},{"term":"상견례","easyText":"교섭을 시작하며 서로 인사하는 자리","treatment":"explained","sourceIds":["S6"]},{"term":"기본급","easyText":"월급의 기본이 되는 금액","treatment":"explained","sourceIds":["S7"]},{"term":"상여금","easyText":"월급과 따로 받는 보너스","treatment":"explained","sourceIds":["S7"]},{"term":"요구안","easyText":"상대에게 이루어 달라고 내놓은 내용","treatment":"explained","sourceIds":["S7"]},{"term":"영업이익","easyText":"사업으로 번 돈에서 운영 비용을 뺀 금액","treatment":"explained","sourceIds":["S8"]},{"term":"성과 공유","easyText":"일의 결과로 얻은 것을 함께 나누는 것","treatment":"explained","sourceIds":["S8"]},{"term":"통상임금 산입","easyText":"평소 받는 임금에 어떤 돈을 넣어 계산하는 것","treatment":"explained","sourceIds":["S8"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      1::smallint
    ),
    (
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'regulatory_decision',
      array['042660']::text[], '미국 대통령이 13일(현지 시간) 외국 조선소에서 군함을 2척까지 건조하는 방안을 조건부로 허용하는 각서에 서명했다. 한화오션과 한화시스템 컨소시엄은 2024년 미국 필라델피아 필리조선소 지분 100%를 인수했고, 기사에서는 한화가 이 조건에 부합한다고 전했다.',
      '한화오션·한화시스템, 미국 군함 건조 조건에 부합', '한화오션·한화시스템, 미국 군함 건조 조건에 부합',
      '조건을 지키면 외국 조선소에서 군함 2척까지 지을 수 있어요.', 'warship_build_limit',
      '한화오션·한화시스템은 필리조선소 지분 100%를 인수했어요.', 'shipyard_stake_acquired',
      '이후 모든 선박을 만들고 고칠 때 미국 내 공급망을 써야 해요.', 'us_supply_chain',
      'regulatory_permission',
      'event_education',
      '미국 군함 건조 허용 조건은 한화오션의 미국 조선소 생산 활동과 연결될 수 있어요.',
      '[{"term":"조선소","easyText":"배를 만들고 고치는 곳","treatment":"explained","sourceIds":["S4","S6","S7","S8","S9"]},{"term":"군함","easyText":"나라의 군대가 쓰는 배","treatment":"explained","sourceIds":["S4"]},{"term":"건조","easyText":"배를 새로 만드는 일","treatment":"explained","sourceIds":["S4","S9"]},{"term":"조건부로 허용","easyText":"정해진 조건을 지키면 할 수 있게 함","treatment":"explained","sourceIds":["S4"]},{"term":"각서","easyText":"약속이나 계획을 적은 문서","treatment":"explained","sourceIds":["S6"]},{"term":"조선산업 기반 재건","easyText":"배 만드는 산업의 바탕을 다시 세우는 일","treatment":"explained","sourceIds":["S6"]},{"term":"소유권","easyText":"무언가를 가질 수 있는 권리","treatment":"explained","sourceIds":["S6"]},{"term":"과반 지분","easyText":"회사 주식의 절반보다 많은 몫","treatment":"explained","sourceIds":["S6"]},{"term":"외국 조선업체","easyText":"다른 나라에서 배를 만드는 회사","treatment":"explained","sourceIds":["S6"]},{"term":"인수","easyText":"다른 회사나 재산을 넘겨받는 일","treatment":"explained","sourceIds":["S7","S8"]},{"term":"컨소시엄","easyText":"여러 회사가 함께 만든 모임","treatment":"explained","sourceIds":["S8"]},{"term":"지분","easyText":"회사 전체에서 가진 주식의 몫","treatment":"explained","sourceIds":["S6","S8"]},{"term":"유지·보수","easyText":"고장 없이 쓰도록 관리하고 고치는 일","treatment":"explained","sourceIds":["S9"]},{"term":"공급망","easyText":"제품을 만들고 옮기는 데 이어진 회사와 과정","treatment":"explained","sourceIds":["S9"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      1::smallint
    ),
    (
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'merger_or_ownership',
      array['003490', '020560']::text[], '대한항공 이사회와 아시아나항공 임시 주주총회가 두 회사의 합병 관련 안건을 각각 가결했다.',
      '대한항공·아시아나항공, 합병 관련 안건 각각 통과', '대한항공·아시아나항공, 합병 관련 안건 각각 통과',
      '통합 법인은 12월 17일 공식 출범할 예정이에요.', 'launch_date',
      '통합 대한항공은 연 매출 23조 원 이상이에요.', 'annual_revenue',
      '아시아나항공 노선을 조인트벤처 판매망에 넣을 계획이에요.', 'route_network_plan',
      'business_combination',
      'event_education',
      '합병은 두 회사의 운영 방식과 규모를 바꾸는 일이라 회사 주식 가격과 관련될 수 있어요.',
      '[{"term":"합병","easyText":"두 회사가 하나로 합쳐지는 일","treatment":"explained","sourceIds":["S4","S6","S7"]},{"term":"인수 결정","easyText":"다른 회사를 사들이기로 정한 일","treatment":"explained","sourceIds":["S4"]},{"term":"행정 절차","easyText":"공식 일을 처리하는 과정","treatment":"explained","sourceIds":["S4"]},{"term":"통합 법인","easyText":"두 회사가 합쳐져 새로 만든 회사","treatment":"explained","sourceIds":["S4"]},{"term":"합병 절차","easyText":"두 회사가 하나가 되기까지의 과정","treatment":"explained","sourceIds":["S4"]},{"term":"존속법인","easyText":"합병 뒤에도 계속 남는 회사","treatment":"explained","sourceIds":["S6"]},{"term":"이사회","easyText":"회사의 중요한 일을 결정하는 모임","treatment":"explained","sourceIds":["S6"]},{"term":"합병 승인의 건","easyText":"합병을 허락할지 정하는 안건","treatment":"explained","sourceIds":["S6"]},{"term":"가결","easyText":"회의에서 안건이 통과되는 일","treatment":"explained","sourceIds":["S6"]},{"term":"주주총회","easyText":"주식을 가진 사람들이 중요한 일을 정하는 회의","treatment":"explained","sourceIds":["S7"]},{"term":"합병계약 체결 승인의 건","easyText":"합병 계약을 맺는 일을 허락할지 정하는 안건","treatment":"explained","sourceIds":["S7"]},{"term":"매출","easyText":"물건이나 서비스를 팔아 번 전체 금액","treatment":"explained","sourceIds":["S8"]},{"term":"임직원","easyText":"회사에서 일하는 모든 사람","treatment":"explained","sourceIds":["S8"]},{"term":"조인트벤처(JV)","easyText":"두 회사가 함께 운영하는 사업","treatment":"explained","sourceIds":["S10"]},{"term":"판매망","easyText":"제품을 파는 곳들이 연결된 체계","treatment":"explained","sourceIds":["S10"]},{"term":"미주 노선","easyText":"미주 지역을 오가는 비행기 길","treatment":"explained","sourceIds":["S10"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      1::smallint
    ),
    (
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'merger_or_ownership',
      array['180640']::text[], '한진그룹 공익법인이 한진칼 지분을 사들이고 이명희 고문이 일부를 매각한 뒤, 한진칼이 공시한 조원태 회장 등 특수관계자 지분은 31.15%로 6280주(0.01%) 늘었다.',
      '한진칼, 특수관계자 지분 31.15%로 늘어', '한진칼, 특수관계자 지분 31.15%로 늘어',
      '특수관계자 지분은 2079만6274주예요.', 'stake_shares',
      '한진그룹 공익법인이 한진칼 지분을 샀어요.', 'foundation_purchase',
      '이명희 고문은 일부 지분을 매각했어요.', 'advisor_sale',
      'ownership_and_credit',
      'event_education',
      '지분을 가진 사람이나 단체의 변화는 회사의 중요한 결정과 연결될 수 있어요.',
      '[{"term":"지분","easyText":"회사에서 차지하는 몫","treatment":"explained","sourceIds":["S3","S4","S6","S9"]},{"term":"매각","easyText":"가지고 있던 몫을 파는 일","treatment":"explained","sourceIds":["S3","S4"]},{"term":"공익법인","easyText":"좋은 일을 위해 만든 단체","treatment":"explained","sourceIds":["S3"]},{"term":"지주사","easyText":"다른 회사의 몫을 가진 회사","treatment":"explained","sourceIds":["S3"]},{"term":"특수관계자","easyText":"회사와 특별한 관계인 사람","treatment":"explained","sourceIds":["S6"]},{"term":"공시","easyText":"회사 정보를 공식적으로 알리는 일","treatment":"explained","sourceIds":["S6"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      2::smallint
    ),
    (
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'earnings',
      array['278470', '483650']::text[], '에이피알과 달바글로벌이 분기 기준 역대 최대 실적을 기록했다.',
      '에이피알·달바글로벌, 분기 기준 역대 최대 실적 기록', '에이피알·달바글로벌, 분기 기준 역대 최대 실적 기록',
      '에이피알 매출액은 7675억 원이에요.', 'apr_revenue',
      '에이피알 영업이익은 1906억 원이에요.', 'apr_operating_profit',
      '달바글로벌 영업이익은 472억 원이에요.', 'dalba_operating_profit',
      'business_performance',
      'event_education',
      '매출액과 영업이익은 회사의 사업 성과와 연결될 수 있어요.',
      '[{"term":"매출액","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S8","S9","S10"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S8","S10"]},{"term":"분기 기준","easyText":"한 해를 나눈 기간을 기준으로 보는 것","treatment":"explained","sourceIds":["S8","S10"]},{"term":"실적","easyText":"회사가 일정 기간 동안 거둔 결과","treatment":"explained","sourceIds":["S10"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      1::smallint
    ),
    (
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'earnings',
      array['483650']::text[], '달바글로벌의 2분기 연결 기준 영업이익은 472억 4100만원으로 전년 동기 대비 61.6% 증가했다.',
      '달바글로벌, 2분기 영업이익 61.6% 증가', '달바글로벌, 2분기 영업이익 61.6% 증가',
      '영업이익은 472억 4100만원이에요.', 'operating_profit_amount',
      '매출은 1868억 6100만 원으로 45.6% 늘었어요.', 'revenue_amount',
      '해외 매출은 1415억 원으로 74% 늘었어요.', 'overseas_revenue',
      'business_performance',
      'event_education',
      '매출과 영업이익의 증가는 회사의 사업 성과와 연결돼요.',
      '[{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 전체 금액","treatment":"explained","sourceIds":["S3","S5","S9"]},{"term":"영업이익","easyText":"본업으로 번 돈에서 사업 비용을 뺀 금액","treatment":"explained","sourceIds":["S3","S4"]},{"term":"금융감독원 전자공시시스템(DART)","easyText":"회사의 중요한 정보를 인터넷에 공개하는 곳","treatment":"explained","sourceIds":["S4"]},{"term":"DART","easyText":"회사의 중요한 정보를 인터넷에 공개하는 곳","treatment":"explained","sourceIds":["S4"]},{"term":"연결 기준","easyText":"본사와 함께 운영하는 회사들을 합쳐 계산하는 방법","treatment":"explained","sourceIds":["S4"]},{"term":"전년 동기 대비","easyText":"지난해 같은 기간과 비교해서","treatment":"explained","sourceIds":["S4"]},{"term":"공시","easyText":"회사가 중요한 정보를 공식적으로 알리는 일","treatment":"explained","sourceIds":["S4"]},{"term":"당기순이익","easyText":"회사가 번 돈에서 모든 비용을 뺀 뒤 남은 돈","treatment":"explained","sourceIds":["S5"]},{"term":"실적","easyText":"회사가 일정 기간에 거둔 사업 결과","treatment":"explained","sourceIds":["S9"]},{"term":"해외 매출","easyText":"다른 나라에서 제품을 팔아 얻은 돈","treatment":"explained","sourceIds":["S9"]},{"term":"전년 동기보다","easyText":"지난해 같은 기간보다","treatment":"explained","sourceIds":["S9"]},{"term":"화이트 트러플","easyText":"흰 송로버섯을 뜻하는 말","treatment":"explained","sourceIds":["S10"]},{"term":"핵심 원료","easyText":"제품을 만드는 데 중요한 재료","treatment":"explained","sourceIds":["S10"]},{"term":"프리미엄 비건 스킨케어","easyText":"동물성 재료를 쓰지 않는 고급 피부 관리 제품","treatment":"explained","sourceIds":["S10"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      1::smallint
    ),
    (
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'earnings',
      array['051900']::text[], 'LG생활건강은 2분기 연결 매출 1조6574억원과 영업이익 1028억원을 기록했고, 화장품 부문은 영업이익 444억원으로 흑자전환했으며 북미 법인도 분기 흑자를 냈다.',
      'LG생활건강, 2분기 영업이익 87.5% 증가', 'LG생활건강, 2분기 영업이익 87.5% 증가',
      '2분기 연결 매출은 1조6574억원이에요.', 'revenue_amount',
      '화장품 부문 영업이익은 444억원으로 흑자전환했어요.', 'cosmetics_profit_turnaround',
      '북미 법인도 분기 흑자를 냈어요.', 'north_america_profit',
      'business_performance',
      'event_education',
      '매출과 영업이익은 회사의 사업 성과와 연결돼요.',
      '[{"term":"연결 매출","easyText":"회사와 관련 회사의 판매 금액을 합한 것","treatment":"explained","sourceIds":["S6"]},{"term":"매출","easyText":"제품이나 서비스를 팔아 받은 돈","treatment":"explained","sourceIds":["S6","S7","S8"]},{"term":"영업이익","easyText":"사업에 쓴 돈을 빼고 남은 돈","treatment":"explained","sourceIds":["S6","S7"]},{"term":"시장 전망치","easyText":"시장이 미리 예상한 실적 숫자","treatment":"explained","sourceIds":["S6"]},{"term":"사업부문","easyText":"회사의 여러 사업 분야","treatment":"explained","sourceIds":["S7"]},{"term":"적자","easyText":"번 돈보다 쓴 돈이 더 많은 상태","treatment":"explained","sourceIds":["S7"]},{"term":"흑자","easyText":"쓴 돈보다 번 돈이 더 많은 상태","treatment":"explained","sourceIds":["S7","S8"]},{"term":"흑자전환","easyText":"손해 보던 상태에서 돈이 남는 상태로 바뀌는 것","treatment":"explained","sourceIds":["S7"]},{"term":"마케팅비","easyText":"제품을 알리고 팔려고 쓰는 돈","treatment":"explained","sourceIds":["S8"]},{"term":"법인","easyText":"회사가 세운 별도의 사업 회사","treatment":"explained","sourceIds":["S8"]},{"term":"자체 브랜드 비중","easyText":"직접 만든 이름의 제품이 차지하는 비율","treatment":"explained","sourceIds":["S8"]}]'::jsonb,
      true, true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      true, true,
      2::smallint
    )
) as publication(
  source_key, event_type, stock_codes, focus_statement, headline, home_summary,
  summary_line_1, summary_line_1_fact_key,
  summary_line_2, summary_line_2_fact_key,
  summary_line_3, summary_line_3_fact_key,
  price_connection_kind, price_connection_basis,
  price_connection_text, term_treatments,
  allowed_scope, primary_subject, direct_materiality, source_fidelity,
  focus_alignment, concise_three_line_summary, no_irrelevant_detail,
  attribution_and_timing, all_terms_easy, same_headline_across_surfaces,
  distinct_summary_facts, price_connection_grounded,
  term_explanation_coverage, investment_safety,
  no_sentiment_label, editor_attempts
) on publication.source_key = article.source_key
on conflict (article_id) do nothing;

insert into public.news_citations (
  publication_id, article_id, output_field, source_unit_id
)
select publication.id, publication.article_id,
  citation.output_field, citation.source_unit_id
from public.news_publications as publication
join public.news_articles as article on article.id = publication.article_id
join (
  values
    ('bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'headline', 'S3'),
    ('bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'home_summary', 'S3'),
    ('bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'summary_line_1', 'S3'),
    ('bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'summary_line_2', 'S4'),
    ('bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'summary_line_3', 'S6'),
    ('bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55', 'price_connection', 'S3'),
    ('2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'headline', 'S4'),
    ('2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'home_summary', 'S4'),
    ('2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'summary_line_1', 'S5'),
    ('2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'summary_line_2', 'S7'),
    ('2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'summary_line_3', 'S9'),
    ('2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'price_connection', 'S4'),
    ('2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74', 'price_connection', 'S5'),
    ('89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'headline', 'S3'),
    ('89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'home_summary', 'S3'),
    ('89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'summary_line_1', 'S4'),
    ('89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'summary_line_2', 'S5'),
    ('89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'summary_line_3', 'S7'),
    ('89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'price_connection', 'S3'),
    ('89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a', 'price_connection', 'S5'),
    ('970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'headline', 'S5'),
    ('970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'headline', 'S6'),
    ('970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'home_summary', 'S5'),
    ('970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'home_summary', 'S6'),
    ('970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'summary_line_1', 'S6'),
    ('970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'summary_line_2', 'S7'),
    ('970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'summary_line_3', 'S6'),
    ('970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'price_connection', 'S6'),
    ('970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f', 'price_connection', 'S7'),
    ('63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'headline', 'S1'),
    ('63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'home_summary', 'S1'),
    ('63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'summary_line_1', 'S1'),
    ('63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'summary_line_1', 'S2'),
    ('63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'summary_line_2', 'S4'),
    ('63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'summary_line_3', 'S5'),
    ('63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef', 'price_connection', 'S1'),
    ('c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'headline', 'S3'),
    ('c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'home_summary', 'S3'),
    ('c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'summary_line_1', 'S3'),
    ('c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'summary_line_2', 'S8'),
    ('c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'summary_line_3', 'S10'),
    ('c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'price_connection', 'S3'),
    ('c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18', 'price_connection', 'S10'),
    ('a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'headline', 'S4'),
    ('a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'headline', 'S5'),
    ('a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'home_summary', 'S4'),
    ('a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'home_summary', 'S5'),
    ('a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'summary_line_1', 'S4'),
    ('a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'summary_line_2', 'S5'),
    ('a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'summary_line_3', 'S7'),
    ('a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'price_connection', 'S4'),
    ('a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e', 'price_connection', 'S5'),
    ('7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'headline', 'S4'),
    ('7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'home_summary', 'S4'),
    ('7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'summary_line_1', 'S4'),
    ('7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'summary_line_2', 'S5'),
    ('7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'summary_line_3', 'S6'),
    ('7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'summary_line_3', 'S7'),
    ('7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'price_connection', 'S4'),
    ('7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502', 'price_connection', 'S6'),
    ('56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'headline', 'S4'),
    ('56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'home_summary', 'S4'),
    ('56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'summary_line_1', 'S4'),
    ('56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'summary_line_2', 'S5'),
    ('56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'summary_line_3', 'S8'),
    ('56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19', 'price_connection', 'S4'),
    ('b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'headline', 'S1'),
    ('b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'headline', 'S2'),
    ('b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'home_summary', 'S1'),
    ('b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'home_summary', 'S2'),
    ('b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'summary_line_1', 'S5'),
    ('b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'summary_line_2', 'S2'),
    ('b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'summary_line_3', 'S1'),
    ('b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'price_connection', 'S1'),
    ('b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af', 'price_connection', 'S2'),
    ('f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'headline', 'S1'),
    ('f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'headline', 'S2'),
    ('f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'home_summary', 'S1'),
    ('f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'home_summary', 'S2'),
    ('f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'summary_line_1', 'S1'),
    ('f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'summary_line_2', 'S1'),
    ('f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'summary_line_3', 'S3'),
    ('f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'price_connection', 'S1'),
    ('f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c', 'price_connection', 'S2'),
    ('0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'headline', 'S4'),
    ('0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'headline', 'S5'),
    ('0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'home_summary', 'S4'),
    ('0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'home_summary', 'S5'),
    ('0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'summary_line_1', 'S4'),
    ('0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'summary_line_2', 'S4'),
    ('0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'summary_line_3', 'S6'),
    ('0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'price_connection', 'S4'),
    ('0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698', 'price_connection', 'S5'),
    ('f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'headline', 'S3'),
    ('f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'home_summary', 'S3'),
    ('f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'summary_line_1', 'S3'),
    ('f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'summary_line_2', 'S4'),
    ('f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'summary_line_3', 'S5'),
    ('f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'price_connection', 'S3'),
    ('f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712', 'price_connection', 'S4'),
    ('d349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'headline', 'S3'),
    ('d349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'home_summary', 'S3'),
    ('d349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'summary_line_1', 'S4'),
    ('d349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'summary_line_2', 'S6'),
    ('d349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'summary_line_3', 'S4'),
    ('d349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0', 'price_connection', 'S4'),
    ('58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'headline', 'S4'),
    ('58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'home_summary', 'S4'),
    ('58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'summary_line_1', 'S2'),
    ('58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'summary_line_2', 'S5'),
    ('58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'summary_line_3', 'S2'),
    ('58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7', 'price_connection', 'S4'),
    ('c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'headline', 'S3'),
    ('c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'home_summary', 'S3'),
    ('c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'summary_line_1', 'S3'),
    ('c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'summary_line_2', 'S5'),
    ('c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'summary_line_3', 'S6'),
    ('c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'price_connection', 'S3'),
    ('c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61', 'price_connection', 'S5'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'headline', 'S4'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'headline', 'S6'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'headline', 'S7'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'headline', 'S8'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'home_summary', 'S4'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'home_summary', 'S6'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'home_summary', 'S7'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'home_summary', 'S8'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'summary_line_1', 'S4'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'summary_line_2', 'S7'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'summary_line_2', 'S8'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'summary_line_3', 'S9'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'price_connection', 'S4'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'price_connection', 'S6'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'price_connection', 'S8'),
    ('7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8', 'price_connection', 'S9'),
    ('7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'headline', 'S6'),
    ('7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'headline', 'S7'),
    ('7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'home_summary', 'S6'),
    ('7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'home_summary', 'S7'),
    ('7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'summary_line_1', 'S4'),
    ('7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'summary_line_2', 'S8'),
    ('7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'summary_line_3', 'S10'),
    ('7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'price_connection', 'S4'),
    ('7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'price_connection', 'S6'),
    ('7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c', 'price_connection', 'S7'),
    ('0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'headline', 'S6'),
    ('0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'home_summary', 'S6'),
    ('0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'summary_line_1', 'S6'),
    ('0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'summary_line_2', 'S3'),
    ('0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'summary_line_3', 'S4'),
    ('0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'price_connection', 'S3'),
    ('0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'price_connection', 'S4'),
    ('0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684', 'price_connection', 'S6'),
    ('e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'headline', 'S8'),
    ('e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'headline', 'S10'),
    ('e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'home_summary', 'S8'),
    ('e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'home_summary', 'S10'),
    ('e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'summary_line_1', 'S8'),
    ('e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'summary_line_2', 'S8'),
    ('e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'summary_line_3', 'S10'),
    ('e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'price_connection', 'S8'),
    ('e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d', 'price_connection', 'S10'),
    ('55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'headline', 'S4'),
    ('55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'home_summary', 'S4'),
    ('55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'summary_line_1', 'S4'),
    ('55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'summary_line_2', 'S5'),
    ('55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'summary_line_3', 'S9'),
    ('55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'price_connection', 'S4'),
    ('55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa', 'price_connection', 'S5'),
    ('ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'headline', 'S6'),
    ('ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'home_summary', 'S6'),
    ('ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'summary_line_1', 'S6'),
    ('ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'summary_line_2', 'S7'),
    ('ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'summary_line_3', 'S8'),
    ('ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'price_connection', 'S6'),
    ('ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc', 'price_connection', 'S7')
) as citation(source_key, output_field, source_unit_id)
  on citation.source_key = article.source_key
where not exists (
  select 1 from public.news_citations as existing
  where existing.publication_id = publication.id
    and existing.output_field = citation.output_field
    and existing.source_unit_id = citation.source_unit_id
)
on conflict (publication_id, output_field, source_unit_id) do nothing;

update public.news_publications
set status = 'ready_for_storage', updated_at = now()
where status = 'draft'
  and article_id in (
    select id from public.news_articles
    where source_key in (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55',
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74',
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a',
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f',
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef',
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18',
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e',
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502',
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19',
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af',
      'f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c',
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698',
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712',
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0',
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7',
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61',
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8',
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c',
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684',
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d',
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa',
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc'
    )
  );

update public.news_publications
set status = 'published', published_at = now(), updated_at = now()
where status = 'ready_for_storage'
  and article_id in (
    select id from public.news_articles
    where source_key in (
      'bf8f40dac088f5f8626b81a30d16bef43561957c47bbf78e55391949a210ed55',
      '2930e0612ac47f6372400bfb30edda54fe456028d50e8c548a2676e9963cad74',
      '89da34ca44ad1f955de66d6246b13d942dd6326420c4b7a6041a1c66620e898a',
      '970a4ff9e84242c8c0b747518200044b751f2437674fd9448e5f1a7c3e3b802f',
      '63d2ddbfb56bc3f5fca0187d690b60ec651b080bd9969d6e59b80087833bfaef',
      'c1abe4b4493a8913f48407dfc71a395d85b33dfa74dd693e5fc254b2ce29dc18',
      'a4906fed474ec7e5188832333ff3bdce55bc757bd98077832719b53d8bf6286e',
      '7d6b052612cb53dfe9628142a1e2cda201f7f842c4e024a7956794207df82502',
      '56535c32feb94ba5926ecf49883583be8cdef3631e0f595d7775bb2f4b089f19',
      'b06f325f0d45801169f4b8a5026c2a3aaf549246f6abb716cb2256fc292061af',
      'f07fad529420a5f8ca739e2a3230f03c17f1a62f0c55b2122e37da8ff531f45c',
      '0d88599a28e3dc2228021f5b93c4bd755244b92fc24ed9b35986adbd48c3d698',
      'f34c92e0e0146b5e16caca19d0ad344e8cf08f68b6443fe0dbc68d27d6020712',
      'd349f19333a66d17a57a08acedb42aa475ba32ecf28310b4ca8d9b3293a09de0',
      '58065e81bc80ead1adcf889b15cd08e3313b8438741c65f6d6b3f4a5e0b418b7',
      'c191de6f96e37c60aa9816f049c61b8917abfe11aa13337330eae0a075a80a61',
      '7598cf410304597d5257fb618f64e09f3b73da1fe6684e7caaed33932c229ce8',
      '7545f183c20184044f25b054cc0592b8bebeb3bc06fed8f76577da1f38368c1c',
      '0e19f8ddb0090b81958c62575ec9b31feba20cd9bfb9dc0d46829a28aab6c684',
      'e8f444ab82ccfbf2266d6275adac08c4e3fa713e9d47617f963bf1719bf2a19d',
      '55da6dbcf0b24e1ccbb768ada156ddd37cab096065c2865ab9c0bef5f78e52aa',
      'ac97a75ff6da8e8cb527db3723029eeea65a262aa9310e67cbaf9a025ece4adc'
    )
  );

commit;
