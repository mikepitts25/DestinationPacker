# DestinationPacker App Store Submission Checklist

Last updated: 2026-06-03

## Local Status

- EAS project: `@mikepitts25/destinationpacker`
- Bundle identifier: `com.destinationpacker.app`
- Version: `1.0.0`
- Privacy policy URL: `https://colibricodellc.com/privacy-policy`
- Support URL: `https://colibricodellc.com`
- Store metadata file: `mobile/store.config.json`
- Production build profile: `mobile/eas.json` -> `build.production`
- Production submit profile: `mobile/eas.json` -> `submit.production`

## Commands

Run from `mobile/`.

```bash
npm run verify:release
npm run credentials:ios
npm run build:production:ios
npx eas-cli submit --platform ios --profile production --latest
```

`npm run credentials:ios` is interactive and requires Apple Developer access.

## App Store Connect Setup

- Create or confirm the App Store Connect app for bundle ID `com.destinationpacker.app`.
- Configure iOS build credentials through EAS.
- Add the privacy policy URL: `https://colibricodellc.com/privacy-policy`.
- Add the support URL: `https://colibricodellc.com`.
- Upload screenshots from a real simulator/device build.
- Complete App Privacy answers.
- Complete export compliance. The app declares `ITSAppUsesNonExemptEncryption: false`.
- Submit the first build to TestFlight before App Review.

## Draft App Privacy Answers

Review these in App Store Connect before submitting.

- Contact Info: email address is collected for account login and linked to the user.
- Identifiers: Supabase user ID is used for account and data ownership.
- User Content: trips, destinations, travel dates, traveler counts, packing items, notes, and activity selections are stored for app functionality.
- Location: this version does not request device location permission. Destination coordinates selected by the user are used for weather and activity suggestions.
- Purchases: no in-app purchases are available in this version.
- Diagnostics/Tracking: no advertising SDK, tracking permission, or analytics SDK is currently configured in the app.

## Supabase Dashboard Tasks

- Confirm email settings and production redirect URLs.
- Enable leaked password protection if the project is on Supabase Pro or above.
- Confirm `delete-account` Edge Function remains active.

## TestFlight QA

- Sign up and log in.
- Create a trip with one destination.
- Create a multi-stop trip.
- Generate a packing list.
- Check multi-traveler quantities.
- Add, edit quantity, delete, and undo-restore packing items.
- Fetch weather and use manual update.
- Fetch activities and select activities.
- Confirm selected activities update packing suggestions.
- Open Terms and Privacy from login and Profile.
- Delete account from Profile and confirm the session returns to sign-in.
