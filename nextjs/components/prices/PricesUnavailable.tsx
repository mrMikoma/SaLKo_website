import contacts from "@/data/contacts.json";

/**
 * In place of the prices when the price list couldn't be read
 * (getPriceList() answered `unavailable`): says so, and where to ask, instead
 * of leaving the tables empty as if there were no prices. Dark on the public
 * pages, light in the admin site.
 */
export default function PricesUnavailable({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { email } = contacts.general;
  return (
    <div
      role="status"
      className={
        tone === "dark"
          ? "glass rounded-xl border-2 border-warning-amber/50 bg-warning-amber/10 p-5 text-swhite"
          : "rounded-lg border border-orange-300 bg-orange-50 p-4 text-orange-900"
      }
    >
      <p className="font-semibold">Hinnat eivät juuri nyt lataudu.</p>
      <p className="mt-1">
        Yritä hetken kuluttua uudelleen, tai kysy hintoja osoitteesta{" "}
        <a href={`mailto:${email}`} className="underline underline-offset-2">
          {email}
        </a>
        .
      </p>
    </div>
  );
}
