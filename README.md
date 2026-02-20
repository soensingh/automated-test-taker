# Automated Test Taker

Next.js app with:
- Base route login page (`/`)
- Google OAuth login
- Email + OTP login (no password input)
- JWT-backed session + custom signed JWT token
- OTP hashing with bcrypt (`10` rounds + salt)
- MongoDB persistence
- Users model with roles (`superadmin`, `admin`, `student`)
- Nodemailer OTP delivery
- Protected role dashboards (`/dashboard/superadmin`, `/dashboard/admin`, `/dashboard/student`)
- Docker-ready build setup

## 1) Environment setup

1. Copy `.env.example` to `.env`
2. Fill all required values

```bash
cp .env.example .env
```

Important vars:
- `AUTH_SECRET`, `JWT_SECRET`
- `SUPER_ADMIN_EMAIL` (defaults to `soensingh.techcadd@gmail.com`)
- `MONGODB_URI`, `MONGODB_DB_NAME`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (optional but needed for Google button)
- `SMTP_*` values for OTP email
- `NEXT_PUBLIC_API_BASE_URL` and optional per-API URLs

## 2) Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 3) Auth flow

- `/` shows login screen
- **Google login** uses NextAuth Google provider
- **Email OTP login**:
  1. Enter email
  2. Click `Send OTP`
  3. Enter received OTP
  4. Login to `/dashboard`

Role behavior:
- `SUPER_ADMIN_EMAIL` is always persisted as `superadmin` in MongoDB
- The same account gets the same role whether login happens via Google or OTP
- New non-superadmin users default to `student`

OTP is stored hashed using bcrypt with `10` rounds.

## 4) API routes

- `POST /api/auth/send-otp`
- NextAuth handler: `/api/auth/[...nextauth]`

## 5) Clean architecture (MVC style)

Users module:
- Domain model: `src/modules/users/domain/user.model.ts`
- Repository: `src/modules/users/repositories/user.repository.ts`
- Service: `src/modules/users/services/user.service.ts`
- Controller: `src/modules/users/controllers/user-auth.controller.ts`

Auth (`src/lib/auth-options.ts`) calls the users controller so role + persistence logic stays centralized.

You can configure base URLs through env:
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_API_AUTH_SEND_OTP_URL`
- `NEXT_PUBLIC_API_AUTH_SIGNIN_URL`
- `NEXT_PUBLIC_API_DASHBOARD_URL`

## 6) Docker (ready)

Build and run:

```bash
docker build -t automated-test-taker .
docker run --env-file .env -p 3000:3000 automated-test-taker
```

The app uses standalone Next.js output for production containers.
