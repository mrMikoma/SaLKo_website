"""Tests for dependabot_automerge.py; checks.yaml runs them (Workflows job):

    python3 -I -m unittest discover -s .github/scripts -p 'test_*.py'
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dependabot_automerge import decide  # noqa: E402


def meta(*names, update_type=""):
    return json.dumps([{"dependencyName": n, "updateType": update_type} for n in names])


GROUP_BODY = """Bumps the minor-and-patch group with 3 updates in the / directory: grafana/alloy, umami-software/umami and traefik.

| Package | From | To |
| --- | --- | --- |
| grafana/alloy | `v1.21.3` | `v1.22.0` |
| [umami-software/umami](https://github.com/umami-software/umami) | `3.4.1` | `3.5.0` |

Updates `grafana/alloy` from v1.21.3 to v1.22.0
Updates `umami-software/umami` from 3.4.1 to 3.5.0
Updates `traefik` from v3.7.16 to v3.7.19

| Dependency Name | Ignore Conditions |
| --- | --- |
| grafana/grafana | [>= 13.a, < 14] |
"""
GROUP_TITLE = "build(deps): Bump the minor-and-patch group across 2 directories with 3 updates"
GROUP_META = meta("grafana/alloy", "umami-software/umami", "traefik")


class Decide(unittest.TestCase):
    def test_group_of_minor_and_patch_merges(self):
        auto, reason, _ = decide(GROUP_TITLE, GROUP_BODY, GROUP_META, "version-update:semver-minor")
        self.assertTrue(auto, reason)

    def test_major_with_v_prefix_and_no_update_type_waits(self):
        body = GROUP_BODY.replace("from v3.7.16 to v3.7.19", "from v3.7.19 to v4.0.0")
        auto, reason, _ = decide(GROUP_TITLE, body, GROUP_META, "version-update:semver-minor")
        self.assertFalse(auto)
        self.assertIn("traefik", reason)

    def test_major_marked_by_dependabot_waits(self):
        title = "build(deps): Bump googleapis from 188.0.0 to 190.0.0 in /nextjs"
        auto, _, _ = decide(title, "", meta("googleapis", update_type="version-update:semver-major"), "")
        self.assertFalse(auto)

    def test_single_update_from_the_title_merges(self):
        title = "build(deps): Bump node from 24.22.2-alpine to 24.22.3-alpine in /cronjobs/update-metar"
        auto, reason, _ = decide(title, "", meta("node"), "version-update:semver-patch")
        self.assertTrue(auto, reason)

    def test_an_update_missing_from_the_description_waits(self):
        body = GROUP_BODY.replace("Updates `traefik` from v3.7.16 to v3.7.19\n", "")
        auto, reason, _ = decide(GROUP_TITLE, body, GROUP_META, "")
        self.assertFalse(auto)
        self.assertIn("traefik", reason)

    def test_versions_it_cannot_compare_wait(self):
        title = "build(deps): Bump hashicorp/setup-terraform from dfe3c3f to a1b2c3d"
        auto, reason, _ = decide(title, "", meta("hashicorp/setup-terraform"), "")
        self.assertFalse(auto)
        self.assertIn("can't compare", reason)

    def test_unreadable_metadata_waits(self):
        auto, _, _ = decide(GROUP_TITLE, GROUP_BODY, "not json", "")
        self.assertFalse(auto)

    def test_no_metadata_waits(self):
        auto, _, _ = decide(GROUP_TITLE, GROUP_BODY, "[]", "")
        self.assertFalse(auto)


if __name__ == "__main__":
    unittest.main()
