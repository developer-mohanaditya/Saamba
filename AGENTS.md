# Project instructions

Read and follow [PROJECT_IDENTITY.md](PROJECT_IDENTITY.md) before Git and GitHub work. The project identity record in that file defines the primary and secondary accounts and destination.

# Secrets and meeting data

- Never commit or display API keys, tokens, credentials, real environment files, meeting recordings, transcripts, or local databases. Use `.env.example` with empty placeholder values only.
- Treat recordings and transcripts as private user data. Do not include them in logs, fixtures, screenshots, or test output. Use synthetic test data.
- Before staging or publishing, inspect the files and Git status, and verify that environment files and meeting data remain ignored. `.gitignore` does not protect files that are already tracked; inspect tracked files and history as appropriate.
- Do not enable paid provider billing or silently switch providers. Preserve the user's zero-budget requirement.
- Never print or commit secrets, including in command output or documentation. If a secret reaches Git, treat it as compromised and revoke or rotate it; deleting a later commit alone does not remove it from history.
