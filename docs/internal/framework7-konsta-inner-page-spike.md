# Framework7 + Konsta Inner-Page Decision Spike

Status: planned
Scope: frontend UI architecture

## Decision

Framework7 remains the owner of app root, page shell, navigation, navbar, tabbar, route transitions, gestures, sheets, dialogs, and native app runtime behavior.

Konsta is optional. It may return only as an inner-page component kit if a measured spike proves it improves quality without duplicating Framework7 ownership.

## Current repo state

The frontend currently has Framework7 and Framework7 Vue installed. Konsta is not present in the active package dependencies or tracked source. The app root, top bar, and tab bar are already Framework7-based.

## Allowed Konsta scope

Konsta may be tested only for inner-page UI behind Memory semantic wrappers:

- simple buttons
- cards
- chips
- badges
- small blocks
- inner form rows
- inner toggles
- simple content rows

Konsta must not own:

- app root
- page root
- routing shell
- navbar
- tabbar
- toolbar
- primary sheets/dialogs/popovers
- route transitions
- navigation gestures

## Spike surfaces

Test exactly three surfaces:

1. Settings grouped list
2. Explore tag/person rows
3. Composer or form controls

Do not change feed, stories, messages, routing, auth, or API behavior during this spike.

## Rules

- Re-add Konsta only on a spike branch.
- Keep Framework7 shell untouched.
- Import Konsta only inside semantic wrappers.
- Do not import Konsta directly from route views.
- Keep Iconoir behind `AppIcon`.
- Keep native emoji and keyboard behavior unchanged.
- Keep platform profile behavior unchanged.

## Comparison criteria

Score each surface from 1 to 5 for:

- native visual quality on iOS
- native visual quality on Android
- code simplicity
- accessibility
- theme compatibility
- bundle impact
- test stability
- fit with semantic architecture

## Required checks

```sh
cd frontend
bun install
bun run type-check
bun run build
bun run test:unit
```

Manual checks:

- iPhone or iOS simulator
- Android or Android emulator
- desktop narrow viewport
- keyboard navigation
- reduced motion where practical

## Accept Konsta only if

- it reduces custom Tailwind markup
- it improves native visual quality
- it does not duplicate Framework7 shell ownership
- it does not introduce theme conflicts
- it passes typecheck/build/tests
- it stays behind semantic wrappers

## Reject Konsta if

- Framework7 semantic wrappers match or exceed it
- it increases styling inconsistency
- it requires route-level imports
- it adds duplicate shell concepts
- bundle cost is not justified
- tests or build stability worsen

## Accepted architecture

```txt
Framework7 = shell, navigation, gestures, app runtime
Konsta = optional inner-page primitives behind semantic wrappers
Iconoir = AppIcon fallback
Capacitor = native/PWA capability layer
Tailwind = tokens and layout utilities only
```

## Rejected architecture

```txt
Framework7 = shell, navigation, gestures, app runtime, inner-page primitives
Iconoir = AppIcon fallback
Capacitor = native/PWA capability layer
Tailwind = tokens and layout utilities only
```
