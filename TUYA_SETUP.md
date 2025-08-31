# Tuya Cloud Setup Guide

This project uses Tuya Cloud to retrieve local temperature and humidity
from your smart sensors. Follow these steps to configure the required
credentials.

1. **Create a Tuya IoT Platform account**
   - Visit [https://iot.tuya.com](https://iot.tuya.com) and sign up.

2. **Create a Cloud project**
   - In the Tuya IoT Platform, open **Cloud > Development > Create Cloud Project**.
   - Choose the data center closest to your region.
   - Enable the **Device Status Notification** and **Smart Home Scene** APIs.

3. **Obtain Access ID and Secret**
   - After creating the project, go to the project details page.
   - Record the **Access ID** and **Access Secret**. These values are
     used as `VITE_TUYA_ACCESS_ID` and `VITE_TUYA_ACCESS_SECRET` in the
     `.env` file.

4. **Link your Tuya app**
   - In the project details, find **Link Device > Link App Account**.
   - Use the Tuya Smart or Smart Life mobile app to scan the QR code and
     link your account. This grants the Cloud project access to your devices.

5. **Find the Device ID**
   - After linking, the **Device Management** section lists your devices.
   - Copy the **Device ID** of the sensor providing temperature and
     humidity. Set this as `VITE_TUYA_DEVICE_ID` in the `.env` file.

6. **Configure environment variables**
   - Copy `.env.template` to `.env` and populate the Tuya values:

```
VITE_TUYA_ACCESS_ID=your_access_id
VITE_TUYA_ACCESS_SECRET=your_access_secret
VITE_TUYA_DEVICE_ID=your_device_id
```

7. **Run the app**
   - Start the development server with `npm run dev`.
   - The app will use Tuya Cloud to display indoor temperature and humidity.

## Re-enabling Google OAuth

Google OAuth is disabled by default. To re-enable it, set
`VITE_ENABLE_GOOGLE_OAUTH=true` in your `.env` file and restore the
`IndoorTemperature` component in `HumidityHub.jsx`.
