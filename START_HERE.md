# EduPath — Start Here

## 1. Install

```powershell
npm install
```

## 2. Create `.env`

```powershell
Copy-Item .env.example .env
```

Open `.env` and replace every Firebase placeholder with the values from Firebase Console → Project settings → Your apps → Web app.

For Gemini, set:

```env
GEMINI_API_KEY=your_gemini_api_key
```

## 3. Firebase Authentication

Enable these providers in Firebase Console → Authentication → Sign-in method:

- Email/Password
- Google

## 4. Realtime Database

Deploy/use `database.rules.json` and keep the requested EduPath structure:

```text
edupath
└── users
    └── User Name (Firebase UID)
        ├── profile
        │   └── aiCoach
        │       ├── message1
        │       ├── message2
        │       └── ...
        └── details
```

## 5. Run

```powershell
npm run dev
```

Open the URL shown by Vite, normally `http://localhost:8080/`.
