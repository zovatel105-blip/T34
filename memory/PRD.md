# PRD — Polls / Challenges Social App (Native APK)

## Original Problem Statement
React + FastAPI + MongoDB + Capacitor social app (TikTok-style polls, challenges, stories). The user reported a series of native Android APK issues causing UI overlap, broken routing, missing thumbnails, and inconsistent full-screen viewing across the platform.

## User's five reported issues
1. Clicking a post from explore/search/profile does NOT open in full screen like the feed. — **FIXED (Feb 2026)**
2. Scrolling backward in the feed does not stop previous audio, causing overlaps. — **FIXED (previous session)**
3. Clicking any user profile redirected to the logged-in user's profile. — **FIXED (previous session)**
4. Active challenges page does not show thumbnails. — **FIXED (Feb 2026)**
5. Video thumbnails appear black / invisible across the app. — **FIXED (Feb 2026)**

## Architecture
- /app/frontend — React + Tailwind + Capacitor (Android native wrapper)
- /app/backend — FastAPI + MongoDB (async motor)
- Global audio control: `/app/frontend/src/services/AudioManager.js`
- Media pipeline: uploads go to `/app/backend/uploads/{category}/`; video thumbnails generated via ffmpeg into `/app/backend/uploads/{category}/thumbnails/<stem>_thumbnail.jpg`.
- Native safe-area handled via `useSafeArea.js` → CSS var `--safe-area-inset-top`.

## Changelog

### Feb 2026 — Native APK polish (3 issues)
- **Issue #5 (video thumbnails black) — root cause**: Legacy polls stored `option.thumbnail_url == option.media_url` (the MP4 URL itself). When frontend tried `<img src="...mp4">` the image failed and rendered black. ALSO the `uploaded_files.thumbnail_url` cache was missing and `ffmpeg` was not installed in the environment.
  - Installed `ffmpeg` via apt (required for `get_video_thumbnail_url`).
  - New backend helpers (`/app/backend/server.py`): `_is_video_url()` and `resolve_video_thumbnail()` which detect and repair bogus video-URL thumbnails on the fly. `get_thumbnail_for_media_url` updated to ignore cached video-URL thumbnails.
  - Updated endpoints to use the new helper:
    - `GET /api/polls`
    - `GET /api/users/{user_id}/polls`
    - `GET /api/challenges/{challenge_id}/polls`
    - Plus an internal occurrence near line 6240 in `server.py`.
  - Frontend (`/app/frontend/src/components/TikTokProfileGrid.jsx`): `hasVideoContent` / `getPostThumbnail` rewritten to read the new `option.media.{url,type,thumbnail}` shape (with legacy fallback) and added a `<video preload="metadata">` first-frame fallback when no JPG thumb exists.
  - Frontend (`/app/frontend/src/components/PollThumbnail.jsx`): introduced `getMediaFields()` helper supporting both legacy and new shape; all render branches now use it; rejects video-URL thumbnails.

- **Issue #4 (active challenges thumbnails missing)**: Same root cause as #5. Additionally ActiveChallengesPage was using raw relative paths (fail on APK `https://localhost` scheme) and didn't filter out video-URL thumbnails.
  - `/app/frontend/src/pages/ActiveChallengesPage.jsx`: import `resolveAssetUrl`, apply to video `src` and `poster`; skip rendering image bg when URL is a video extension.

- **Issue #1 (full-screen post view from explore/search/profile/trending)**: `navigate('/post/:id')` and `navigate('/poll/:id')` went to routes that did not exist in `App.js`, producing a blank page.
  - New page `/app/frontend/src/pages/PostViewerPage.jsx` renders `TikTokScrollView` for a single poll fetched via `pollService.refreshPoll(postId)` with full like/vote/share/save/comment wiring.
  - `/app/frontend/src/App.js`: registered `<Route path="/post/:postId" element={<PostViewerPage />} />` and `<Route path="/poll/:postId" element={<PostViewerPage />} />`.

### Previous session (Jan–Feb 2026)
- Dynamic Android status bar safe-area (`useSafeArea.js`, `index.css`, `ResponsiveLayout.jsx`, `ContentCreationPage.jsx`, `MomentCreationPage.jsx`, `SettingsPage`, `SearchPage`, `ChangePasswordPage`, `EditProfilePage`, `MessagesMainPage`).
- Web simulation mode via `?statusbar=44` query param.
- `/following` layout aligned with `/feed`.
- Audio stops when scrolling backward in `TikTokScrollView`.
- Profile routing fixed (`useParams` now reads `username` not `userId`).

## Remaining / Backlog
- P2: Refactor `/app/backend/server.py` (>13,000 lines) into modular routers under `/app/backend/routes/` + models under `/app/backend/models/` + tests under `/app/backend/tests/`.
- P2: Regenerate missing thumbnails in a one-shot migration (currently done lazily per request).
- P2: Search sub-sections (`TrendingSection`, `DiscoverySection`, `RecommendationsSection`) now route to `/post/:id` (works) — can be refactored to open the viewer in a modal instead of a route for deeper nav stack UX.
- P2: `npx cap sync android` and rebuild APK to verify native behavior end-to-end.

## Key Endpoints
- `GET /api/polls` — main feed list
- `GET /api/users/{user_id}/polls` — user profile grid
- `GET /api/challenges/{challenge_id}/polls` — challenge participants
- `GET /api/polls/{id}` — single poll (used by PostViewerPage)

## Key Files Index
- Frontend pages: `PostViewerPage.jsx`, `ProfilePage.jsx`, `ExplorePage.jsx`, `SearchPage.jsx`, `ActiveChallengesPage.jsx`, `FeedPage.jsx`
- Frontend components: `TikTokScrollView.jsx`, `TikTokProfileGrid.jsx`, `PollThumbnail.jsx`, `LayoutRenderer.jsx`
- Frontend services: `pollService.js`, `uploadService.js`, `resolveAssetUrl.js`
- Backend: `server.py` (monolith), `video_optimizer.py`, `fast_upload_endpoints.py`
