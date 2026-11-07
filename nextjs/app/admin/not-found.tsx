import Link from "next/link";
import ErrorPanel, { primaryAction } from "@/components/errors/ErrorPanel";

export const metadata = {
  title: "Ei löytynyt",
};

/**
 * A period, an invoice or another admin page that isn't there (a removed
 * draft, an old link). Inside the admin layout, so the admin menu stays.
 * A treasurer sent to /admin lands on their own first section (proxy.ts).
 */
export default function AdminNotFound() {
  return (
    <div className="max-w-3xl">
      <ErrorPanel
        tone="light"
        title="Ei löytynyt"
        actions={
          <Link href="/admin" className={primaryAction("light")}>
            Hallinnan etusivulle
          </Link>
        }
      >
        <p>Hakemaasi sivua tai tietoa ei löytynyt. Se on voitu poistaa, tai linkki on vanha.</p>
        <p>Valitse osio yläpuolen valikosta.</p>
      </ErrorPanel>
    </div>
  );
}
