# 마이그레이션 운영 규칙

## 파일 순서

| 파일 | 내용 |
|---|---|
| `20260813000000_create_app_base.sql` | 앱 베이스 스키마 — `profiles`·`stocks`·`account`·`transactions`·`holdings`·`stock_tab_views`·`stock_candles`·`trade_likes`·`trade_comments`, `apply_trade` RPC, `set_updated_at` 트리거, 인덱스·제약·RLS 정책, 유니버스 51종 참조 데이터 |
| `20260813100750_create_news_storage.sql` 외 news 계열 4건 | 어린이 뉴스 저장·검수 스키마. `news_article_stocks` 가 `stocks` 를 참조하므로 베이스보다 뒤에 온다 |
| `20260814052538_stock_tab_views_per_stock_category_count.sql` | `stock_tab_views` 를 종목별 카운트로 개편 |
| `20260814150827_add_trade_plan_fields.sql` | `transactions` 에 `plan_code`·`plan_target_price`·`memo`·`plan_match`·`plan_changed_reason` 추가, `apply_trade` 인자 확장 (F2 SPEC §7.1) |
| `20260814190000_add_profiles_guardian_role.sql` | `profiles.guardian_role`·`updated_at` 추가 |

베이스 파일은 **뒤의 ALTER 2건이 아직 적용되지 않은 모양**이다. 즉 `stock_tab_views` 에는
`duration_seconds`·`opened_at`·`closed_at` 만 있고 `stock_id`·`created_at` 은 없으며,
`profiles` 에는 `guardian_role`·`updated_at` 이 없다. `profiles_set_updated_at` 트리거는
`updated_at` 컬럼보다 먼저 있었던 라이브 순서 그대로 베이스에 둔다. 베이스를 고칠 때는
뒤의 ALTER 가 같은 변경을 두 번 적용하지 않는지 항상 함께 확인한다.

## 배포 순서 — 코드보다 마이그레이션이 먼저다

`20260814150827_add_trade_plan_fields.sql` 은 되가져오기가 아니라 **새 스키마**다.
`GET /api/family`·`GET /api/trades`·`GET /api/profile/season-cards` 가 새 컬럼을 `select` 에
넣으므로, 마이그레이션 없이 코드만 올라가면 PostgREST 가 다음처럼 거절하고 세 경로가 모두 502 가 된다.

```
Supabase HTTP 400: {"code":"42703","message":"column transactions.plan_code does not exist"}
```

**적용 완료 — 2026-08-14, 라이브(hero-kiwoom).** 컬럼 5개·제약 4개가 들어갔고 `apply_trade` 는
11인자로 바뀌었다. 기존 거래 15행은 그대로이고 새 컬럼만 `null` 이다. 함수 소유자와 실행 권한
(`anon`·`authenticated`·`service_role`)은 재생성 전후가 같다.

새 마이그레이션을 앞으로 올릴 때는 **머지 전에 또는 머지와 함께** 적용한다.

```bash
supabase db push        # 아직 적용되지 않은 마이그레이션만 올린다
supabase migration list # local·remote 양쪽에 같은 목록이 보이는지 확인
```

`repair` 는 이미 라이브에 있는 스키마의 이력만 맞추는 명령이라 새 스키마에는 쓰지 않는다.

파일 이름의 타임스탬프는 **라이브에 기록된 버전과 같아야 한다.** 다르면 다음 `db push` 가 이미
적용된 마이그레이션을 다시 올리려다 `already exists` 로 깨진다. 적용 후 `migration list` 로
확인하고 어긋나면 파일 이름을 기록된 버전으로 고친다.

## 라이브 이력과 저장소가 어긋나 있다 [사실]

2026-08-14 기준 `supabase migration list` 의 remote 쪽에는 저장소에 파일이 없는 항목이 8건 있다.
초기 개발 때 대시보드·MCP 로 직접 적용한 것들이고, 그 결과 스키마는 베이스 파일 안에 이미 들어 있다.

```
20260812141324 create_stock_tab_views
20260813065022 convert_profile_ids_uuid_to_bigint_v2
20260813065140 fix_stock_candles_rls_and_function_search_path
20260813065333 remove_user_number_columns
20260813071202 split_holdings_from_account
20260813071229 apply_trade_function
20260813071759 transactions_confidence_nullable
20260813090228 drop_trade_confidence
```

반대로 저장소에만 있고 remote 에 없는 것, 그리고 이름이 어긋난 것이 있다.

| 저장소 파일 | remote 기록 | 필요한 조치 |
|---|---|---|
| `20260813000000_create_app_base.sql` | 없음 | `supabase migration repair --status applied 20260813000000` — SQL 은 실행하지 않는다 |
| `20260814190000_add_profiles_guardian_role.sql` | `20260814111455 add_profiles_guardian_role` | 같은 변경인데 타임스탬프가 다르다. 파일 이름을 `20260814111455_...` 로 고치거나 `repair` 로 맞춘다 |
| `20260814150827_add_trade_plan_fields.sql` | `20260814150827 add_trade_plan_fields` | 일치. 조치 없음 |

정리하기 전에는 `supabase db push` 를 그대로 돌리지 않는다. 위 두 건을 다시 실행하려다 깨진다.

## 라이브(hero-kiwoom)에는 적용하지 않는다 — 베이스 파일 한정

베이스 파일은 이미 라이브에 존재하는 스키마를 저장소로 되가져온 것이다. 라이브에 다시 실행하면
`already exists` 로 깨진다. 라이브에는 **SQL 을 실행하지 말고 이력만 등록한다.**

```bash
supabase init                      # 저장소에 config.toml 이 없을 때만
supabase link --project-ref <ref>  # .env 의 SUPABASE_URL 에 있는 ref
supabase migration list            # local 에만 있고 remote 에 없는 항목 확인

# 베이스 파일을 "적용됨"으로만 표시한다. SQL 은 실행되지 않는다.
supabase migration repair --status applied 20260813000000
supabase migration list            # local·remote 양쪽에 표시되는지 다시 확인
```

news 계열과 ALTER 2건은 이미 `supabase_migrations.schema_migrations` 에 있으므로 건드리지 않는다.
`repair` 대상이 베이스 한 건인지 `migration list` 로 먼저 확인하고 실행한다.

## 새 환경 검증

```bash
supabase db reset   # 마이그레이션 8건 + seed.sql 이 순서대로 성공해야 한다
```

Docker 를 쓸 수 없는 환경이면 빈 PostgreSQL 에 직접 넣어 확인한다. `supabase db reset` 이
깔아 주는 것 중 이 저장소 마이그레이션이 쓰는 것은 `anon`·`authenticated`·`service_role` 롤,
`public` 스키마 기본 권한, `auth.users`·`auth.uid()` 뿐이다.

```sql
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
```

이 뒤에 `migrations/*.sql` 을 파일명 순서로, 마지막에 `../seed.sql` 을 실행한다.

## 알아 둘 것

- `stocks` 51행은 스키마가 아니라 참조 데이터지만 베이스에 넣었다. 이 표가 비면 `apply_trade`,
  `holdings`, `stock_candles`, `news_article_stocks` 가 붙을 곳이 없고 `seed.sql` 의 뉴스 주체
  연결이 끊겨 `NEWS_PUBLICATION_PRIMARY_SUBJECT_REQUIRED` 로 실패한다.
- `profiles` 행(가족 계정)과 `stock_candles` 행은 아직 저장소에 없다. 새 환경에서 로그인하려면
  계정을 직접 넣어야 하고, 캔들은 `web` 의 `npm run seed:candles` 로 채운다.
- 앱 서버는 서비스 키로 붙어 RLS 를 우회한다. RLS 정책은 anon·authenticated 열람 경계일 뿐
  현재 화면 동작의 근거가 아니다.
