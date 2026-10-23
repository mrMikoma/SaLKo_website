import type { MailOverview } from "@/utilities/mailData";

/** Whether the website sends mail, from which address, and where it goes */
const MailStatus = ({ overview }: { overview: MailOverview }) => {
  const billing = overview.senders.find((sender) => sender.key === "billing");
  const mode =
    overview.mode === "send"
      ? { tone: "border-green-300 bg-green-50 text-green-900", text: "Käytössä: viestit menevät vastaanottajille." }
      : overview.mode === "redirect"
        ? {
            tone: "border-amber-300 bg-amber-50 text-amber-900",
            text: `Kehitystila: kaikki viestit menevät osoitteeseen ${overview.redirectTo}, eivät vastaanottajille.`,
          }
        : {
            tone: "border-gray-300 bg-gray-50 text-gray-800",
            text: "Pois päältä: viestit tallentuvat vain tälle sivustolle, mitään ei lähetetä (MAIL_MODE).",
          };

  return (
    <div className="space-y-3">
      <p className={`rounded-lg border px-4 py-3 ${mode.tone}`}>{mode.text}</p>
      {billing && (
        <p className="text-sm text-gray-700">
          Laskut lähtevät osoitteesta <strong>{billing.address}</strong>.
          {overview.mode !== "off" && !billing.configured && (
            <span className="text-red-700">
              {" "}
              Lähetystä siitä ei ole määritetty (docs/MAIL_SETUP.md), joten viestit epäonnistuvat.
            </span>
          )}
        </p>
      )}
    </div>
  );
};

export default MailStatus;
