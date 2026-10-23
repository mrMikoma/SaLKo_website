# Sending email

The website sends email, starting with bills, through the club's Google Workspace. This covers how it works and the one-time setup per environment.

## How it works

- Every message is first stored in `email_outbox`, then sent through the Gmail API as one of the club's mailboxes (`utilities/mail.ts`). A message is claimed before it is sent, so a double click can't send it twice.
- `/admin/laskutus/viestit` lists what was sent or tried, with the error and a retry for failed ones, and has a "Lähetä testiviesti itselleni" button. The settings page says whether mail is on.
- **Senders** (`getSender` in `utilities/mailConfig.ts`): bills go from `laskutus@savonlinnanlentokerho.fi`, the address members already know and the treasurer reads, so replies reach the treasurer. Other mail, such as event invitations and the chairman's letters, gets its own sender when it comes (for example `info@`), so replies to it don't land in the billing inbox. See "Adding a sender" below.
- **`MAIL_MODE`** decides where mail goes:

| `MAIL_MODE` | Where | Mail goes |
|---|---|---|
| unset (off) | local, tests, CI | nowhere: stored in `email_outbox` and marked "Ei lähetetty" |
| `redirect` | dev (kehitys) | every message to `MAIL_REDIRECT_TO`, with "[Kehitys → recipient]" in the subject. The dev database has real addresses in its seed. |
| `send` | production | to the recipients |

The website authenticates as each sending mailbox with an OAuth token that allows only `gmail.send`: it can send as the mailbox but not read it. A club mail server was ruled out: Hetzner blocks outgoing port 25, and a new server's address has no sending reputation, so bills would end up in spam. Two other Google options were ruled out too. The Sheets service account would need domain-wide delegation, after which a leaked key could send as anyone in the club. An app password opens the whole mailbox.

## 1. DNS: SPF, DKIM and DMARC

Without these, receivers can't tell the club's mail from forged mail, and Gmail and Outlook put it in spam. The records live in `infra/terraform/main.tf`, which is applied when it reaches `main`.

- **SPF** (`v=spf1 include:_spf.google.com ~all`) and **DMARC** (`v=DMARC1; p=none`) are there.
- **DKIM:**
  1. In the Google Admin console, go to Apps → Google Workspace → Gmail → Authenticate email.
  2. Generate a new record: 2048-bit, prefix `google`.
  3. Add it to `main.tf` as a TXT record named `google._domainkey`, through a PR.
  4. Once the record is live, press **Start authentication** in the Admin console.
- When test messages pass all three checks, raise DMARC to `p=quarantine`.

To check a message: open it in Gmail, then **⋮ → Show original**. SPF, DKIM and DMARC should all say PASS.

## 2. The sending mailbox

- **If `laskutus@` is a user account** (it has its own password), authorise it directly in step 4.
- **If it is a Google Group:** pick the user account that sends, for example the treasurer's.
  1. In that account's Gmail, go to Settings → Accounts → Send mail as, and add `laskutus@savonlinnanlentokerho.fi`.
  2. Authorise that account in step 4.
  3. Set `MAIL_BILLING_FROM=laskutus@savonlinnanlentokerho.fi`.

  Gmail replaces a From address that isn't the account's own or a verified alias, so the test message shows whether this worked.

Two things to know:
- **Changing the mailbox's password cancels the website's permission.** Google does this for every token with Gmail access. Sending then fails with "lupa ei enää kelpaa"; authorise again (step 4) and update the secret.
- A Workspace account sends at most 2,000 messages a day, far more than the club needs.

## 3. Google Cloud: the OAuth client

Use the club's Google Cloud project that belongs to the Workspace organisation, for example the one the website's Google login uses.

1. Go to APIs & Services → Library → **Gmail API**, and enable it.
2. Set Google Auth Platform → Audience to **Internal**. Then only club accounts can authorise, and Google needs no app review.
3. Under Clients → **Create client**, choose application type **Desktop app**, named for example "SaLKo verkkosivut, sähköposti". Copy the client ID and secret.

## 4. Authorise the mailbox

From `nextjs/`, with the client in `.env` (`MAIL_GMAIL_CLIENT_ID`, `MAIL_GMAIL_CLIENT_SECRET`):

```bash
bun run mail:authorize laskutus@savonlinnanlentokerho.fi
```

1. Open the link it prints.
2. Sign in as that mailbox and allow sending.

The script checks that the right account signed in, then prints the **refresh token**. Paste it straight into the GitHub secrets (step 5), and don't keep it anywhere else. Locally, mail stays off, so `.env` doesn't need it.

## 5. Secrets

In GitHub, go to Settings → Environments, and add these to **development**:

| Secret | Value |
|---|---|
| `MAIL_GMAIL_CLIENT_ID` | the OAuth client's ID |
| `MAIL_GMAIL_CLIENT_SECRET` | its secret |
| `MAIL_BILLING_REFRESH_TOKEN` | the token from step 4 |
| `MAIL_REDIRECT_TO` | where kehitys sends all its mail, e.g. your own address |

`deploy-app-dev.yaml` writes them into the app's env with `MAIL_MODE=redirect`. Without `MAIL_REDIRECT_TO`, mail stays off on kehitys.

For **production**:
1. Add the first three secrets to the production environment.
2. Write them into `deploy-app-prod.yaml` together with `MAIL_MODE=send`, in the PR that takes billing live.

## 6. Test

On `/admin/laskutus/viestit`, press **Lähetä testiviesti itselleni**. On kehitys, the message arrives at `MAIL_REDIRECT_TO` with "[Kehitys → your address]" in the subject. Check its From address and the SPF/DKIM/DMARC results (step 1).

## Troubleshooting

| Message on the site | Fix |
|---|---|
| lupa ei enää kelpaa | The password changed, or the permission was removed. Authorise again (step 4) and update the secret. |
| Gmail API ei ole käytössä | Step 3.1. |
| OAuth-asiakkaan tunnus tai salaisuus on väärin | Check `MAIL_GMAIL_CLIENT_ID` and `MAIL_GMAIL_CLIENT_SECRET`. |
| lähetystä ei ole määritetty | A secret is missing from the environment. |
| From shows another address | The address isn't the authorised account or its alias (step 2). |
| Mail goes to spam | DNS (step 1). |

## Adding a sender

For example, `info@` for invitations and the chairman's letters:
1. Add a key to `SENDER_KEYS` and a case to `getSender` in `utilities/mailConfig.ts`, with its own variables (`MAIL_INFO_FROM`, `MAIL_INFO_REFRESH_TOKEN`).
2. Authorise the mailbox (step 4), and add the secret and the deploy lines.
3. Decide who may send what: `MANAGE_BILLING` covers only bills.

Mailings to all members should also let members opt out.
