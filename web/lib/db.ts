// Node 24 내장 node:sqlite. 의존성 0개.
// ponytail: 파일 SQLite라 Vercel 서버리스에서는 FS가 휘발한다.
//   로컬·단일 서버 시연용. 배포 시 Turso(libSQL)로 교체 — SQL은 그대로 간다.

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import type { Proposal } from './types'

const file =
  process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'kda.db')

function open(): DatabaseSync {
  mkdirSync(path.dirname(file), { recursive: true })
  const database = new DatabaseSync(file)
  database.exec(`
    create table if not exists child (
      id           text primary key,
      nickname     text not null,
      invite_code  text unique,
      linked_at    text
    );

    create table if not exists proposal (
      id            integer primary key autoincrement,
      child_id      text not null,
      kind          text not null,
      stock_code    text not null,
      label         text not null,
      text          text not null,
      coach_answer  text,
      hold_months   integer not null,
      target_amount integer not null,
      status        text not null default 'pending',
      created_at    text not null,
      expires_at    text not null
    );

    create table if not exists response (
      proposal_id  integer primary key references proposal(id),
      approved     integer not null,
      reason       text not null,
      responded_at text not null
    );

    create table if not exists execution (
      proposal_id  integer primary key references proposal(id),
      order_no     text not null,
      filled_price integer not null,
      filled_qty   integer not null,
      executed_at  text not null
    );
  `)
  return database
}

// next dev의 HMR이 모듈을 다시 평가해도 커넥션이 하나만 남게 한다
const g = globalThis as { __kdaDb?: DatabaseSync }
export const db: DatabaseSync = (g.__kdaDb ??= open())

type Row = Record<string, unknown>

/** snake_case 행 → 공유 타입. 라우트가 컬럼명을 직접 만지지 않게 한다 */
export function toProposal(r: Row): Proposal {
  return {
    id: Number(r.id),
    childId: String(r.child_id),
    kind: r.kind as Proposal['kind'],
    stockCode: String(r.stock_code),
    label: r.label as Proposal['label'],
    text: String(r.text),
    coachAnswer: r.coach_answer == null ? null : String(r.coach_answer),
    holdMonths: Number(r.hold_months),
    targetAmount: Number(r.target_amount),
    status: r.status as Proposal['status'],
    createdAt: String(r.created_at),
    expiresAt: String(r.expires_at),
  }
}

/** 만료 시각이 지난 pending 제안서를 일괄 정리. 조회 직전에 호출한다 */
export function sweepExpired(now = new Date()): void {
  db.prepare(
    `update proposal set status = 'expired'
       where status = 'pending' and expires_at <= ?`,
  ).run(now.toISOString())
}
