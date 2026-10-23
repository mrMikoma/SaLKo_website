// Authorises the website to send mail as the club's mail account and prints
// the refresh token to store as MAIL_REFRESH_TOKEN (docs/MAIL_SETUP.md). Run
// from nextjs/, with the OAuth client's MAIL_GMAIL_CLIENT_ID and
// MAIL_GMAIL_CLIENT_SECRET in .env or the shell:
//
//   bun run mail:authorize posti@savonlinnanlentokerho.fi
//
// Open the printed link and sign in as that account. The website gets only
// the gmail.send permission: it can send as the account, but not read it.
import http from "http";
import type { AddressInfo } from "net";
import { randomBytes } from "crypto";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config({ path: ".env", quiet: true });

const SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

const mailbox = process.argv[2]?.trim().toLowerCase();
const clientId = process.env.MAIL_GMAIL_CLIENT_ID?.trim();
const clientSecret = process.env.MAIL_GMAIL_CLIENT_SECRET?.trim();
if (!mailbox || !clientId || !clientSecret) {
  console.error(
    "Usage: bun run mail:authorize <mailbox>\n" +
      "with MAIL_GMAIL_CLIENT_ID and MAIL_GMAIL_CLIENT_SECRET set (docs/MAIL_SETUP.md)"
  );
  process.exit(1);
}

const state = randomBytes(16).toString("hex");
const server = http.createServer();

server.listen(0, "127.0.0.1", () => {
  // A Desktop app client accepts any port on the loopback address
  const redirectUri = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const url = oauth.generateAuthUrl({
    access_type: "offline",
    // Asks again even if granted before, so Google returns a refresh token
    prompt: "consent",
    // The email scopes only tell this script which account signed in
    scope: [SEND_SCOPE, "openid", "email"],
    login_hint: mailbox,
    hd: mailbox.split("@")[1],
    state,
  });
  console.log(`Open this link and sign in as ${mailbox}:\n\n${url}\n`);

  server.on("request", async (request, response) => {
    const params = new URL(request.url ?? "/", redirectUri).searchParams;
    if (!params.has("code") && !params.has("error")) {
      response.writeHead(404).end();
      return;
    }
    const finish = (ok: boolean, text: string) => {
      response.writeHead(ok ? 200 : 400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(ok ? "Valmis. Voit sulkea tämän ikkunan." : `Ei onnistunut: ${text}`);
      server.close();
      if (!ok) console.error(text);
      process.exitCode = ok ? 0 : 1;
    };

    if (params.get("state") !== state) return finish(false, "The reply didn't come from this run.");
    if (params.has("error")) return finish(false, `Google said: ${params.get("error")}`);
    try {
      const { tokens } = await oauth.getToken(params.get("code")!);
      const claims = tokens.id_token
        ? JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString("utf8"))
        : {};
      const signedIn = String(claims.email ?? "").toLowerCase();
      if (signedIn !== mailbox) {
        return finish(false, `You signed in as ${signedIn || "an unknown account"}, not ${mailbox}. Run again and pick ${mailbox}.`);
      }
      if (!tokens.scope?.split(" ").includes(SEND_SCOPE) || !tokens.refresh_token) {
        return finish(false, "Google gave no permission to send. Run again and allow sending.");
      }
      finish(true, "");
      console.log(
        `Authorised ${mailbox}. Store this refresh token as the secret MAIL_REFRESH_TOKEN, ` +
          `with MAIL_FROM=${mailbox}, and don't keep it anywhere else:\n\n` +
          `${tokens.refresh_token}\n`
      );
    } catch (error) {
      finish(false, `Exchanging the code failed: ${(error as Error).message}`);
    }
  });
});
