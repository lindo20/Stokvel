# Stokvel-Administration-System
Manages tenancy of clubs on the platform, creates and suspends clubs, monitors platform health and produces anonymised aggregate reports. Does not access club-level financial data.


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Supabase setup

1. Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key.
2. In the Supabase dashboard, open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it. This creates the `profiles` table and stores each user's name and phone number when they register.
3. In **Authentication**, enable Email provider sign-in.
4. In **Authentication > URL Configuration**, add `http://localhost:3000` to the allowed redirect URLs. Add your production URL there before deployment.
5. Start the app with `npm run dev` and create an account from the sign-in screen.

The `profiles` table stores each user's name, email, ten-digit phone number, selected role (`member`, `admin`, `chairman`, `secretary`, or `treasurer`), and timestamps. Names accept letters and spaces only. Passwords are never copied into that table; Supabase Auth stores and verifies password hashes securely. New passwords require uppercase, lowercase, number, special character, and at least eight characters. Role selection is stored as profile data; authorization rules must still be enforced with server-side policies. The app reads only stokvel records owned by the signed-in user. Row-level security policies in `supabase/schema.sql` enforce these boundaries. Never put the Supabase secret key in this browser app, commit it, or expose it as a `NEXT_PUBLIC_*` variable.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
