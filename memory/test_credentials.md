# Test Credentials

## App Test User (existing in DB; password reset by main agent)
- email: kiki@gmail.com
- username: Kiki
- password: test1234

Notes:
- App is mobile-only (desktop shows "Coming Soon" gate based on UA / width < 1024).
- DB has VS polls used by Feed V2 (/feed-v2). Token stored in localStorage key "token".
- /feed-v2 requires auth (redirects to login when no token).
