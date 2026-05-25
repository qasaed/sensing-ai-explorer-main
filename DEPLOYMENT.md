# Deployment Notes

## Frontend on Vercel

1. Create a Vercel project from this repository.
2. In Vercel Dashboard > Project > Settings > Environment Variables, add:
   - Name: `VITE_API_BASE_URL`
   - Value: your Render backend URL, for example `https://your-app-name.onrender.com`
   - Environment: Production, Preview, and Development (recommended)
3. Redeploy the project.

## Local development

Create a `.env.local` file in the project root and set:

```env
VITE_API_BASE_URL=http://localhost:8000
```

The app will use the environment variable for all frontend API calls.

## Build verification

Run:

```bash
npm run build
```

This verifies the production build succeeds with the configured environment variable.

## Render backend URL

Use the public URL of your FastAPI backend on Render, for example:

```text
https://your-app-name.onrender.com
```

If your backend is configured with a custom path prefix, include it in the value.
