# TaskFlow Setup Guide

## Quick Start

### 1. Get Supabase Credentials

1. Go to [https://supabase.com](https://supabase.com) and sign in or create an account
2. Create a new project (or use an existing one)
3. Wait for the project to finish setting up
4. Go to **Settings** → **API**
5. Copy the following values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace the values with your actual Supabase credentials from step 1.

### 3. Install Dependencies

```bash
npm install
```

### 4. Verify Database Schema

The database schema has already been created via migrations. You can verify by:

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor**
3. You should see three tables:
   - `user_profiles`
   - `tickets`
   - `audit_logs`

If tables are missing, check the **SQL Editor** and run the migration manually from the Supabase dashboard.

### 5. Verify Edge Functions

The following edge functions should be deployed:
- `auth-register`
- `auth-login`
- `auth-me`
- `tickets`
- `dashboard`

You can verify by:
1. Go to **Edge Functions** in your Supabase dashboard
2. Check that all functions are listed and deployed

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 7. Create Your First User

1. Click **Register**
2. Fill in the form:
   - Name: Your Name
   - Email: your@email.com
   - Password: (minimum 6 characters)
   - Role: ADMIN (for your first user)
3. Click **Create Account**
4. After registration, click **Login** and sign in

## Troubleshooting

### "Failed to fetch" errors
- Check that your `.env` file exists and has correct values
- Verify your Supabase project is active
- Check browser console for detailed error messages

### Edge Functions not working
- Verify all edge functions are deployed in Supabase dashboard
- Check function logs in Supabase for errors
- Make sure your Supabase project has the correct permissions

### Database errors
- Verify tables exist in Supabase Table Editor
- Check Row Level Security policies are enabled
- Review Supabase logs for SQL errors

### Rate limiting issues
- Wait 60 seconds and try again
- Rate limits reset every minute
- For development, you can increase limits in edge functions

## Production Deployment

For production deployment:

1. Set up a production Supabase project
2. Deploy edge functions to production
3. Update `.env` with production credentials
4. Build the frontend: `npm run build`
5. Deploy the `dist` folder to your hosting provider
6. Configure CORS in Supabase to allow your production domain

## Security Notes

- Never commit your `.env` file to version control
- Use different Supabase projects for development and production
- Regularly rotate your Supabase service role key
- Enable email verification in production
- Set up monitoring and alerts for your Supabase project
- Review audit logs regularly for suspicious activity

## Need Help?

- Check the main [README.md](./README.md) for detailed documentation
- Review Supabase documentation: [https://supabase.com/docs](https://supabase.com/docs)
- Check browser console and network tab for errors
- Review edge function logs in Supabase dashboard
