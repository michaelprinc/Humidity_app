# Google OAuth Temporarily Disabled

Google OAuth integration has been disabled to switch the app to Tuya
Cloud for indoor data.

## Re-enable Google OAuth

1. Set `VITE_ENABLE_GOOGLE_OAUTH=true` in your `.env` file.
2. Replace the `TuyaSensor` component in `src/HumidityHub.jsx` with the
   original `IndoorTemperature` component.
3. Ensure the Google environment variables from `.env.example.google`
   are populated.

After these changes, rebuild or restart the development server and the
Google sign-in flow will be available again.
