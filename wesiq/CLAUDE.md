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
npm run lint         # expo lint (eslint-config-expo flat config)
npx tsc --noEmit     # type check (strict mode)
```

There is no test suite. The app uses native modules (BLE, HealthKit, Health Connect, RevenueCat, `expo-dev-client`), so most features require a development build, not Expo Go. EAS profiles (`development`, `preview`, `production`) are in `eas.json`. `/ios` and `/android` are generated and git-ignored.

## Architecture

**Routing (expo-router, typed routes, React Compiler enabled).**
- `app/_layout.tsx` is the root `Stack`. It wraps everything in `LoggedInUserProvider`, holds the splash screen until the user is loaded, configures RevenueCat, requests notification permissions, and opens a global WebSocket (`/ws/notifications/?token=…`) that schedules a local notification for new chat messages unless the user is already in that chat.
- `app/(tabs)/_layout.tsx` is the main bottom tab bar. It hides itself on `/activity`, `/profile`, `/post`, `/chat`, `/blog`, because each of those folders has its **own nested `Tabs` layout** with its own tab bar.
- Those nested layouts include `homepage_dummy.tsx` / `profile_dummy.tsx` screens that render `null`; they exist only as tab buttons whose `tabPress` listener calls `preventDefault()` and navigates elsewhere (e.g. to `/`). Dynamic routes (`[username]`, `[post_id]`, `[article]`) are hidden with `tabBarButton: () => null`. Follow this pattern when adding sections.
- `app/(auth)/password-reset.tsx` handles the `https://wesiq.com/password-reset` deep link (configured in `app.json`).

**Backend / auth.** There is no API client layer; components call `fetch` directly against `API_URL` (`constants/general.ts` → `https://wesiq.com/native-api`, endpoints end with a trailing slash). Auth is a bearer token stored in AsyncStorage under `user_token` and read per request. `contexts/LoggedInUserContext.tsx` exposes `logged_in_user`, `setLoggedInUser`, `refreshLoggedInUser` and `is_loading`; a 401 clears the token. Response/request types are declared and exported next to the component that uses them (e.g. `LoggedInUser` from `components/LoginFormDialog.tsx`, `ChatSocketResponse` from `app/(tabs)/chat/[username].tsx`).

**Components.** Shared components are in `components/`; page-specific ones are in `components/pages/<feature>/` (activity, blog, chat, community, manage_training_plans, post, profile, subscribe, …). Route files in `app/` are mostly thin and compose these. Platform-specific variants use the `.web.tsx` / `.ios.tsx` suffix (e.g. `ImageViewer.web.tsx`).

**Heart rate.** `classes/HeartRate.ts` has `HeartRateManager`, which switches between `HeartRateProvider` implementations: `TEST`, `BLE` (react-native-ble-plx), `APPLE_HEALTH` (react-native-health) and `HEALTH_CONNECT` (Android).

**Styling.** Use the design tokens in `constants/` (`colors.ts` with `transparentize()`, `fonts.ts`, `borders.ts`, `dimensions.ts`). Fonts (Bungee, Poppins, Balsamiq Sans, Orbitron) are loaded in the tabs layout. `constants/theme.ts`, `themed-*`, `parallax-scroll-view`, `hello-wave` are leftovers from the Expo template. Imports use the `@/` alias for the project root.

## i18n

`app/i18n.ts` sets up i18next with 9 locales in `app/locales/` (en, sk, cs, de, es, fr, uk, ru, pt_BR). The language comes from the device locale, overridden by the saved AsyncStorage key `app_language`.

**Translation keys are the Slovak source strings themselves**, e.g. `t("Zadajte vaše meno")`. All user-facing strings, including `console.error` messages, go through `t()` (or `i18n.t()` outside components). When you add a string, add the same Slovak key to **every** locale file; they currently all have the same key set.

## Code conventions

- No semicolons, double quotes, 4-space indentation.
- snake_case for variables, state and props (`logged_in_user`, `is_loading`, `setActiveForm`). camelCase for functions, PascalCase for components and types.
- Explicit type annotations on locals and return types (`const pathname:string = …`, `async ():Promise<void> =>`), with no space after the colon.
- Comments are in Title Case English, usually trailing the line: `// Gets The User Token`. Functions get a `// Function For …` comment above them and effects get `// Initializes The …`.
- `catch` blocks start on their own line after the closing brace of `try`, separated by a blank line (same for `else` after multi-line `if` blocks).
