import type { Page } from "@playwright/test";

/**
 * Pastes lines into the paper-page grid (/admin/lennot/tuonti) as one
 * tab-separated paste, the way rows copied from a spreadsheet arrive
 */
export async function pastePage(page: Page, lines: string[]) {
  await page.getByLabel("Rivi 1: Päivä").focus();
  await page.evaluate((text) => {
    const data = new DataTransfer();
    data.setData("text/plain", text);
    document.activeElement!.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true })
    );
  }, lines.join("\n"));
}
