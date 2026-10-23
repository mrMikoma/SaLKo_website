import type { MailOverview } from "@/utilities/mailData";

/** Whether the website sends mail, from which account, and where replies go */
const MailStatus = ({ overview }: { overview: MailOverview }) => {
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
      <p className="text-sm text-gray-700">
        Kaikki kerhon viestit lähtevät tililtä{" "}
        <strong>{overview.account ?? "(MAIL_FROM puuttuu)"}</strong>. Vastaukset laskuihin menevät osoitteeseen{" "}
        {overview.billingReplyTo}, muihin viesteihin osoitteeseen {overview.infoReplyTo}.
        {overview.mode !== "off" && !overview.configured && (
          <span className="text-red-700">
            {" "}
            Tiliä ei ole määritetty kokonaan (docs/MAIL_SETUP.md), joten viestit epäonnistuvat.
          </span>
        )}
      </p>
    </div>
  );
};

export default MailStatus;
