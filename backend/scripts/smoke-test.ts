import { randomUUID } from "node:crypto";

interface SmokeTestOptions {
  baseUrl?: string;
  password?: string;
}

const expectJson = async (baseUrl: string, path: string, init?: RequestInit) => {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => null);

  return {
    status: response.status,
    body
  };
};

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const runSmokeTest = async (options: SmokeTestOptions = {}): Promise<void> => {
  const baseUrl = options.baseUrl ?? process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
  const password = options.password ?? process.env.SMOKE_TEST_PASSWORD ?? "Change-This-Password-123!";
  const email = `smoke-${randomUUID()}@example.com`;

  const health = await expectJson(baseUrl, "/api/v1/health");
  assert(health.status === 200, `health failed: ${health.status}`);

  const ready = await expectJson(baseUrl, "/api/v1/health/ready");
  assert(ready.status === 200, `readiness failed: ${ready.status}`);

  const register = await expectJson(baseUrl, "/api/v1/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email,
      password,
      firstName: "Smoke",
      lastName: "Test"
    })
  });
  assert(register.status === 201, `register failed: ${register.status}`);

  const login = await expectJson(baseUrl, "/api/v1/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-device-type": "smoke"
    },
    body: JSON.stringify({
      email,
      password
    })
  });
  assert(login.status === 200, `login failed: ${login.status}`);

  const accessToken = login.body?.data?.tokenPair?.accessToken as string | undefined;
  assert(accessToken, "login did not return an accessToken");

  const me = await expectJson(baseUrl, "/api/v1/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  assert(me.status === 200, `me failed: ${me.status}`);
  assert(me.body?.data?.user?.email === email, "me did not return the expected user");

  const logout = await expectJson(baseUrl, "/api/v1/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  assert(logout.status === 200, `logout failed: ${logout.status}`);

  const meAfterLogout = await expectJson(baseUrl, "/api/v1/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  assert(meAfterLogout.status === 401, `me after logout should be 401, got ${meAfterLogout.status}`);
  assert(meAfterLogout.body?.error?.code === "AUTH_SESSION_EXPIRED", "me after logout returned the wrong error code");

  console.log(`Smoke test passed against ${baseUrl}`);
};

const main = async (): Promise<void> => {
  await runSmokeTest();
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

export { runSmokeTest };
