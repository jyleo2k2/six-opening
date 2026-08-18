export const SEASON_CARDS_TTL_MS = 3_000;

type CacheEntry = {
  userIds: number[];
  version: string;
  expiresAt: number;
  value: unknown;
};

type InFlightEntry = {
  userIds: number[];
  version: string;
  promise: Promise<unknown>;
};

const entries = new Map<string, CacheEntry>();
const inFlight = new Map<string, InFlightEntry>();
const versions = new Map<number, number>();

export function normalizeSeasonCardUserIds(userIds: number[]) {
  return [...new Set(userIds)].sort((left, right) => left - right);
}

function cacheKey(userIds: number[]) {
  return userIds.join(",");
}

function versionFor(userIds: number[]) {
  return userIds.map((userId) => `${userId}:${versions.get(userId) ?? 0}`).join("|");
}

function overlaps(left: number[], right: Set<number>) {
  return left.some((userId) => right.has(userId));
}

/**
 * 성향 계산 결과를 짧게 재사용하고, 같은 가족 집합의 동시 계산은 하나로 합친다.
 * `clock`은 테스트에서 TTL을 검증할 수 있도록 주입할 수 있다.
 */
export function getSeasonCardsCached<T>(
  userIds: number[],
  loader: () => Promise<T>,
  clock: () => number = Date.now,
): Promise<T> {
  const now = clock();
  const normalizedIds = normalizeSeasonCardUserIds(userIds);
  const key = cacheKey(normalizedIds);
  const version = versionFor(normalizedIds);
  const cached = entries.get(key);
  if (cached && cached.version === version && cached.expiresAt > now) {
    return Promise.resolve(cached.value as T);
  }

  const current = inFlight.get(key);
  if (current && current.version === version) return current.promise as Promise<T>;

  let promise: Promise<T>;
  promise = Promise.resolve()
    .then(loader)
    .then((value) => {
      if (versionFor(normalizedIds) === version) {
        entries.set(key, {
          userIds: normalizedIds,
          version,
          expiresAt: clock() + SEASON_CARDS_TTL_MS,
          value,
        });
      }
      return value;
    })
    .finally(() => {
      if (inFlight.get(key)?.promise === promise) inFlight.delete(key);
    });
  inFlight.set(key, { userIds: normalizedIds, version, promise });
  return promise;
}

/** 변경된 사용자가 포함된 가족 캐시를 폐기한다. */
export function invalidateSeasonCards(userIds: number[]) {
  const changedIds = new Set(normalizeSeasonCardUserIds(userIds));
  for (const userId of changedIds) {
    versions.set(userId, (versions.get(userId) ?? 0) + 1);
  }
  for (const [key, entry] of entries) {
    if (overlaps(entry.userIds, changedIds)) entries.delete(key);
  }
  for (const [key, entry] of inFlight) {
    if (overlaps(entry.userIds, changedIds)) inFlight.delete(key);
  }
}

/** 테스트 격리를 위한 메모리 캐시 초기화. */
export function clearSeasonCardsCache() {
  entries.clear();
  inFlight.clear();
  versions.clear();
}
