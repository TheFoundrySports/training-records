---
description: Security rules — no secrets or PII in commits, input validation, least privilege.
alwaysApply: true
---

# Security Rules

## Always

- Always validate and sanitize all user inputs
- Always follow the principle of least privilege

## Never

- Never commit secrets, credentials, or API keys
- Never commit sql or sql.gz files
- Never commit any csv, txt, xls, xlsx, doc or docx files that contain PII data
- Never delete files out of the git scope of the project
