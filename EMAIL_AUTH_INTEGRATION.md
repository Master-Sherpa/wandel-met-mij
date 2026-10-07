# Email + Code Authentication Integration Guide

## Quick Start

### Step 1: Include in index.html
Add before `</body>`:
```html
<script src="authLibrary.js"></script>
<script src="emailAuthModal.html"></script>
<button onclick="EmailAuthUI.open()">🔐 Upgrade to Email</button>
```

### Step 2: Deploy Cloud Functions
```bash
firebase deploy --only functions
```

### Step 3: Add Firestore Rules
```
match /accounts/{document=**} {
  allow read, write: if request.auth != null;
}
match /authCodes/{document=**} {
  allow read, write: if request.auth != null;
}
```

## API Reference

### AuthLibrary.sendCode(email)
Sends 6-digit code to user email.
- **Returns:** `{ success: true, code: "123456" }`

### AuthLibrary.verifyCode(code, anonymousId?)
Verifies code and creates account.
- **Returns:** `{ success: true, email: "user@email.com", isNewAccount: true }`

### AuthLibrary.isEmailAuthenticated()
Checks if user is authenticated.
- **Returns:** `true/false`

### AuthLibrary.logout()
Clears session.

## Configuration

**Development (Emulator):**
- authLibrary.js auto-detects localhost
- Returns code directly (no email sent)

**Production:**
1. Set Gmail credentials:
```bash
firebase functions:config:set gmail.user="your-email@gmail.com"
firebase functions:config:set gmail.password="your-app-password"
firebase deploy --only functions
```

2. Deploy rules:
```bash
firebase deploy --only firestore:rules
```

## Architecture

- **authLibrary.js**: Standalone HTTP client (web/iOS/Android)
- **emailAuthModal.html**: Self-contained UI component
- **Cloud Functions**: Backend (sendCode, verifyCode, getAccount)
- **Firestore**: Persistent storage (accounts, authCodes, rateLimit)

## Rate Limiting

- 3 code requests per hour per email
- 5 failed verification attempts max
- 10-minute code expiry

## Troubleshooting

- "Code not found" → Check 10-minute expiry
- "Too many attempts" → Wait 15 minutes
- No email received → Check Gmail App Password
