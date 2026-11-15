# In-app notification provider for Cadence

Accessed: 2026-11-15. Pricing pages change often, so re-check them before committing.

## Question

Which third-party in-app notification provider fits Cadence? We need a bell and an inbox, and building our own is out of scope. Cadence is a React Router 8 app in framework mode, with SSR and Node loaders/actions. It also uses React 19, Tailwind v4/shadcn and SQLite/Drizzle, and it sells video courses.

## Short answer

**Novu** is the best fit, and **Knock** is a close second.

- **Styling:** Novu's drop-in `<Inbox>` takes Tailwind utility classes on each element through `appearance.elements`. That makes matching shadcn easy.
- **React 19:** Novu documents React 19 support explicitly.
- **Bulk actions:** `readAll`, `seenAll`, `archiveAll` and `archiveAllRead` are built in.
- **Real-time:** Updates arrive over a WebSocket.
- **Auth:** HMAC-SHA256 `subscriberHash`, which is one line of Node `crypto` in a loader.
- **Self-hosting:** The core is MIT open source.
- **Cost:** Free covers 10k workflow runs/month, and the first paid tier is $30/month.

Knock is the more mature choice for auth (RS256 user tokens) and feed retention (unlimited). However, it styles through CSS variables and `rnf-` classes, not Tailwind classes, and its first paid tier is $250/month.

## Comparison

| Criterion | Novu | Knock | Courier | MagicBell | SuprSend |
|---|---|---|---|---|---|
| Drop-in bell + inbox | Yes, `<Inbox>` [N1] | Yes, `NotificationIconButton` + `NotificationFeedPopover` [K1] | Yes, `<CourierInbox>` / `<CourierInboxPopupMenu>` [C2] | Yes, `FloatingInbox` / `Inbox` [M1] | Yes, `Inbox` popover [S1] |
| Headless hooks | Yes, `@novu/react` hooks [N1][N3] | Yes [K1][K3] | Yes, `useCourier()` [C2] | Not documented on React page [M1] | Yes, `useFeedClient` / `useFeedData` [S2] |
| Styling | `appearance` prop: variables, elements accept **Tailwind classes**, CSS modules, callbacks [N4] | CSS variables `--rnf-*`, unique `rnf-` classes, `renderItem` [K4] | Theme objects plus render slots (`renderListItem`, `renderHeader`, ...) [C2][C4] | Importable stylesheet, CSS vars `--magicbell-*`, class selectors [M1] | `theme` prop, swap bell/badge/card components [S1] |
| React 19 | Documented as supported [N1][N3] | Peer dep `^17 \|\| ^18 \|\| ^19` [K5] | Peer dep `react >=18.0.0`, 19 not mentioned [C3] | Not verified (no peer deps in npm metadata) [M5] | Peer dep `react >= 16.8.0` [S5] |
| States | read, seen, archived, snoozed [N5] | seen, read, interacted, archived (+ un-*) [K2][K6] | read, opened, archived [C1][C2] | read/unread, seen, archived (API) [M2][M3] | seen, read, archive mentioned [S2] |
| Mark all read | `readAll`, `seenAll`, `archiveAll`, `archiveAllRead` [N5] | No client `markAllAsRead`. Pass item list to `markAsRead`, or server bulk endpoint [K4][K6][K7] | `inbox.readAllMessages()` (React); archive-all only in Web Components [C4] | API: mark all read/seen, archive all [M3] | Built-in header "Mark all as read" [S1] |
| Real-time | WebSocket (`socketUrl: wss://...`) [N2] | WebSocket [K2][K6] | WebSocket via `inbox.listenForUpdates()` [C2] | "Persistent connection", transport not stated [M2] | Feed socket (`socketHost`) [S1] |
| Node trigger | `@novu/api` `novu.trigger()` [N6] | `@knocklabs/node` `workflows.trigger()` [K8] | `@trycourier/courier` `send.message()` [C6] | `magicbell-js` project-client `createBroadcast` [M4] | Node SDK exists [S4]; exact API not verified |
| User auth | HMAC-SHA256 `subscriberHash` [N2] | RS256 JWT user token, `signUserToken` in Node SDK ("enhanced security mode") [K9] | Scoped JWT from `POST /auth/issue-token` [C5] | HS256 User JWT signed with project secret [M6] | ES256 signed JWT user token [S3] |
| Free tier | 10k workflow runs/mo, 5 workflows, 24h activity retention, branding not removable [N7][N2] | 10k messages/mo, unlimited feed retention, Knock branding [K10] | 10k sends/mo [C7] | 1,000 deliveries/mo [M7] | 10k notifications/mo, branded feed [S6] |
| First paid tier | Pro from $30/mo (30k runs) [N7] | Starter $250/mo (50k msgs, $0.005 overage) [K10] | Business $0.005/send, pay-as-you-go [C7] | Startup $249/mo (50k) [M7] | Essentials $100/mo (50k) [S6] |
| Self-hostable | Yes. MIT core [N8], self-host docs [N9]. Pricing lists "Self-hosted (Enterprise)" [N7] | Not mentioned [K10] | Not mentioned [C7] | Not mentioned [M7] | Enterprise only [S6] |
| Email/push later | Email, SMS, Push, Chat [N8] | Email, push, SMS, chat, webhook [K11] | Yes. One "send" covers all channels [C7] | Email, mobile push, web push, SMS, Slack [M2] | Unlimited channels, bring your own email/SMS provider [S6] |

### Notes on the table

- **Billing units differ.**
  - Knock counts "a single message delivered to a single user on a single channel" [K10]. Adding email later therefore doubles usage.
  - Courier counts one send per recipient "regardless of how many channels it uses" [C7].
  - Novu counts workflow runs [N7].
- **Novu free-plan limits.** Free has only 5 workflows and 24h activity retention [N7]. Branding removal is paid-only [N2]. The pricing table's inbox feed retention row was ambiguous, so it is **not verified**.
- **Novu self-hosting.** Self-hosting needs MongoDB and Redis, plus separate API, Worker and WS services [N9]. Some cloud-only features, including some Inbox features, are missing [N9]. For Cadence this is a fallback, not a plan.
- **Server code in React Router.** All the Node SDKs are plain server packages, so they work in a loader or action. Do user-token or HMAC signing in the root loader and pass the result to the client. None of the vendors document React Router specifically. That is an inference, **not verified**.

## Per-provider detail

### Novu
- `@novu/react` needs React 18 or later, and "React 19 is also supported" [N1][N3]. There is a drop-in `<Inbox>` and headless hooks [N1].
- **Styling:** The `appearance` prop takes `baseTheme`, `variables`, `elements`, `icons` and `animations`. Each element value can be "a style object or a set of CSS classes", Tailwind included. Callbacks receive the unread count and notification data [N4].
- **`useNotifications`:** Notifications expose `isRead`, `isSeen`, `isArchived` and `isSnoozed`. Per-item methods are `read`, `archive` and `snooze`, and bulk methods are `readAll`, `seenAll`, `archiveAll` and `archiveAllRead` [N5].
- **Auth:** HMAC is `HMAC-SHA256(secretKey, subscriberId)` as hex. If HMAC is enabled and the hash is missing, the Inbox won't load [N2].
- **Server:** Trigger with `new Novu({ secretKey }).trigger({ workflowId, to: { subscriberId }, payload })` [N6].

### Knock
- `@knocklabs/react` has prebuilt components plus "a complete set of React hooks" [K1]. Peer deps cover React 17, 18 and 19 [K5].
- **Styling:** Import `@knocklabs/react/dist/index.css` [K3]. Override `--rnf-` CSS variables or replace the CSS entirely using the unique `rnf-` classes. There is a `renderItem` prop and `colorMode="dark"` [K4]. No Tailwind guidance.
- **State methods:** `markAsSeen`, `markAsRead` and `markAsArchived` take one item or many, and each has an un-* inverse. The feed marks items seen when the popover opens [K4][K6].
- **Bulk updates:** The server-side bulk endpoint is `POST /v1/channels/{channel_id}/messages/bulk/{action}` [K7].
- **Auth:** Without enhanced security, "a request with your public key can act as any user". Production should enable it, using RS256 JWTs from `signUserToken` (`@knocklabs/node`) [K9].
- **Strengths:** Unlimited feed retention on Free [K10].

### Courier
- `@trycourier/courier-react` v9 has a peer dep of `react >=18.0.0` [C3]. React 19 is not stated in the docs [C2].
- **Customization:** Theme objects plus render slots for header, list item, empty/loading/error states and the menu button [C4].
- **Real-time:** Call `inbox.listenForUpdates()` to open the WebSocket. Without it, the inbox "loads once and doesn't update again" [C2].
- **Auth:** A scoped JWT with `user_id:<id> inbox:read:messages inbox:write:events`. Always set `expires_in`, because tokens without it "never expire" [C5].
- **Pricing:** Business charges $0.005 for every send, including the first 10k [C7].

### MagicBell
- `@magicbell/react` provides `ContextProvider`, `Inbox` and `FloatingInbox`, and authenticates with a User JWT [M1]. The JWT is HS256-signed with the project Secret Key, using claims `user_external_id`/`user_email` and `api_key` [M6].
- **Gaps:** The real-time transport and React 19 support are **not verified** [M2][M5].
- **Free tier:** Only 1,000 deliveries/mo, the smallest here [M7].

### SuprSend
- `@suprsend/react` (the old `@suprsend/react-inbox` is no longer supported) offers drop-in and headless options [S1][S2].
- **Auth:** ES256 JWT user tokens with a `refreshUserToken` callback, under enhanced security mode [S3].
- **Free tier:** 10k/mo with a branded feed. Essentials is $100/mo, and self-hosting is Enterprise only [S6].

### Engagespot (not evaluated)
- I could not reach Engagespot's own pages. `engagespot.co/pricing` returned 404, `engagespot.com` failed TLS, and `docs.engagespot.co/docs/` returned 404.
- Only third-party aggregators were available, and they claim 10k triggers free and $250/mo Growth. Those figures are **not verified from a primary source** and are excluded.

## Recommendation and trade-offs

**Use Novu.**
- It has the shortest path to a shadcn-consistent bell: Tailwind classes go straight into `appearance.elements` [N4].
- React 19 support is documented [N1].
- First-class bulk actions cover "mark all read" with no custom code [N5].
- WebSocket delivery [N2], a Node `trigger()` [N6] and HMAC auth [N2] slot into a React Router root loader.
- The price steps up gently: $0 to $30/mo [N7], with an MIT self-host escape hatch [N8].

Trade-offs to accept:
- **Free-plan caps.** 5 workflows and 24h activity-log retention on Free. Branding can't be removed until you pay [N7][N2].
- **Auth model.** HMAC on a static subscriber ID never expires. Knock's, Courier's and SuprSend's JWTs do [K9][C5][S3].
- **Hosting.** Self-hosting is heavy (MongoDB, Redis, multiple services) [N9].

Pick **Knock** instead if these matter more than Tailwind-native styling and the $250/mo first paid step [K10]:
- expiring signed tokens
- unlimited feed retention
- a mature server-side bulk-status API

Avoid **MagicBell** for now because of its small free tier (1k) and unverified details.

## Sources

Novu
- [N1] https://docs.novu.co/platform/inbox/overview
- [N2] https://docs.novu.co/platform/inbox/prepare-for-production
- [N3] https://docs.novu.co/platform/sdks/react
- [N4] https://docs.novu.co/platform/inbox/configuration/styling
- [N5] https://docs.novu.co/platform/sdks/react/hooks/use-notifications
- [N6] https://docs.novu.co/platform/sdks/server/typescript
- [N7] https://novu.co/pricing
- [N8] https://github.com/novuhq/novu
- [N9] https://docs.novu.co/community/self-hosting-novu/overview

Knock
- [K1] https://docs.knock.app/in-app-ui/react/overview
- [K2] https://docs.knock.app/in-app-ui/feeds/overview
- [K3] https://github.com/knocklabs/javascript/blob/main/packages/react/README.md
- [K4] https://docs.knock.app/in-app-ui/react/feed
- [K5] https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react/package.json
- [K6] https://raw.githubusercontent.com/knocklabs/javascript/main/packages/client/README.md
- [K7] https://docs.knock.app/api-reference/channels/bulk/update_message_status
- [K8] https://github.com/knocklabs/knock-node
- [K9] https://docs.knock.app/in-app-ui/security-and-authentication
- [K10] https://knock.app/pricing
- [K11] https://docs.knock.app/concepts/channels

Courier
- [C1] https://www.courier.com/docs/platform/inbox/inbox-overview
- [C2] https://www.courier.com/docs/sdk-libraries/courier-react-web.md
- [C3] https://raw.githubusercontent.com/trycourier/courier-web/main/@trycourier/courier-react/package.json
- [C4] https://www.courier.com/docs/in-app/build-a-custom-inbox.md
- [C5] https://www.courier.com/docs/in-app/authenticate-users.md
- [C6] https://github.com/trycourier/courier-node
- [C7] https://www.courier.com/pricing

MagicBell
- [M1] https://www.magicbell.com/docs/libraries/magicbell-react
- [M2] https://www.magicbell.com/docs/channels/in_app
- [M3] https://www.magicbell.com/docs/api/reference
- [M4] https://www.magicbell.com/docs/libraries/magicbell-js
- [M5] https://registry.npmjs.org/@magicbell/react/latest
- [M6] https://www.magicbell.com/docs/api/authentication/user
- [M7] https://www.magicbell.com/pricing

SuprSend
- [S1] https://docs.suprsend.com/docs/react-in-app-feed.md
- [S2] https://docs.suprsend.com/docs/react-sdk-headless-feed.md
- [S3] https://docs.suprsend.com/docs/client-authentication
- [S4] https://docs.suprsend.com/reference/overview.md
- [S5] https://registry.npmjs.org/@suprsend/react/latest
- [S6] https://www.suprsend.com/pricing
