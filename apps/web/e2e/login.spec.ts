import { expect, test } from "@playwright/test";

test.describe("login demo → home", () => {
  test("login with demo credentials shows home profile", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /iniciar sesión|log in/i })).toBeVisible();

    await page.locator("#login").fill("test@test.com");
    await page.locator("#password").fill("123456Ab");
    await page.getByRole("button", { name: /iniciar sesión|log in/i }).click();

    await expect(page).toHaveURL(/\/(u\/test)?$/, { timeout: 20_000 });
    await page.goto("/");
    await expect(page.getByText(/tu home|your home/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Demo Talent" })).toBeVisible();
  });
});
