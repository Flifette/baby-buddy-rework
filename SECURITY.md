# Security policy

## Supported deployment boundary

- The Home Assistant add-on is supported behind authenticated Supervisor ingress. Its internal port must not be exposed directly.
- Standalone Docker and local development require the HTTP Basic credentials documented in the README. Use a unique password of at least 16 characters and HTTPS when traffic leaves the local host.
- Secrets, `.env`, `/data`, backups, runtime files, and private automation settings must never be committed.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting or a private security advisory for this repository. Do not open a public issue containing credentials, personal care data, or an unpatched exploit.

Include the affected version, deployment mode, reproduction steps, and the minimum evidence needed to confirm the issue. Please allow time for a correction before public disclosure.

This personal project is shared without a promise of indefinite maintenance. Users remain responsible for restricting network access, applying updates, and protecting Baby Buddy and Home Assistant credentials.
