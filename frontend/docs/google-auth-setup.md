# Setting Up Google Authentication

This guide explains how to set up Google OAuth authentication for the application.

## 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "OAuth consent screen"
4. Set up the consent screen with your app information:
   - Choose User Type (External or Internal)
   - Add app name, user support email, and developer contact information
   - Add authorized domains
   - Save and continue

## 2. Set Up OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Add a name for your OAuth client
5. Add authorized JavaScript origins:
   - Development: `http://localhost:5173` (or your local development URL)
   - Production: Your production domain
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
7. Click "Create"
8. Take note of your Client ID and Client Secret

## 3. Configure Your Application

### Frontend Configuration

1. Create or update `.env` file in the `frontend` directory:

```
VITE_API_BASE_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-client-id-here
```

### Backend Configuration

1. Create or update `.env` file in the `backend` directory:

```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

## 4. Implement Backend Routes

Ensure your backend has these routes implemented:

- `GET /api/auth/google`: Initiates Google OAuth flow
- `GET /api/auth/google/callback`: Handles Google OAuth callback
- `POST /api/auth/refresh`: Endpoint for refreshing tokens

## 5. Testing the Integration

1. Start your frontend and backend servers
2. Go to the login page and click the "Login with Google" button
3. You should be redirected to Google's consent screen
4. After granting permission, you should be redirected back to your application and logged in

## Troubleshooting

### Common Issues

- **Redirect URI mismatch**: Ensure the callback URL in your Google Cloud Console matches exactly with your backend configuration
- **CORS errors**: Ensure your backend allows requests from your frontend origin
- **Invalid Client ID**: Make sure you're using the correct Client ID in your frontend
- **Token validation issues**: Check that your backend correctly validates Google's tokens

### Debug Tips

- Check the browser console for errors
- Look at the network tab in developer tools for failed requests
- Verify environment variables are correctly loaded
- Ensure cookies are being set correctly if your authentication uses cookies

## Security Considerations

- Always use HTTPS in production
- Implement proper CSRF protection
- Store tokens securely
- Implement token refresh logic
- Follow OAuth 2.0 best practices 