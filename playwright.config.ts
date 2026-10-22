import { defineConfig, devices } from "@playwright/test";

// 브라우저 E2E. 기본은 로컬 프로덕션 서버(3456)이고, E2E_BASE_URL로 다른 주소를 볼 수 있다.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3456";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  },
  // 서버가 이미 떠 있으면 그대로 쓰고, 없을 때(CI·새 체크아웃)만 빌드해서 띄운다. 외부 주소를 볼 때는 서버를 띄우지 않는다.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run build && npm run start -- -p 3456", url: baseURL, reuseExistingServer: true, timeout: 180_000 },
  projects: [
    // 브라우저는 내려받지 않고 설치된 Google Chrome을 쓴다
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    {
      name: "mobile-chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
    },
  ],
});
