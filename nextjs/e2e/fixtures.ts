import { test as base, expect } from "@playwright/test";

// Fails any test whose page throws or logs console.error — catches hydration
// errors and broken client components that still render a 200 page.
export const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await use(errors);
      expect(errors, "browser errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
