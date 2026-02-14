# Setup Instructions

## Firebase Configuration

1. Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database** (start in test mode)
3. Enable **Firebase Storage** (start in test mode)
4. Go to Project Settings > General > Your apps > Add a Web app
5. Copy the config values and create a `.env.local` file in the project root:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

6. Run `npm run dev` to start the development server.

## Firestore Collections (auto-created)

- **tasks** — Business prompts/requirements
- **submissions** — User video uploads with pose data
