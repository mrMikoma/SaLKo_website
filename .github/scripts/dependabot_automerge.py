"""Decides whether a Dependabot pull request may merge by itself.

dependabot-auto-merge.yaml runs it. It may only when every update in the
pull request keeps its major version. Anything it cannot read stays for a
person too, so a mistake here costs a manual merge, never an unseen major.

Dependabot's commit metadata leaves out the update type for versions with a
"v" in front (v1.22.0: Alloy, Prometheus, Traefik...), so the versions are
compared here. They come from the description of a grouped pull request:
its table (every update of one directory, even when the rest of a long
description is cut short) and its "Updates `x` from a to b" lines; or from
the title of a single update. The updates found must be exactly the ones in
the metadata.

Input (environment): TITLE, BODY, UPDATES (fetch-metadata's
updated-dependencies-json), UPDATE_TYPE (its update-type: the highest it
knows). Output: auto=true|false and a reason in $GITHUB_OUTPUT, and a
summary on stdout. Locally:

    TITLE=... BODY=... UPDATES='[...]' python3 -I .github/scripts/dependabot_automerge.py
"""

import json
import os
import re
import sys

# | [name](link) | `1.2.3` | `1.3.0` |   or   | name | `1.2.3` | `1.3.0` |
TABLE_ROW = re.compile(r"^\|\s*(?:\[([^\]]+)\]\([^)]*\)|([^|`\[]+?))\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*$")
# Updates `traefik` from v3.7.16 to v3.7.19
UPDATES_LINE = re.compile(r"^Updates `([^`]+)` from (\S+) to (\S+?)\.?$")
# Bump googleapis from 188.0.0 to 190.0.0 in /nextjs
TITLE_BUMP = re.compile(r"\bBump (\S+) from (\S+) to (\S+)")
MAJOR = re.compile(r"^v?(\d+)[.\-+_]?")


def updates_listed(title, body):
    """(name, from, to) for each update the pull request lists, once each."""
    found = []
    for line in body.splitlines():
        line = line.strip()
        m = TABLE_ROW.match(line)
        if m:
            found.append(((m.group(1) or m.group(2)).strip(), m.group(3), m.group(4)))
            continue
        m = UPDATES_LINE.match(line)
        if m:
            found.append((m.group(1), m.group(2), m.group(3)))
    if not found:
        m = TITLE_BUMP.search(title)
        if m:
            found.append((m.group(1), m.group(2), m.group(3)))
    return list(dict.fromkeys(found))


def major(version):
    m = MAJOR.match(version.strip())
    return int(m.group(1)) if m else None


def decide(title, body, updates_json, update_type):
    """(auto, reason, lines for the summary)"""
    try:
        metadata = json.loads(updates_json or "[]")
    except json.JSONDecodeError:
        return False, "Dependabot's metadata could not be read", []
    if update_type == "version-update:semver-major":
        return False, "Dependabot marks a major update", []
    if any(u.get("updateType") == "version-update:semver-major" for u in metadata):
        return False, "Dependabot marks a major update", []

    listed = updates_listed(title, body)
    if not listed:
        return False, "no updates found in the title or the description", []
    names = {name for name, _, _ in listed}
    expected = {u.get("dependencyName") for u in metadata}
    if len(names) != len(listed):
        return False, "a dependency is listed with two different versions", []
    if names != expected:
        missing = ", ".join(sorted(n for n in expected - names if n)) or "-"
        extra = ", ".join(sorted(names - expected)) or "-"
        return False, f"the updates found don't match the metadata (not found: {missing}; not in it: {extra})", []

    lines, majors, unreadable = [], [], []
    for name, old, new in listed:
        a, b = major(old), major(new)
        if a is None or b is None:
            unreadable.append(name)
            kind = "unreadable"
        elif a != b:
            majors.append(name)
            kind = "MAJOR"
        else:
            kind = "same major"
        lines.append(f"{name}: {old} -> {new} ({kind})")
    if majors:
        return False, "a major update: " + ", ".join(majors), lines
    if unreadable:
        return False, "versions it can't compare: " + ", ".join(unreadable), lines
    return True, f"{len(listed)} update(s), none major", lines


def main():
    auto, reason, lines = decide(
        os.environ.get("TITLE", ""),
        os.environ.get("BODY", ""),
        os.environ.get("UPDATES", ""),
        os.environ.get("UPDATE_TYPE", ""),
    )
    print(("Merges by itself: " if auto else "Waits for a person: ") + reason)
    for line in lines:
        print("  " + line)
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write(f"auto={'true' if auto else 'false'}\n")
            f.write(f"reason={reason}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
