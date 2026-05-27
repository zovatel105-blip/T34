# Test Credentials

## ✅ Active Test User (Feed V2 testing — funciona como de 2026-05-27)
- Email: feedv2test@test.com
- Password: Test1234!
- Username: feedv2test
- Display Name: FeedV2 Test
- User ID: 15c87636-79b2-4490-9860-26d6ff4aaa87
- Auth: JWT — POST /api/auth/login con `{email, password}` → returns `access_token`
- Use para `/feed-v2` smoke tests

## ⚠️ NOTA: Las credenciales antiguas (i18ntest, apktest2, etc.) NO funcionan actualmente
- La DB de polls está vacía
- Login con esas users devuelve "Incorrect email/username or password"
- Si necesitas más usuarios para testing, REGÍSTRALOS via POST /api/auth/register

## Active Test User (i18n testing - works as of 2026-05-11)
- Email: i18ntest@test.com
- Password: test1234
- Username: i18ntest
- Display Name: i18n Tester
- Auth: JWT — POST /api/auth/login with `{email, password}` → returns access_token

## Demo User (Google social login only - use Google sign-in)
- Email: demo@example.com
- Uses Google OAuth (no password login)

## Test User (status bar testing - legacy)
- Email: test_statusbar@test.com
- Password: test123456
- Username: statusbar_test
- Display Name: Status Bar Test

## APK/Thumbnail Test User (current)
- Email: apktest2@test.com
- Password: test1234
- Username: apktest2
- Display Name: APK Test
- Auth: JWT (POST /api/auth/login → access_token)

## E1 Fork Test User (CommentsModal verification)
- Email: e1test@test.com
- Password: test1234
- Username: e1test
- Display Name: E1 Test
- Auth: JWT — login uses `email` + `password` payload

## Content Author for Video Thumbnail Testing
- Username: ruby
- UserId: d4054045-3379-4ae3-b0fc-51801a1e75a8
- Sample video poll id: c3e9bd13-ac22-4e3e-ac3a-c7a6317c826f

## 🔴 LIVE Demo — Creator (MaxPlay)
- Email: livedemo@test.com
- Password: Demo1234!
- Username: MaxPlay
- Display Name: MaxPlay
- Use to test the CREATOR/BROADCAST experience.
- Has an active live room with 3 simulated viewers (Ana/Diego/Sofi) sending chat, likes and challenge proposals.

## 🔴 LIVE Demo — Simulated Viewers
- ana_demo@test.com / Demo1234! (Ana)
- diego_demo@test.com / Demo1234! (Diego)
- sofi_demo@test.com / Demo1234! (Sofi)
- All start with 500+200 mock coins (topped up by the demo runner).

## Screenshot test (May 2026)
- Email: screenshottest@test.com
- Password: test1234
- Username: sstest
- Auth: JWT
