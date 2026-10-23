# Sending email

The website sends the club's email, starting with bills, from one Google Workspace account. This covers how it works and the one-time setup per environment.

## How it works

- **One account sends everything:** bills, and later invitations and the chairman's letters. It is a club account made for this, for example `posti@savonlinnanlentokerho.fi` (`MAIL_FROM`). It authorises the website once, and that one token covers all mail.
- **What a message is about** sets the sender's name and where replies go (`MAIL_PURPOSES` in `utilities/mailConfig.ts`, with addresses from `data/contacts.json`):

  | Purpose | From shows | Replies go to |
  |---|---|---|
  | `billing` (bills) | Savonlinnan Lentokerho, laskutus | `laskutus@` (the treasurer) |
  | `info` (everything else) | Savonlinnan Lentokerho | `info@` |

  A new kind of mail is a new line there; no new account or setup is needed.
- **The outbox:** every message is first stored in `email_outbox`, then sent through the Gmail API (`utilities/mail.ts`). A message is claimed before it is sent, so a double click can't send it twice.
- **`/admin/laskutus/viestit`** lists what was sent or tried, with the error and a retry for failed ones, and has a "Lähetä testiviesti itselleni" button. The settings page says whether mail is on.
- **`MAIL_MODE`** decides where mail goes:

| `MAIL_MODE` | Where | Mail goes |
|---|---|---|
| unset (off) | local, tests, CI | nowhere: stored in `email_outbox` and marked "Ei lähetetty" |
| `redirect` | dev (kehitys) | every message to `MAIL_REDIRECT_TO`, with "[Kehitys → recipient]" in the subject. The dev database has real addresses in its seed. |
| `send` | production | to the recipients |

The website's token allows only `gmail.send`: it can send as the account, but not read its mail.

Options that were ruled out:
- **A club mail server:** Hetzner blocks outgoing port 25, and a new server's address has no sending reputation, so bills would end up in spam.
- **The Sheets service account:** it would need domain-wide delegation, after which a leaked key could send as anyone in the club.
- **An app password:** it opens the whole mailbox.

## 1. DNS: SPF, DKIM and DMARC

Without these, receivers can't tell the club's mail from forged mail, and Gmail and Outlook put it in spam. The records live in `infra/terraform/main.tf`, which is applied when it reaches `main`.

- **SPF** (`v=spf1 include:_spf.google.com ~all`) and **DMARC** (`v=DMARC1; p=none`).
- **DKIM:**
  1. In the Google Admin console, go to Apps → Google Workspace → Gmail → Authenticate email.
  2. Generate a new record: 2048-bit, prefix `google`.
  3. Add it to `main.tf` as a TXT record named `google._domainkey`, through a PR.
  4. Once the record is live, press **Start authentication** in the Admin console.
- When test messages pass all three checks, raise DMARC to `p=quarantine`.

To check a message: open it in Gmail, then **⋮ → Show original**. SPF, DKIM and DMARC should all say PASS.

## 2. The club's mail account

1. In the Google Admin console, go to Users → **Add new user**, for example `posti@savonlinnanlentokerho.fi`, named "Savonlinnan Lentokerho". It has to be a user, because a group can't sign in, so it takes one licence.
2. Give it a long random password, kept where the board keeps the club's passwords, and turn on 2-Step Verification. Nobody needs to log in to it day to day.
3. In its Gmail, go to Settings → Forwarding and forward its mail to whoever looks after the website.
   - Replies go to `laskutus@` or `info@`, but bounces (an address that doesn't exist, a full mailbox) and people who ignore Reply-To land in this inbox.

Two things to know:
- **Changing the account's password cancels the website's permission.** Google does this for every token with Gmail access. Sending then fails with "lupa ei enää kelpaa"; authorise again (step 4) and update the secret.
- A Workspace account sends at most 2,000 messages a day, far more than the club needs.

## 3. Google Cloud: the OAuth client

Use the club's Google Cloud project that belongs to the Workspace organisation, for example the one the website's Google login uses.

1. Go to APIs & Services → Library → **Gmail API**, and enable it.
2. Set Google Auth Platform → Audience to **Internal**. Then only club accounts can authorise, and Google needs no app review.
3. Under Clients → **Create client**, choose application type **Desktop app**, named for example "SaLKo verkkosivut, sähköposti". Copy the client ID and secret.

## 4. Authorise the account

From `nextjs/`, with the client in `.env` (`MAIL_GMAIL_CLIENT_ID`, `MAIL_GMAIL_CLIENT_SECRET`):

```bash
bun run mail:authorize posti@savonlinnanlentokerho.fi
```

1. Open the link it prints.
2. Sign in as the club's mail account and allow sending.

The script checks that the right account signed in, then prints the **refresh token**. Paste it straight into the GitHub secrets (step 5), and don't keep it anywhere else. Locally, mail stays off, so `.env` doesn't need it.

## 5. Secrets

In GitHub, go to Settings → Environments, and add these to **development**:

| Secret | Value |
|---|---|
| `MAIL_FROM` | the club's mail account, e.g. `posti@savonlinnanlentokerho.fi` |
| `MAIL_REFRESH_TOKEN` | the token from step 4 |
| `MAIL_GMAIL_CLIENT_ID` | the OAuth client's ID |
| `MAIL_GMAIL_CLIENT_SECRET` | its secret |
| `MAIL_REDIRECT_TO` | where kehitys sends all its mail, e.g. your own address |

`deploy-app-dev.yaml` writes them into the app's env with `MAIL_MODE=redirect`. Without `MAIL_REDIRECT_TO`, mail stays off on kehitys.

For **production**:
1. Add the first four secrets to the production environment.
2. Write them into `deploy-app-prod.yaml` together with `MAIL_MODE=send`, in the PR that takes billing live.

## 6. Test

On `/admin/laskutus/viestit`, press **Lähetä testiviesti itselleni**. It goes out as a bill would. On kehitys, it arrives at `MAIL_REDIRECT_TO` with "[Kehitys → your address]" in the subject. Check three things:
- From: "Savonlinnan Lentokerho, laskutus" and the account's address;
- replying goes to `laskutus@`;
- SPF, DKIM and DMARC pass (step 1).

## Troubleshooting

| Message on the site | Fix |
|---|---|
| lupa ei enää kelpaa | The password changed, or the permission was removed. Authorise again (step 4) and update the secret. |
| Gmail API ei ole käytössä | Step 3.1. |
| OAuth-asiakkaan tunnus tai salaisuus on väärin | Check `MAIL_GMAIL_CLIENT_ID` and `MAIL_GMAIL_CLIENT_SECRET`. |
| Kerhon sähköpostitiliä ei ole määritetty | A secret is missing from the environment. |
| Mail goes to spam | DNS (step 1). |

## Adding a kind of mail

For example, event invitations or the chairman's letters:
1. Add a purpose to `MAIL_PURPOSES` (`utilities/mailConfig.ts`), with the sender's name and the reply address, or use `info`.
2. Queue messages with `queueEmail({ purpose, … })`, then `deliverEmails`.
3. Decide who may send them: `MANAGE_BILLING` covers only bills.

Mailings to all members should also let members opt out.
