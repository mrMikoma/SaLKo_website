import { describe, expect, test } from "bun:test";
import {
  describeMailError,
  isMailConfigured,
  MAIL_PURPOSES,
  mailAccount,
  mailMode,
  MailConfigError,
  redirected,
} from "@/utilities/mailConfig";

describe("the mail mode", () => {
  test("is off unless set, so a test run or a database copy never mails anyone", () => {
    expect(mailMode({})).toBe("off");
    expect(mailMode({ MAIL_MODE: "true" })).toBe("off");
    expect(mailMode({ MAIL_MODE: "send" })).toBe("send");
  });

  test("redirect needs an address to redirect to", () => {
    expect(mailMode({ MAIL_MODE: "redirect" })).toBe("off");
    expect(mailMode({ MAIL_MODE: "redirect", MAIL_REDIRECT_TO: "  " })).toBe("off");
    expect(mailMode({ MAIL_MODE: "redirect", MAIL_REDIRECT_TO: "dev@example.fi" })).toBe("redirect");
  });
});

describe("the club's mail account", () => {
  const env = {
    MAIL_FROM: " posti@example.fi ",
    MAIL_REFRESH_TOKEN: "token",
    MAIL_GMAIL_CLIENT_ID: "id",
    MAIL_GMAIL_CLIENT_SECRET: "secret",
  };

  test("sends everything once all four are set", () => {
    expect(mailAccount(env).address).toBe("posti@example.fi");
    expect(isMailConfigured(env)).toBe(true);
    for (const key of Object.keys(env)) {
      expect(isMailConfigured({ ...env, [key]: "" })).toBe(false);
    }
  });

  test("bills and other mail differ only in the sender's name and where replies go", () => {
    expect(MAIL_PURPOSES.billing).toEqual({
      name: "Savonlinnan Lentokerho, laskutus",
      replyTo: "laskutus@savonlinnanlentokerho.fi",
    });
    expect(MAIL_PURPOSES.info).toEqual({
      name: "Savonlinnan Lentokerho",
      replyTo: "info@savonlinnanlentokerho.fi",
    });
  });
});

describe("the dev environment's redirect", () => {
  const message = {
    to: { address: "matti@example.fi", name: "Matti" },
    subject: "Lasku 20260001",
    text: "Summa 60,00 €",
    html: "<p>Summa</p>",
  };

  test("sends to the redirect address and says who it was for", () => {
    const copy = redirected(message, "dev@example.fi");
    expect(copy.to).toEqual({ address: "dev@example.fi" });
    expect(copy.subject).toBe("[Kehitys → matti@example.fi] Lasku 20260001");
    expect(copy.text).toStartWith("Kehitysympäristö: tämä viesti olisi mennyt osoitteeseen matti@example.fi.");
    expect(copy.text).toEndWith("Summa 60,00 €");
    expect(copy.html).toContain("matti@example.fi");
    expect(copy.html).toEndWith("<p>Summa</p>");
  });

  test("escapes the address in the HTML notice", () => {
    const copy = redirected({ ...message, to: { address: "<b>x</b>@example.fi" } }, "dev@example.fi");
    expect(copy.html).not.toContain("<b>");
  });
});

describe("errors", () => {
  test("say what to do, in Finnish", () => {
    const grant = { message: "invalid_grant", response: { status: 400, data: { error: "invalid_grant" } } };
    expect(describeMailError(grant, "posti@example.fi")).toContain("Valtuuta tili uudelleen");
    expect(describeMailError({ message: "Gmail API has not been used in project 123" }, "x")).toContain(
      "Gmail API ei ole käytössä"
    );
    expect(describeMailError({ status: 429, message: "Too many" }, "x")).toContain("lähetysraja");
    expect(describeMailError(new MailConfigError("Ei määritetty"), null)).toBe("Ei määritetty");
    expect(describeMailError(new Error("socket hang up"), "x")).toBe("Lähetys epäonnistui: socket hang up");
  });
});
