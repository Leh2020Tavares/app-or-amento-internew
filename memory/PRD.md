# PRD — INTERNEW Orçamentos

## Problem Statement (original, PT-BR)
App compatível com Play Store e App Store para a empresa INTERNEW Tecnologia em Saúde (locação e venda de equipamentos médicos, acessórios e consumíveis). O cliente acessa (por link do WhatsApp ou direto no app) e faz um orçamento informando seus dados, endereço, local de entrega, produto, quantidade, unidade, especificação e prazo de entrega. A empresa responde os orçamentos no mesmo app (versão web e mobile).

## Company context
- INTERNEW Tecnologia em Saúde — 33+ anos, sede em Santa Catarina, atuação no RJ e outros estados, setores público e privado.
- Brand colors: Strong blue (#0D47A1) primary, moss green (#388E3C) secondary. Temporary "iN" logo — client will send real emblem.

## User personas
- **Cliente (público)**: solicita orçamento sem login; acompanha por código.
- **Empresa/Admin**: faz login, gerencia e responde orçamentos.

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT bearer auth (passlib bcrypt). Admin auto-seeded on startup.
- Frontend: Expo Router (SDK 54), react-native-keyboard-controller, expo-image, expo-linear-gradient, custom Toast.
- Routes: `/` quote form, `/success`, `/track`, `/login`, `/dashboard`, `/quote/[id]`, `/settings`.

## API
- Public: GET /api/company, POST /api/quotes, GET /api/quotes/track/{code}
- Auth: POST /api/auth/login, GET /api/auth/me
- Admin: GET /api/admin/quotes (+status_filter), GET /api/admin/quotes/stats, GET /api/admin/quotes/{id}, POST /api/admin/quotes/{id}/reply, PUT /api/admin/company

## Credentials
- Admin: admin@internew.com.br / Internew@2026 (see /app/memory/test_credentials.md)

## Implemented (2026-06-22)
- Public quote form with all fields + Locação/Venda + categoria; WhatsApp CTA; tracking code.
- Success screen with tracking code; Track screen showing status + in-app reply.
- Company JWT login; Dashboard with stats + filter chips + list; Quote detail with reply (save + respond via WhatsApp).
- Company settings screen (editable WhatsApp/contact/about).
- Tested: 16/16 backend pass, all frontend flows pass.

## Implemented (2026-06-23) — Social login
- Auth refactored to session-token model (Bearer from `user_sessions`). Coexists with email/password.
- Login options: Google (iOS/Android/web, Emergent-managed), Apple (iOS only, native), email/password.
- Role by email allowlist `ADMIN_EMAILS`: company_admin → /dashboard; customer → /my-quotes.
- New `/my-quotes` screen: customers see only their own quotes (linked by user_id/email).
- Logged-in customers' quote submissions auto-link to their account.
- Endpoints added: POST /api/auth/session (Google), POST /api/auth/apple, POST /api/auth/logout, GET /api/my/quotes.
- app.json: `ios.usesAppleSignIn: true` + `expo-apple-authentication` plugin.
- Tested: 22/22 backend pass; login → dashboard verified.
- NOTE: Apple button/flow only works on a real iOS device with a published build (not Expo Go / web / Android).

## Backlog
- P1: Replace temporary logo with client's real emblem.
- P1: Deep link config so a WhatsApp link opens the form directly (custom scheme / universal link).
- P2: Email/WhatsApp auto-notify company on new quote.
- P2: PDF/export of a quote; multi-item quotes.
- P2: Search/sort on dashboard.
