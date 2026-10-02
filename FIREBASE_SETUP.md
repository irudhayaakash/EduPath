# EduPath Firebase Setup

This project now uses **Firebase Realtime Database** for cloud persistence and **Firebase Anonymous Authentication** to give each browser a private Firebase user ID. The existing localStorage cache remains as an offline fallback.

## 1. Create Firebase project
1. Open Firebase Console: https://console.firebase.google.com/
2. Create or select your project.
3. Add a **Web app** from Project settings > Your apps.
4. Copy the Firebase web configuration values.

## 2. Enable Authentication
Open Authentication > Sign-in method and enable **Anonymous**.

## 3. Create Realtime Database
Open Realtime Database > Create Database. Choose your region and create it.

## 4. Apply database rules
Use the rules in `database.rules.json`. They allow an authenticated anonymous user to read/write only their own `edupath/users/<uid>` data.

## 5. Create `.env`
Copy `.env.example` to `.env` and fill the Firebase values:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Keep `GEMINI_API_KEY` filled as before for the existing AI features.

## 6. Install and run
```bash
npm install
npm run dev
```

## Firebase data structure
```text
edupath
  users
    <anonymous-user-uid>
      state
        profile
        analysis
        progress
        notes
      threads
        ...
```

The app first loads cached local data for fast startup and then replaces it with the Firebase copy when available. Changes are written to both local cache and Firebase.

## Firebase Realtime Database structure

EduPath now stores each anonymous learner as **one clean record** instead of splitting the learner state across separate `state` and `threads` nodes.

```text
edupath
└── users
    └── <Firebase anonymous user UID>
        ├── userInformation
        │   ├── name
        │   ├── currentRole
        │   ├── experienceYears
        │   ├── skills
        │   ├── goalRole
        │   ├── timelineMonths
        │   ├── hoursPerWeek
        │   ├── interests
        │   └── resumeText
        ├── analysisResult
        │   ├── summary
        │   ├── strengths
        │   ├── risks
        │   ├── assessment
        │   ├── gaps
        │   ├── phases
        │   ├── adaptationNote
        │   └── generatedAt
        ├── learningProgress
        ├── notes
        ├── coachThreads
        └── updatedAt
```

After the user clicks **Analyze**, the complete profile and the generated AI analysis are written together under the same user UID. This makes the Firebase Console much easier to read and inspect.


## Authentication required for the final login flow

In Firebase Console → Authentication → Sign-in method, enable:
- Email/Password
- Google

Realtime Database remains the data store. The application writes the requested structure under `edupath/users/<User Name> (<Firebase UID>)` with only `profile` and `details` as top-level children for each user. AI Coach messages are stored under `profile/aiCoach/message1`, `message2`, etc.

Passwords are authenticated by Firebase Authentication. The `details/passwordHash` field is only a separate salted PBKDF2 verifier for the requested database representation; the original password is never stored.
