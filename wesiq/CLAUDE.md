# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Wesiq is an Expo (SDK 58) / React Native 0.88 app (iOS, Android, web) for a fitness community: a social feed, posts, chat, training plans/activity tracking with heart-rate monitoring, a blog, profiles and subscriptions. The Expo project lives in `wesiq/` (the git root one level up only holds `LICENSE` and `.gitignore`). All commands below run from `wesiq/`.

Expo APIs change between SDKs — check the versioned docs for the installed SDK (https://docs.expo.dev/versions/v58.0.0/) rather than relying on memory. (`AGENTS.md` still points to v54, which is outdated.)

## Commands

```bash
npm install
npm start            # expo start (dev server)
npm run android      # expo start --android
npm run ios          # expo start --ios
npm run web          # expo start --web
npm run lint         # expo lint (eslint-config-expo flat config, includes React Compiler rules)
npm run typecheck    # tsc --noEmit (strict mode)
EXPO_PUBLIC_USE_MOCKS=1 npm run web   # run with mock data (development builds only)
```

There is no test suite. `/dev/ui-kit` is a development-only gallery of the shared UI components (redirects home in production). The app uses native modules (BLE, HealthKit, Health Connect, RevenueCat, `expo-dev-client`), so most features require a development build, not Expo Go. EAS profiles (`development`, `preview`, `production`) are in `eas.json`. `/ios` and `/android` are generated and git-ignored.

## Architecture

**Routing (expo-router, typed routes, React Compiler enabled).**
- `app/_layout.tsx` is the root `Stack`. It installs the mock API (when enabled), loads the brand fonts, wraps everything in `LoggedInUserProvider` and a dark React Navigation theme, and holds the splash screen until the user and fonts are loaded. Inside the provider it links RevenueCat to the logged-in user (`syncPurchasesUser` in `lib/purchases.ts`, skipped while the API keys are placeholders) and runs `hooks/useNotificationSocket.ts`, which opens `/ws/notifications/?token=…` on login, closes it on logout, reconnects after drops and schedules a local notification for new chat messages unless that chat is open.
- `app/(tabs)/_layout.tsx` is the one permanent bottom tab bar: Home (`index`), `chat`, `activity`, `blog` and Profile (`me`, opens the login sheet when logged out). `chat`, `activity` and `blog` are folders with their own native `Stack` (`initialRouteName: "index"`), so detail screens (`chat/[username]`, `blog/[article]`, `activity/new|edit|copy`) push inside the tab with a back button.
- Screens outside the tabs live in the root stack: `post/[post_id]`, `profile/[username]`, `users` (find people), `subscribe`, `(auth)/password-reset`, `dev/ui-kit`.
- Every file in `app/` becomes a route, so don't put non-route modules there.
- `app/(auth)/password-reset.tsx` handles the `https://wesiq.com/password-reset` deep link (configured in `app.json`).

**Backend / auth.** The API is the Django project `native-api` (`constants/general.ts` → `https://wesiq.com/native-api`, endpoints end with a trailing slash; the backend source is in `~/Desktop/wesiq-django`, `app/api/views.py`). Every response is an envelope `{ success, message, ...payload }`.
- New code calls `apiRequest`/`apiGet`/`apiPost` from `lib/api/client.ts`. It adds the bearer token (`user_token` in AsyncStorage), handles timeouts and cancellation, validates payloads with guards from `lib/api/guards.ts`, and returns `ApiResult<T>` (`{ ok: true, data } | { ok: false, error }`) instead of throwing. A 401 clears the token and notifies `onUnauthorized` listeners (the logged-in user context logs out).
- Load screen data with `hooks/useApiQuery.ts` (keyed, cancels stale requests, `refetch` for pull-to-refresh, `setData` for optimistic updates). It never calls `setState` synchronously in an effect, which the React Compiler lint rule rejects.
- Many older components still call `fetch` directly; migrate them to the client when you touch them.
- Domain models live in `types/models.ts` and mirror the server serializers (snake_case). Post IDs are public string IDs. Older components still declare local copies of these types.
- Mock mode: `EXPO_PUBLIC_USE_MOCKS=1` in a development build makes `lib/api/mocks/install.ts` intercept every `fetch` to the API and answer from `lib/api/mocks/handlers.ts` + `data.ts`. Unknown GETs return 404 so missing mocks are visible.
- `lib/storage.ts` holds the typed AsyncStorage keys.

**Components.** Feature components live in `components/features/<feature>/` (activity, auth, account, chat, posts, profile, training-plan, upload-post) and use `components/ui`; a few older components remain in `components/pages/` (e.g. `community/DynamicVideo`, `activity/CustomVideoControls`, `articles/front_lever`). Route files in `app/` are mostly thin and compose these. Platform-specific variants use the `.web.tsx` / `.ios.tsx` suffix (e.g. `ImageViewer.web.tsx`).

**Training plans.** The server stores a plan as one `TrainingPlan` row per exercise sharing `training_plan_key`; `type` is the plan title, `periods` the value of each set, `day` 0 = Sunday. The new / edit / copy tabs under `app/(tabs)/activity/` all use `components/features/training-plan/TrainingPlanEditor`; `model.ts` converts rows ↔ the editor draft (grouped sets) and validates, `useTrainingPlanEditor` is the reducer. Saving posts the rows to `manage-training-plan/` (edit sends `edited_training_plan` with the same key, which replaces the plan). Screens that stay mounted reload via `onAppEvent("training_plans_changed")` from `lib/events.ts`.

**Activity.** `app/(tabs)/activity/index.tsx` composes `components/features/activity`: `useActivityTimer` (wall-clock stopwatch), `useWorkoutSession` (reducer for exercise → sets → break → finish), `xp.ts` (XP formula and daily challenge rules keyed by the server `data` field; time/XP challenges complete on the device while recording). `ActivityScroll` / `TaskList` have `.web.tsx` variants because the nestable draggable list needs `findNodeHandle`, which web lacks.

**Heart rate.** `classes/HeartRate.ts` has `HeartRateManager`, which switches between `HeartRateProvider` implementations: `TEST`, `BLE` (react-native-ble-plx), `APPLE_HEALTH` (react-native-health) and `HEALTH_CONNECT` (Android).

**Design system (dark mode only, no light theme).**
- Tokens live in `theme/` (`colors`, `spacing`, `radii`, `layout`, `shadows`, `typography`). Use semantic color names (`colors.surface`, `colors.text_secondary`, `colors.primary_solid` for filled buttons). Text colors are checked for WCAG AA contrast.
- UI text uses the system font; Bungee is only for the wordmark and Orbitron only for timers.
- `constants/colors.ts` is a legacy alias of the tokens kept for unmigrated screens; don't use it in new code.
- Shared components are exported from `components/ui` (`Screen`, `Header`, `Text`, `Button`, `IconButton`, `Card`, `Avatar`, `TextField`, `Chip`, `SegmentedControl`, `Stepper`, `Sheet`, `UserRow`, `EmptyState`, `ErrorState`, `Skeleton`).
- `Screen` handles safe areas, keyboard avoidance, pull-to-refresh and a pinned footer. `Sheet` is the standard dialog: a bottom sheet on phones and a centered dialog at 700px and wider. `Sheet` resets the VirtualizedList context (`ListContextReset`), so a `FlatList` inside a sheet scrolls on its own even when the sheet is opened from a feed item; pass `is_scrollable={false}` when the sheet's child is a list.
- `Icon` takes typed FontAwesome 6 names.
- Use `lib/alert.ts` (`showAlert`, `confirmAction`) instead of `Alert.alert`, which does nothing on web. Use `lib/haptics.ts` for haptic feedback and `lib/media.ts` for media URLs.
- Notifications go through `lib/notifications.ts`. Never ask for the permission at launch: ask in context (`requestNotificationPermission`, e.g. the chat list prompt or when a workout break starts).
- Store links: `lib/legal.ts` (`openLegalPage("privacy" | "terms")`). iOS permission texts live in `app.json` plugins and are localized in `locales/native/`.

**Animation and gestures.** Use Reanimated shared values with `.get()`/`.set()` (not `.value`) inside gesture callbacks and components; the React Compiler flags `.value` writes. Use `scheduleOnRN` from `react-native-worklets` to call JS from worklets. Gesture Handler is v3: use the hook API (`usePanGesture`, …) with `GestureDetector`; `Gesture.Pan()` is deprecated. Content inside a `Modal` needs its own `GestureHandlerRootView`.

Imports use the `@/` alias for the project root.

## i18n

`lib/i18n.ts` sets up i18next with 9 locales in `locales/` (en, sk, cs, de, es, fr, uk, ru, pt_BR). The language comes from the device locale, overridden by the saved AsyncStorage key `app_language`.

**Translation keys are the Slovak source strings themselves**, e.g. `t("Zadajte vaše meno")`. All user-facing strings, including `console.error` messages, go through `t()` (or `i18n.t()` outside components). When you add a string, add the same Slovak key to **every** locale file; they currently all have the same key set.

## Code conventions

- No semicolons, double quotes, 4-space indentation.
- snake_case for variables, state and props (`logged_in_user`, `is_loading`, `setActiveForm`). camelCase for functions, PascalCase for components and types.
- Explicit type annotations on locals and return types (`const pathname:string = …`, `async ():Promise<void> =>`), with no space after the colon.
- Comments are in Title Case English, usually trailing the line: `// Gets The User Token`. Functions get a `// Function For …` comment above them and effects get `// Initializes The …`.
- `catch` blocks start on their own line after the closing brace of `try`, separated by a blank line (same for `else` after multi-line `if` blocks).
