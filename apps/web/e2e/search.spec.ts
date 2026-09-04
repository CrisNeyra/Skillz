import { expect, test } from "@playwright/test";

test.describe("search", () => {
  test("search page finds demo talent", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: /buscar talento|search talent/i })).toBeVisible();
    await page.getByLabel(/buscar perfiles|search profiles/i).fill("demo");
    await page.getByRole("button", { name: /buscar|search/i }).click();
    await expect(page.getByText("Demo Talent")).toBeVisible({ timeout: 15_000 });
  });
});
