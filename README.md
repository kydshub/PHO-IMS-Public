
# Provincial Health Office Inventory Management System (PHO-IMS)

This is the official stable release of the PHO-IMS.

## Run Locally

**Prerequisites:**  Node.js

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Setup:**
    Create a file named `.env` in the root directory. Copy the keys from `.env.example` and fill in your specific values.
    
    *   **Firebase:** You must create a Firebase project and enable Realtime Database and Authentication (Email/Password). Copy the config values to the `VITE_FIREBASE_*` variables.

3.  **Run the app:**
    ```bash
    npm run dev
    ```

## Building for Production

```bash
npm run build
```
