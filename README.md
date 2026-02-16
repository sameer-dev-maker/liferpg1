<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1oxwaZDcXi6EqJvpg2dj9LU3QhXc6qcCe

## Android Build

This project is configured with [Capacitor](https://capacitorjs.com/) for Android.

### Local Build (Prerequisites: Android SDK)

1. Sync the project:
   `npm run cap:android`
2. Build the APK:
   `npm run build:apk`

The APK will be located at `android/app/build/outputs/apk/debug/app-debug.apk`.

## CI/CD (GitHub Actions)

A GitHub Actions workflow is included in `.github/workflows/android-build.yml`. 
Every push to `main` or `master` will automatically:
1. Build the React app.
2. Sync Capacitor Android.
3. Build a debug APK.
4. Upload the APK as a workflow artifact.

