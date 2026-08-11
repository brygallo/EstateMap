# Google OAuth Configuration

EstateMap accepts Google ID tokens through the backend endpoint
`POST /api/auth/google/`. The browser receives only the OAuth client ID; the
client secret must remain server-side.

## Required variables

```env
GOOGLE_CLIENT_ID=replace-with-client-id
GOOGLE_CLIENT_SECRET=replace-with-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=replace-with-the-same-client-id
```

`NEXT_PUBLIC_GOOGLE_CLIENT_ID` is embedded in browser assets and is not a
secret. `GOOGLE_CLIENT_SECRET` must never use the `NEXT_PUBLIC_` prefix or be
included in screenshots, examples, logs or commits.

## Provider setup

Create a web OAuth client in Google Cloud, configure the consent screen, and add
the exact development and production origins used by the frontend. Keep local
values in `.env` and production values in the deployment platform's secret
store.

After changing a build-time `NEXT_PUBLIC_` value, rebuild the frontend image.
Apply backend migrations before testing a new environment.

## Verification

1. Confirm the Google button appears on `/iniciar-sesion`.
2. Complete authentication with a test account.
3. Confirm the backend returns application JWTs and the account is marked as
   email-verified.
4. Confirm no provider token or client secret appears in server logs or browser
   storage.

If an OAuth value has ever been committed, deleting the file in a later commit
does not remove it from Git history. Follow [`SECURITY.md`](SECURITY.md).
