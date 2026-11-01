# The weekly copy of GitHub

A weekly copy of what lives outside the server: the repository, the Terraform state and the Actions variables. It goes to the club's shared drive, the same one the nightly server copy uses. Why: items 6–8 in [`BACKUP_PLAN.md`](BACKUP_PLAN.md). The nightly copy of the server: [`infra/ansible/roles/backup/README.md`](../../infra/ansible/roles/backup/README.md).

## What it does

`.github/workflows/backup-github.yaml` runs on Mondays at 03:17 UTC, and by hand from Actions → **Backup GitHub** → Run workflow. It runs on a GitHub-hosted runner, so it doesn't need the server. Its script, `.github/scripts/backup-github.sh`:

1. bundles the repository, every branch and tag, into one `git bundle`;
2. downloads the Terraform state from R2 (`salko-website/terraform.tfstate`) and encrypts it with age to the keys in `BACKUP_AGE_RECIPIENTS`, because it holds the generated database passwords;
3. saves the Actions variables as JSON. They aren't secret, so they stay readable without a key;
4. uploads the three, and updates the recovery guide in `LUE MINUT`.

The shared drive then has:

```
github/<year>/salko-website-<UTC time>.bundle
github/<year>/actions-variables-<UTC time>.json
terraform/<year>/terraform-<UTC time>.tfstate.age
LUE MINUT/BACKUP_PLAN.md      nextjs/docs/BACKUP_PLAN.md
LUE MINUT/BACKUP_SERVER.md    infra/ansible/roles/backup/README.md
LUE MINUT/BACKUP_GITHUB.md    this file
```

**The dated files are never replaced:** the script skips a name that exists, and each file's first version is marked to be kept forever in its version history. The CI's service account is a Contributor, which can't move or delete files. The files in `LUE MINUT` are updated every week to the versions on `main`, so they can be read in Drive even without GitHub. The guide's file list is at the top of the script.

**Not copied:**
- issues, pull requests and their discussions, and releases;
- the GHCR images, which are rebuilt from the code;
- the Actions secrets, repository and environment ones alike. The maintainer keeps them outside GitHub (`BACKUP_PLAN.md`). Terraform makes the environments themselves, their Postgres passwords and `SERVER_IP_SALKO0` (`infra/terraform/modules/github`, `infra/terraform/main.tf`).

**There are no automatic checks.** A failed run shows as failed in Actions, and GitHub emails it to whoever last changed the schedule in the workflow.

**GitHub pauses the schedule** of a public repository's workflows after 60 days without activity in the repository. The copies then stop, but nothing new goes uncopied, because nothing has changed. Actions → **Backup GitHub** → "Enable workflow" turns it back on.

## Switching it on

It needs the shared drive, and the variables `BACKUP_DRIVE_ID` and `BACKUP_AGE_RECIPIENTS`. Both are made when the server's copy is switched on (steps 1–2 and 4 of "Switching it on" in `infra/ansible/roles/backup/README.md`). Then:

1. **A second service account, for GitHub Actions,** in the same Google Cloud project as the server's, where the Drive API is already on:
   - make a JSON key;
   - add the service account's address to the shared drive as **Contributor**. It needs no Cloud roles.
2. **The secret `BACKUP_DRIVE_CI_SA_JSON`** under Settings → Secrets and variables → Actions: the JSON key file's contents, as they are.
3. **Run it once:** Actions → **Backup GitHub** → Run workflow, on `main`. GitHub only offers a workflow there once it is on `main`.

It also reads the R2 secrets Terraform uses, `CF_BUCKET_ACCESS_KEY` and `CF_BUCKET_SECRET_KEY`.

Until `BACKUP_DRIVE_CI_SA_JSON` is set, each run only notes that the copy is off. Once it is set, a missing variable or R2 secret fails the run.

## Checking it

The log of the step "Copy to the shared drive" lists how many branches and tags went into the bundle, the state's serial number and the names of the variables. In Drive, the newest dated files should be from the last Monday.

## Restoring

Download the files from the shared drive. You need git, age and jq; Terraform and the GitHub CLI for the last steps.

**The repository,** into a new and empty repository:

```
git clone --mirror salko-website-<time>.bundle SaLKo_website.git
cd SaLKo_website.git
git push --mirror git@github.com:<new owner>/SaLKo_website.git
```

`git clone salko-website-<time>.bundle SaLKo_website` instead gives a working copy of `main`, with the other branches under `origin/`.

**The Terraform state:**

```
age -d -i salko-backup-maintainer.key terraform-<time>.tfstate.age > terraform.tfstate
```

- It holds the database passwords in clear text. Keep it out of shared folders, and delete it when you are done.
- Read the passwords:
  ```
  jq -r '.resources[] | select(.type == "random_password") | "\(.name): \(.instances[0].attributes.result)"' terraform.tfstate
  ```
- To put it in a new bucket (`BACKUP_PLAN.md`, S5):
  1. point `backend "s3"` in `infra/terraform/providers.tf` at the new bucket;
  2. `cd infra/terraform && terraform init -reconfigure`;
  3. `terraform state push <path to>/terraform.tfstate`.

**The variables,** into a repository:

```
f=actions-variables-<time>.json
for name in $(jq -r 'keys[]' "$f"); do
  gh variable set "$name" -R <owner>/<repo> --body "$(jq -r --arg n "$name" '.[$n]' "$f")"
done
```

Terraform sets `SERVER_IP_SALKO0` again on its next apply.
