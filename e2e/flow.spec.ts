import { expect, test } from "@playwright/test";

// basePath 가 /lotto 이므로 모든 주소에 붙인다
const P = "/lotto";

test("홈 → 번호 만들기 → 결과 → 저장 → 내 번호", async ({ page }) => {
  await page.goto(`${P}/`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("조건을 골라");
  await expect(page.getByRole("heading", { name: /회 당첨번호/ })).toBeVisible();
  await page.getByRole("link", { name: "번호 만들기" }).first().click();
  await expect(page).toHaveURL(/\/lotto\/pick/);
  await page.getByRole("radio", { name: /^균형형 / }).click();
  await page.getByText("3게임", { exact: true }).click();
  await page.getByRole("button", { name: "번호 만들기" }).click();
  await expect(page).toHaveURL(/\/lotto\/pick\/result\?.*g=[0-9a-z]{15}/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("3게임");
  // 규칙 위반 경고가 없어야 한다
  await expect(page.locator(".callout.warn")).toHaveCount(0);
  // 조건값 표에 떨어진 규칙이 없다
  await expect(page.locator(".tag.no")).toHaveCount(0);
  await page.getByRole("button", { name: "이 기기에 저장" }).click();
  await expect(page.getByRole("button", { name: /회 번호로 저장했습니다/ })).toBeVisible();
  await page.goto(`${P}/my`);
  await expect(page.locator(".game")).toHaveCount(3);
  await expect(page.getByText("추첨 전")).toBeVisible();
  // 홈에 돌아오면 '내 번호' 블록이 위에 보인다
  await page.goto(`${P}/`);
  await expect(page.getByRole("region", { name: "내 번호 결과" })).toBeVisible();
});

test("내 번호형은 고정수를 반드시 넣는다", async ({ page }) => {
  await page.goto(`${P}/pick?t=mine&fix=7-21&n=2`);
  await page.getByRole("button", { name: "번호 만들기" }).click();
  await expect(page).toHaveURL(/g=[0-9a-z]{10}/);
  const games = page.locator(".game");
  await expect(games).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await expect(games.nth(i).getByLabel("7", { exact: true })).toBeVisible();
    await expect(games.nth(i).getByLabel("21", { exact: true })).toBeVisible();
  }
});

test("다시 만들기는 주소의 번호를 바꾼다", async ({ page }) => {
  await page.goto(`${P}/pick/result?t=random&n=1&g=00000`);
  await expect(page.getByLabel("1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "다시 만들기" }).click();
  await expect(page).not.toHaveURL(/g=00000/);
});

test("회차 결과와 번호별 페이지", async ({ page }) => {
  await page.goto(`${P}/results/1246`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("1246회 당첨번호");
  await expect(page.getByText("1,881,025,430원").first()).toBeVisible();
  await page.getByRole("link", { name: "← 1245회" }).click();
  await expect(page).toHaveURL(/\/results\/1245$/);
  await page.goto(`${P}/numbers/34`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("34번");
  await page.goto(`${P}/results/99999`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("그런 페이지가 없습니다");
});

test("당첨 확인", async ({ page }) => {
  await page.goto(`${P}/check`);
  await page.getByLabel("회차").selectOption("1246");
  for (const n of ["16", "22", "23", "24", "27", "28"]) await page.getByRole("button", { name: n, exact: true }).click();
  await expect(page.getByRole("status")).toContainText("1등");
});

test("통계 페이지는 역대와 전체 비율을 보여 준다", async ({ page }) => {
  await page.goto(`${P}/stats`);
  await expect(page.getByRole("row", { name: /균형형/ })).toContainText("42.");
});

test("모바일에서 가로 스크롤이 없다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "모바일 프로젝트에서만 본다");
  for (const path of [`${P}/`, `${P}/pick`, `${P}/pick/result?t=balanced&n=5&g=0000000001000020000300004`, `${P}/results/1246`, `${P}/stats`, `${P}/check`]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
