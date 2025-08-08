import { google } from 'googleapis';

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${process.env.BACKEND_URL}/api/google/callback`;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}
