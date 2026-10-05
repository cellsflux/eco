# CellsFlux — Authentification complète (backend + frontend)

## Ce qui a été corrigé / ajouté

Le composant `AuthCard` que tu avais était 100% démo : `fakeAuthenticateAndGenerateCode`
générait un faux code et un faux user, sans backend derrière. Voici ce qui a changé :

1. **Backend Node.js/Express/Mongoose** (`cellsflux-backend/`) — infra d'auth réelle :
   signup, vérification OTP par email, renvoi OTP, login (avec OTP en 2ème facteur),
   forgot/reset password, login Google, login Apple, refresh/rotation de session,
   logout.
2. **Frontend Next.js** (`cellsflux-frontend/`) — toutes les routes `/api/auth/*`
   sont des **Route Handlers serveur** (`app/api/auth/.../route.ts`) qui font le pont
   vers le backend. Le client (`AuthCard`, `OtpScreen`, etc.) n'appelle jamais le
   backend directement : il appelle `/api/auth/...` sur son propre domaine. C'est ce
   que tu demandais par "toutes les API doivent être dans le server component" —
   l'URL du backend, les cookies httpOnly et tout secret restent côté serveur.
3. **Écrans manquants créés** : `OtpScreen`, `ForgotPasswordScreen`,
   `ResetPasswordScreen`, orchestrés par `AuthFlow`.
4. **Google / Apple réellement câblés** côté web (Google Identity Services +
   Sign in with Apple JS), avec vérification du token côté backend (jamais de
   confiance dans un email/nom envoyé "en clair" par le client).
5. Le flow OAuth "maison" pour Electron/Scool Manager (client_id, redirect_uri,
   code_challenge, state → redirection deep link) est conservé, mais branché sur
   une vraie session au lieu du payload de démo.

## Installation backend

```bash
cd cellsflux-backend
npm install
cp .env.example .env
# éditer .env : MONGO_URI, secrets JWT, SMTP, GOOGLE_CLIENT_ID, APPLE_CLIENT_ID
npm run dev
```

Le serveur écoute sur `http://localhost:4000`, health check sur `/health`.

## Installation frontend

Dans ton projet Next.js existant :

1. Copier `context/`, `components/`, `lib/`, et les routes `app/api/auth/*` fournis
   dans `cellsflux-frontend/`.
2. Copier `app/page.tsx` et `app/reset-password/page.tsx` (ou adapter tes routes
   existantes pour utiliser `<AuthFlow />` / `<ResetPasswordScreen />`).
3. Fusionner `app/layout-snippet.tsx` dans ton `app/layout.tsx` : il faut wrapper
   toute l'app dans `<AuthProvider>`.
4. Ajouter dans ton `.env.local` :

```bash
BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
NEXT_PUBLIC_APPLE_CLIENT_ID=com.cellsflux.app
NEXT_PUBLIC_APPLE_REDIRECT_URI=https://ton-domaine.com
```

`BACKEND_URL` n'a pas de préfixe `NEXT_PUBLIC_` : il n'est utilisé que côté
serveur dans `lib/backend.ts`, jamais envoyé au navigateur.

## Le workflow complet

**Inscription** : `AuthCard` (sign up) → `POST /api/auth/signup` → backend crée
l'utilisateur (non vérifié), génère un OTP à 6 chiffres, l'envoie par email
(Nodemailer) → `OtpScreen` (purpose "signup") → `POST /api/auth/verify-otp` →
email marqué vérifié + session ouverte (access token + cookie httpOnly refresh).

**Connexion** : `AuthCard` (sign in) → `POST /api/auth/login` vérifie le mot de
passe → si OK, un OTP est envoyé comme 2ème facteur → `OtpScreen` (purpose
"login") → `POST /api/auth/verify-otp` → session ouverte.

**Mot de passe oublié** : `ForgotPasswordScreen` → `POST /api/auth/forgot-password`
→ email avec un lien `https://.../reset-password?email=...&token=...` (token
opaque, hashé en base, expire en 30 min) → `ResetPasswordScreen` lit `email`/`token`
depuis l'URL → `POST /api/auth/reset-password` → toutes les sessions actives de
l'utilisateur sont révoquées par sécurité.

**Google / Apple** : boutons dans `AuthCard` → SDK web officiel côté client →
`idToken` / `identityToken` envoyé à `/api/auth/google` ou `/api/auth/apple` →
le backend vérifie la signature du token auprès de Google/Apple (jamais de
confiance dans des données envoyées en clair) → compte créé ou lié → session
ouverte directement, sans étape OTP (l'email est déjà vérifié par le provider).

**Session / refresh** : le refresh token n'est jamais lisible en JS (cookie
`httpOnly`, `path=/api/auth`). Au chargement de l'app, `AuthProvider` appelle
`/api/auth/refresh` pour restaurer silencieusement la session. La rotation des
refresh tokens inclut une fenêtre de grâce de 10s pour absorber les appels
concurrents — c'est directement la correction du bug que tu avais eu où
`compareOTP()` était appelée à la place de `compareRefreshToken()` et révoquait
toutes les sessions : les deux méthodes sont maintenant sur des modèles
différents (`User` vs `RefreshToken`) et ne peuvent plus être confondues.

## Sécurité déjà en place

- Mots de passe hashés avec bcrypt (12 rounds), OTP et tokens de reset hashés
  aussi (jamais stockés en clair).
- Rate limiting sur signup/login/otp/reset (15 req / 10 min / IP).
- Réponses identiques que l'email existe ou non sur `forgot-password` et
  `resend-otp`, pour éviter l'énumération de comptes.
- Cooldown de renvoi d'OTP (45s) + nombre max de tentatives (5) avant blocage.
- Toutes les sessions révoquées automatiquement après un reset de mot de passe.
