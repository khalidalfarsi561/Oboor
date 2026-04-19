# PocketBase Rewards Store

A Next.js App Router app with PocketBase-backed reward token verification and code redemption.

## Features

- Verify access tokens through `/api/verify-token`
- Generate single-use reward codes
- Redeem reward codes through `/api/redeem-code`
- Track user coin balance in PocketBase
- Dark gaming-style UI with Tailwind CSS

## Requirements

- Node.js 18+
- PocketBase instance running locally or remotely

## Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
NEXT_PUBLIC_PB_URL=http://127.0.0.1:8090
```

## PocketBase Collections

This app expects the following collections and fields:

### `users`
- `coins` (Number, default `0`)

### `access_tokens`
- `token` (Text, unique)
- `is_used` (Bool, default `false`)

### `reward_codes`
- `code` (Text, unique)
- `is_used` (Bool, default `false`)

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

## Build

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Pages

- `/` — Main store page
- `/secret?token=YOUR_TOKEN` — Secret reward page
