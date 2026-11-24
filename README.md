# GradeSeal

GradeSeal is a web app for managing seed-to-sale quality workflows. It handles batch sampling, laboratory results, specification checks, certificate approval, QR labels, printing, and scan verification.

## What it does

- Creates and manages batches and specifications
- Assigns sample bag IDs and records test results
- Uploads sample evidence to Cloudinary
- Generates signed Certificate of Analysis (COA) PDFs
- Produces QR label sheets and print manifests
- Tracks printed items and certificate scan logs
- Supports authentication and password reset

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router |
| Backend | Node.js, Express 5 |
| Database | MongoDB, Mongoose |
| Storage | Cloudinary, Multer |
| Security | JWT cookies, bcrypt, rate limiting |
| Certificates | PDFKit, QR codes, Ed25519 signatures |
| Deployment | Docker, Render-compatible |

## Project structure

```text
client/                  React dashboard and public verification UI
server/
  controllers/           Business logic
  models/                MongoDB models
  routes/                Express API routes
  utils/                 PDF, QR, email, upload, and signing helpers
Dockerfile               Builds the client and serves it with Express
```

## Local setup

Requirements: Node.js 22+, npm, MongoDB, and a Cloudinary account.

```bash
npm install
npm install --prefix server
npm install --prefix client
```

Create `server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/gradeseal
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:5173
PUBLIC_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

RESEND_API_KEY=...
ED25519_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

Start both applications:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Core workflow

```text
Create batch -> assign sample bag -> upload results -> approve -> print labels -> verify by QR
```

## API overview

| Area | Routes |
| --- | --- |
| Auth | `/api/register`, `/api/login`, `/api/profile`, `/api/logout` |
| Password reset | `/api/reset/send-otp`, `/api/reset/verify-otp`, `/api/reset/reset-password` |
| Batches | `/api/batches`, `/api/batches/:id/status`, `/api/batches/:id/assign-sample`, `/api/batches/:id/sample`, `/api/batches/:id/approve` |
| Printing | `/api/batches/:id/manifest`, `/api/batches/:id/labels`, `/api/batches/:id/qr-labels`, `/api/batches/:id/printed` |
| Specifications | `/api/specifications` |
| Certificates | `/api/coas` |
| Scan logs | `/api/scanlogs` |

Most protected endpoints require the authentication cookie issued by `/api/login`.

## Commands

```bash
npm run dev                  # Run client and server
npm run dev --prefix server  # Run server only
npm run dev --prefix client  # Run client only
npm run build --prefix client
npm start --prefix server
node server/generate-keys.js # Generate Ed25519 signing keys
```

## Docker

```bash
docker build -t gradeseal .
docker run --env-file server/.env -p 5000:5000 gradeseal
```

The image builds the React app and serves it with Express from `/app/server/public`.
