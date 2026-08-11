# Security policy

## Reporting a vulnerability

Do not open a public issue for vulnerabilities, exposed credentials, personal
data, or infrastructure access. Report them privately to the repository owner
through GitHub's private vulnerability reporting feature.

Include the affected revision, a minimal reproduction, the expected impact, and
any evidence needed to validate the report. Do not access, modify, or download
data that is not required to demonstrate the issue.

## Credentials

Production credentials must live in the deployment platform's secret store.
They must never be committed, including in example files, test fixtures, build
logs, screenshots, or generated artifacts. Values prefixed with `NEXT_PUBLIC_`
are browser-visible by design and must not contain secrets.

If a secret is committed, removing it in a later commit is insufficient. Revoke
or rotate it first, then remove it from every reachable Git ref and invalidate
cached artifacts where possible.
