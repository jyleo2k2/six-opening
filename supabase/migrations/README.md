# 마이그레이션 운영 규칙

## 파일 순서

| 파일 | 내용 |
|---|---|
| `20260813000000_create_app_base.sql` | 앱 베이스 스키마 — `profiles`·`stocks`·`account`·`transactions`·`holdings`·`stock_tab_views`·`stock_candles`·`trade_likes`·`trade_comments`, `apply_trade` RPC, `set_updated_at` 트리거, 인덱스·제약·RLS 정책, 유니버스 51종 참조 데이터 |
| `20260813100750_create_news_storage.sql` 외 news 계열 4건 | 어린이 뉴스 저장·검수 스키마. `news_article_stocks` 가 `stocks` 를 참조하므로 베이스보다 뒤에 온다 |
| `20260814052538_stock_tab_views_per_stock_category_count.sql` | `stock_tab_views` 를 종목별 카운트로 개편 |
| `20260814111455_add_profiles_guardian_role.sql` | `profiles.guardian_role`·`updated_at` 추가 |
| `20260814150827_add_trade_plan_fields.sql` | `transactions` 에 `plan_code`·`plan_target_price`·`memo`·`plan_match`·`plan_changed_reason` 추가, `apply_trade` 인자 확장 (F2 SPEC §7.1) |
| `20260815002039_seed_family_portfolios.sql` | 찬영 가족 3계정의 보유·매수 이력·잔액을 데모 포트폴리오로 교체. **계정(`profiles`+`account`)이 없으면 먼저 만든다** — 파일 순서상 `seed_family_profiles` 보다 앞이라(아래 "순서 문제" 참고) 직접 만들어야 한다 |
| `20260815033156_seed_family_profiles.sql` | 찬영 가족 3계정(`profiles`+`account`)을 저장소에서 재현 가능하게 함(위 파일과 같은 insert, `on conflict do nothing` 이라 중복 무해). 비밀번호는 자리표시자(`CHANGE_ME`) |
| `20260815033308_order_lifecycle_db_ownership.sql` | 주문 생애주기(체결·대기·예약·취소·거절)를 DB가 소유. `transactions`에 상태 컬럼, `account`·`holdings`에 예약 잠금 컬럼 추가. `apply_trade` 갱신, `reserve_order`·`settle_order`·`cancel_order` 신설 |
| `20260817062524_seed_family_feed_memos.sql` | 가족 피드에 읽을 것이 생기게 데모 계정의 `memo`·`plan_code`·댓글·좋아요를 채운다. **덮어쓰지 않는다** — `memo is null` 인 행만 `coalesce` 로 채우고 댓글·좋아요는 `not exists` 로 막아 두 번 돌려도 늘지 않는다. 라이브 거래 id 를 짚으므로 빈 DB 에서는 아무것도 하지 않는다 |
| `20260817070631_family_feed_portfolio_only.sql` | 피드를 데모 포트폴리오와 맞춘다. 찬영엄마의 문서 밖 삼성전자 거래·보유를 지우고 잔액을 되돌리며, 찬영아빠에게 오늘 자 매도·매수를 한 건씩 넣고, 남는 문서 종목 거래의 메모·계획을 채운다. **김찬영의 문서 밖 거래는 지우지 않는다** — 8/5~8/14 에 걸쳐 있어 지우면 지난 주차 성향 카드가 함께 바뀐다. 보유 0 이라 `/api/family` 의 보유 종목 필터가 이미 걸러낸다 |
| `20260817151422_rebuild_holdings_from_transactions.sql` | `rebuild_holdings(user_id)` 신설. 체결·미체결 거래에서 `holdings`(수량·평단·예약 잠긴 수량)와 `account`(잔액·잠긴 현금)를 통째로 다시 낸다. **거래내역을 손으로 고쳤을 때 부르는 도구다** — 아래 "거래내역을 직접 고쳤다면" 참고. 트리거는 걸지 않는다 |

이 표는 2026-08-15 이후 몇 건이 빠져 있다(`20260816013000`·`20260816150000`·`20260817000000`, 그리고 저장소에 파일이 없는 remote 기록 `20260817045325 reshape_child_weekly_behavior`). 각 작업 세션이 자기 것만 채워 넣는다.

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

## 라이브 이력 정리 — 2026-08-15 기준 [사실]

저장소 파일 11개가 모두 라이브 `supabase_migrations.schema_migrations` 의 같은 버전과 1:1 로
맞는다. `supabase db push` 는 이제 올릴 것이 없다.

정리하면서 한 일은 다음과 같다.

| 무엇 | 조치 |
|---|---|
| `20260813000000_create_app_base.sql` 이 remote 에 없었다 | 이력만 등록했다(`repair --status applied` 와 같은 결과). **SQL 은 실행하지 않았다** — 그 스키마는 이미 라이브에 있다 |
| `add_profiles_guardian_role` 의 타임스탬프가 저장소 `20260814190000`, remote `20260814111455` 로 달랐다 | 저장소 파일 이름을 remote 기록인 `20260814111455_...` 로 바꿨다 |
| `add_trade_plan_fields` 가 저장소 `20260814210000`, remote `20260814150827` 로 달랐다 | 저장소 파일 이름을 `20260814150827_...` 로 바꿨다 |
| `seed_family_portfolios` 가 저장소 `20260815120000`, remote `20260815002039` 로 달랐다 | 저장소 파일 이름을 `20260815002039_...` 로 바꿨다 |
| `seed_family_profiles`·`order_lifecycle_db_ownership` 을 MCP 로 처음 적용 — 저장소는 `20260815001000`·`20260815131000` 로 만들었지만 remote 는 적용 시각인 `20260815033156`·`20260815033308` 로 기록했다 | 저장소 파일 이름을 remote 기록에 맞춰 바꿨다 |

**파일 이름의 타임스탬프는 remote 기록과 같아야 한다.** 다르면 다음 `db push` 가 이미 적용된
마이그레이션을 다시 올리려다 `already exists` 로 깨진다. 같은 어긋남이 네 번 반복됐다 — 대시보드나
MCP 로 적용하면 그때의 UTC 시각으로 기록되므로 **적용 직후 `supabase migration list` 로 확인하고
파일 이름을 맞추는 것**을 절차에 넣는다.

### 순서 문제 — `seed_family_profiles` 가 `seed_family_portfolios` 보다 뒤로 밀렸다 [사실, 해소]

파일을 만들 때는 프로필 시딩이 포트폴리오 시딩보다 먼저 오게 지었지만(계정이 있어야 보유를
넣을 수 있으므로), remote 적용 시각 기준으로 파일명을 맞추다 보니 실제 순서가 바뀌었다:
`seed_family_portfolios`(`002039`) → `seed_family_profiles`(`033156`). 라이브에는 계정이
이미 있었으니 문제가 없었지만, 새 환경에서 `db reset` 을 돌리면 포트폴리오 시딩이 먼저 실행돼
계정이 없어 건너뛰고, 그 다음에야 계정이 생겨서 포트폴리오 데이터는 결국 아무 데도 들어가지
않는 문제가 있었다.

파일 순서(=remote 기록)는 바꿀 수 없으므로, **`seed_family_portfolios` 자신이 세 계정을
먼저 만들도록** 고쳤다. `seed_family_profiles` 와 같은 `insert ... on conflict (id) do
nothing` 을 앞에 추가해 계정이 없으면 만들고 있으면 그대로 둔다. 라이브에는 이미 계정이
있으니 이 부분은 no-op — 라이브 재실행 없이 로컬 파일만 바뀐 것과 같다. 뒤이어 도는
`seed_family_profiles` 는 같은 insert 를 다시 시도하지만 `on conflict do nothing` 이라
문제없다.

## 새 환경에서 도는지가 판단 기준이다

마이그레이션은 라이브 한 곳이 아니라 **빈 DB 에서도** 순서대로 성공해야 한다. 라이브에만 있는
데이터(계정 등)를 전제로 쓰면 `supabase db reset` 이 깨진다. 실제로
`seed_family_portfolios` 가 `profiles` 1·2·3 을 전제해 `holdings_user_id_fkey` 로 실패했고,
계정이 없으면 통째로 건너뛰도록 고쳤다. 데이터 보정 마이그레이션은 **고칠 대상이 없을 때 조용히
아무것도 하지 않아야 한다.**

### 저장소에 파일이 없는 remote 기록 8건은 그대로 둔다

초기 개발 때 대시보드·MCP 로 직접 적용한 것들이다. 그 결과 스키마는 베이스 파일 안에 이미
들어 있으므로 파일을 새로 만들지 않는다. `db push` 는 remote 에만 있는 기록을 건드리지 않으니
그대로 두면 된다. `migration list` 에 local 이 빈 줄로 보이는 것은 정상이다.

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

### 베이스 파일은 앞으로도 라이브에 실행하지 않는다

라이브에 이미 있는 스키마를 저장소로 되가져온 파일이라 다시 실행하면 `already exists` 로 깨진다.
새 환경에서만 실행된다. 이력이 다시 어긋나면 SQL 없이 등록만 한다.

```bash
supabase init                      # 저장소에 config.toml 이 없을 때만
supabase link --project-ref <ref>  # .env 의 SUPABASE_URL 에 있는 ref
supabase migration repair --status applied 20260813000000
supabase migration list            # local·remote 양쪽에 표시되는지 확인
```

## 새 환경 검증

```bash
supabase db reset   # 마이그레이션 11건 + seed.sql 이 순서대로 성공해야 한다
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

## 거래내역을 직접 고쳤다면 `rebuild_holdings` 를 부른다

`transactions` 와 `holdings` 는 서로를 모르는 별개의 표다. 둘을 잇는 트리거도 뷰도 없고,
`holdings` 를 쓰는 것은 `apply_trade`·`reserve_order`·`settle_order`·`cancel_order` 네 함수뿐이다.

그래서 **대시보드나 SQL 로 `transactions` 만 고치면 차트는 즉시 바뀌고 홈은 옛 값 그대로다.**
차트의 Buy/Sell 핀은 `GET /api/trades` 로 `transactions` 를 화면 열 때마다 새로 읽지만, 홈의
`내 보유 종목` 은 `GET /api/account` 로 `holdings` 를 읽기 때문이다. 고친 뒤에 부른다.

```sql
select rebuild_holdings(1);   -- 김찬영
```

체결 거래를 시간순으로 접어 수량·평단을 다시 내고(매수는 가중평균, 매도는 평단 유지),
미체결 주문에서 예약 잠긴 수량·현금을 복원하고, `balance` 를 `10,000,000 − 매수 + 매도` 로
다시 낸다. 남은 수량이 0 이면 그 종목 행은 지운다. 없는 계정을 부르면 `rebuilt: false` 만
돌려주고 아무것도 하지 않는다.

**앱으로 넣은 주문에는 부를 필요가 없다.** 위 네 함수가 이미 두 표를 같이 움직인다 —
라이브 세 계정에 그냥 돌려 보면 12개 보유가 한 칸도 바뀌지 않는다(멱등). 그 성질이 곧
안전 검증이므로, 이 함수를 고칠 때는 **먼저 지금 데이터에 돌려 아무것도 안 바뀌는지** 본다.

자동 재계산 트리거는 일부러 두지 않았다. 앱 주문 경로에서는 순수한 덤이고, 예약이 수량과
현금을 잠그는 도중에 끼어들면 순서가 꼬인다.

## 알아 둘 것

- `stocks` 51행은 스키마가 아니라 참조 데이터지만 베이스에 넣었다. 이 표가 비면 `apply_trade`,
  `holdings`, `stock_candles`, `news_article_stocks` 가 붙을 곳이 없고 `seed.sql` 의 뉴스 주체
  연결이 끊겨 `NEWS_PUBLICATION_PRIMARY_SUBJECT_REQUIRED` 로 실패한다.
- `profiles` 행(가족 계정)은 `20260815033156_seed_family_profiles.sql` 이 넣지만 비밀번호는
  자리표시자 `CHANGE_ME` 다. 새 환경에서 로그인하려면 콘솔에서 실제 비밀번호로 바꿔야 한다.
  `stock_candles` 행은 아직 저장소에 없다. `web` 의 `npm run seed:candles` 로 채운다.
- 앱 서버는 서비스 키로 붙어 RLS 를 우회한다. RLS 정책은 anon·authenticated 열람 경계일 뿐
  현재 화면 동작의 근거가 아니다.
