# Setting Up Google OAuth for BriefButler

This document provides step-by-step instructions for setting up Google OAuth credentials for the BriefButler application.

## Prerequisites

- A Google account with access to Google Cloud Console
- Your BriefButler backend and frontend running

## Steps to Set Up Google OAuth

### 1. Create a New Project in Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click on the project dropdown at the top of the page and select "New Project".
3. Enter a name for your project (e.g., "BriefButler") and click "Create".
4. Once your project is created, select it from the project dropdown.

### 2. Configure the OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen" from the left menu.
2. Select "External" as the user type and click "Create".
3. Fill in the required information:
   - App name: BriefButler
   - User support email: Your email
   - Developer contact information: Your email
4. Click "Save and Continue".
5. On the Scopes screen, click "Add or Remove Scopes" and add:
   - `openid`
   - `profile`
   - `email`
6. Click "Save and Continue".
7. On the Test Users screen, click "Add Users" and add your email address.
8. Click "Save and Continue" then "Back to Dashboard".

### 3. Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" > "Credentials" from the left menu.
2. Click "+ Create Credentials" at the top of the page and select "OAuth client ID".
3. For "Application type", select "Web application".
4. Name: "BriefButler Web Client"
5. Add Authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - `http://localhost:3000` (for your backend)
   - Your production URLs if applicable
6. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (for development)
   - Your production callback URL if applicable
7. Click "Create".
8. You'll receive your Client ID and Client Secret. Copy these values.

### 4. Configure Your Backend

1. Open the `.env` file in your backend directory.
2. Add or update the following environment variables:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
   FRONTEND_URL=http://localhost:5173
   ```
3. Restart your backend server to apply the changes.

## Testing the Integration

1. Navigate to the login page of your BriefButler application.
2. Click the "Login with Google" button.
3. You should be redirected to the Google login page.
4. After successful authentication, you should be redirected back to your application.

## Troubleshooting

- If you encounter CORS issues, ensure your domain is correctly added to the authorized JavaScript origins.
- If the redirect fails, check that your redirect URI exactly matches what's in the Google Cloud Console.
- Check the backend logs for any authentication errors.

## Production Considerations

Before deploying to production:

1. Update the application status from "Testing" to "Production" in the OAuth consent screen.
2. Add your production domains to the authorized origins and redirect URIs.
3. Update your environment variables with production URLs.

---

**Note:** Google OAuth credentials are sensitive information. Never commit them to your source code or share them publicly. 