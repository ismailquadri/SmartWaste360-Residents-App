# Project rules

- Preserve published Git history; never force push or rewrite published commits.


- This project is the LAWMA 360 customer app (web rebuild of the Expo app at github.com/ismailquadri/SmartWaste360-Residents-App) and also hosts the cross-app message hub. Why: the Partner Hub and LAWMA workspace have no backend of their own.
- Apps talk only by messages in the `app_messages` table: the customer app uses server functions in `src/lib/hub.functions.ts`; Partner Hub and LAWMA call `/api/public/messages` with an `x-app-key` header matched against `PARTNER_APP_KEY` / `LAWMA_APP_KEY`. The contract lives in `src/lib/hub-contract.ts` and `docs/api-contracts.md`; change both together. Why: each app keeps its own data and stays independently deployable.
- Residents sign in (email and standard Supabase OAuth); each resident's state is one JSON row in `customer_accounts` loaded/saved via `src/lib/account.functions.ts`, and the hub server functions take the customer ID from that row, never from the browser. Why: accounts work across devices and residents can only see their own messages. Inbound messages are applied by the pure `applyInbound` in `src/lib/customer-model.ts`, which owns the pickup hold/settle/return money rules and is covered by `src/test/hub-rules.test.tsx`.
- AI issue reports: `src/lib/report-ai.server.ts` calls the AI Gateway (Responses, structured output with the schema in `src/lib/report-ai.ts`) from the signed-in `draftReport` server function; the resident reviews/edits the draft before it is sent as `issue.reported`. Why: the resident stays in control of what is sent.

- Public presentation mode: the customer UI preserves onboarding and login/signup as a demo journey without credential validation and persists sample data under lawma-customer-demo-v2. Keep demo actions local; server API authentication remains enforced. Do not expose service credentials to the browser.
- Celebrations are genuine waste milestones only (full compound quorum, crew-verified bag handoff), derived purely from the resident model in `src/lib/gamify.ts`; only seen milestone IDs are stored locally. No streaks/XP/habit tasks. Why: rewards must reflect real accountability actions.
- Run `python3 scripts/check-frame-bounds.py` after adding a screen or overlay; overlays must portal into the phone screen via `phonePortal()`. Why: nothing may render outside the mobile mockup.

- Voice agent speech: `src/lib/voice-tts.functions.ts` turns short agent prompts into AI Gateway speech (WAV), with the browser voice as fallback. Why: native-sounding Nigerian voices without hosting a model.
- Compound batch settlement uses the pure all-or-nothing helper in resident-ops and one store update; the caretaker selector is a local demo view, never an authorization grant. Why: avoid partial or duplicate charges without weakening server access.
- Report text and review drafts use validated device storage in presentation mode; media URLs stay in memory with delayed disposal through use-media-undo. Why: offline text survives reload while deleted clips remain playable during undo.
- Payment-sheet demo notices belong outside the scrolling sheet body, and shared sheets portal via phonePortal. Why: notices stay visible and overlays remain inside the mockup.
- Resident localization uses the static catalogue and LanguageProvider; translate only presentation labels/templates, never stored enums, payment values, QR identifiers or resident-authored statements. Why: languages switch offline without mutating business data or making per-use AI calls.
- Language preference restores after hydration and sets document language; the voice dialect initially follows it but remains separately selectable. Why: avoid SSR mismatch and preserve the resident's speaking choice.
- Shared IosSheet/IosActionSheet use Radix dialog focus containment and restore the opening control while portalling through phonePortal. Why: the language chooser and payment dialogs must be keyboard-accessible inside the mockup.
