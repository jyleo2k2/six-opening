import assert from "node:assert/strict";
import test from "node:test";
import { availableProviders, activeLimits, hasQuoteCredentials, providerOrder } from "./index";

// 실키가 있는 환경에서도 네트워크를 타지 않는다. dotenv 는 이미 있는 값을 덮지 않으므로
// 자리표시자(`your_`)로 미리 채워 두면 이후 로드가 이 값을 유지한다.
const PLACEHOLDER = {
  KIWOOM_APP_KEY: "your_key",
  KIWOOM_SECRET_KEY: "your_secret",
  TOSS_CLIENT_ID: "your_client_id",
  TOSS_CLIENT_SECRET: "your_client_secret",
} as const;
Object.assign(process.env, PLACEHOLDER);

function withEnv(values: Record<string, string>, run: () => void) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, values);
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("QUOTE_PROVIDER decides which provider is tried first", () => {
  withEnv({ QUOTE_PROVIDER: "toss", QUOTE_PROVIDER_FALLBACK: "kiwoom" }, () => {
    assert.deepEqual(
      providerOrder().map((provider) => provider.id),
      ["toss", "kiwoom"],
    );
  });

  withEnv({ QUOTE_PROVIDER: "kiwoom", QUOTE_PROVIDER_FALLBACK: "toss" }, () => {
    assert.deepEqual(
      providerOrder().map((provider) => provider.id),
      ["kiwoom", "toss"],
    );
  });
});

test("an unknown or empty QUOTE_PROVIDER still reaches every provider", () => {
  // 오타 하나로 키가 있는 제공자를 두고 픽스처로 떨어지면 안 된다.
  withEnv({ QUOTE_PROVIDER: "tos", QUOTE_PROVIDER_FALLBACK: "" }, () => {
    assert.deepEqual(
      providerOrder().map((provider) => provider.id),
      ["toss", "kiwoom"],
    );
  });
});

test("placeholder keys count as missing credentials", () => {
  assert.deepEqual(availableProviders(), []);
  assert.equal(hasQuoteCredentials(), false);
});

test("filled keys expose that provider and its request budget", () => {
  withEnv(
    {
      QUOTE_PROVIDER: "toss",
      TOSS_CLIENT_ID: "id-1234",
      TOSS_CLIENT_SECRET: "secret-1234",
    },
    () => {
      assert.deepEqual(
        availableProviders().map((provider) => provider.id),
        ["toss"],
      );
      assert.equal(hasQuoteCredentials(), true);
      // 키움의 초당 1건 우회로를 물려받으면 제공자를 바꾼 의미가 없다.
      assert.ok(activeLimits().requestIntervalMs < 2600);
      assert.ok(activeLimits().refreshBatchSize > 1);
    },
  );
});

test("the conservative budget applies when no provider has keys", () => {
  assert.equal(activeLimits().requestIntervalMs, 2600);
  assert.equal(activeLimits().refreshBatchSize, 1);
});
