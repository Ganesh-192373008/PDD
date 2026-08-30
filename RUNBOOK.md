# AgroAssist Runbook

This guide contains step-by-step instructions on how to install, configure, and run the **AgroAssist** application components: **Backend API Server**, **Frontend Web Dashboard**, and the **Flutter Mobile App**.

---

## Project Structure
```
AGROASSIST/
├── backend/      # Express API Server & Python AI Inference
├── frontend/     # React + Vite Web Dashboard
└── mobile/       # Flutter Mobile Application
```

---

## 1. Backend Server Setup (`backend/`)

The backend is built with **Node.js (Express)** and uses **MongoDB** as the database. It also triggers a **Python script** (`predict.py`) for AI disease inference and calls **Ollama** for LLM chat/recommendation features.

### Prerequisites
- **Node.js** (v18.x or higher)
- **MongoDB** (Local instance running at `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI)
- **Python 3.x** with the following packages installed:
  ```bash
  pip install numpy tensorflow pillow
  ```
- **Ollama** (Running locally with the `llama3` model downloaded)
  - Install Ollama from [ollama.com](https://ollama.com)
  - Run the following command to download the model:
    ```bash
    ollama run llama3
    ```

### Configuration
1. In the `backend/` directory, create a `.env` file (you can copy the provided `.env.example` as a template):
   ```bash
   cp .env.example .env
   ```
2. Fill in the environment variables:
   - `PORT`: Port on which the API server runs (default: `5000`).
   - `MONGO_URI`: The connection string for your MongoDB database.
   - `JWT_SECRET`: Secret key used for JWT auth tokens.
   - `OLLAMA_HOST`: Host URL for the Ollama instance (default: `http://127.0.0.1:11434`).
   - `OLLAMA_MODEL`: Model used by Ollama (default: `llama3`).
   - `WEATHER_API_KEY`: API key for weather route integrations.
   - `SMTP_*`: Credentials for email notification dispatch via SMTP (e.g. Brevo/Sendinblue).

> [!WARNING]
> Before sharing the code, please ensure you do not commit or distribute the `.env` file containing active, sensitive keys like `SMTP_PASS` or database credentials.

### AI Model Placement
The disease classification feature requires a pre-trained Keras model.
- Place your model file named **`AgroAssist_PlantVillage_38_Model.keras`** inside the **`backend/models/`** directory.
- The Python script `predict.py` looks specifically for this path to load weights for inference.

### Installation & Execution
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node server.js
   ```
   *The server will run on `http://localhost:5000` (or the configured `PORT`).*

---

## 2. Frontend Web Dashboard Setup (`frontend/`)

The frontend is a single-page application built using **React** and **Vite**.

### Prerequisites
- **Node.js** (v18.x or higher)

### Configuration
- The API base URL is configured in [AppContext.jsx](file:///c:/Users/dell/Downloads/AGROASSIST/AGROASSIST/frontend/src/context/AppContext.jsx#L171):
  ```javascript
  const API_URL = import.meta.env.VITE_API_URL || 'https://pdd-backend-s6yk.onrender.com/api';
  ```
  Or override it in `frontend/.env` via `VITE_API_URL`.

### Installation & Execution
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   cd frontend && npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *By default, the Vite dev server runs on `http://localhost:5173`.*
4. Build for production:
   ```bash
   npm run build
   ```

---

## 3. Flutter Mobile Application (`mobile/`)

The mobile application is cross-platform, built with **Flutter**.

### Prerequisites
- **Flutter SDK** (configured with Android Studio / Xcode for emulators)
- **Dart SDK** (comes bundled with Flutter)

### Configuration
- **API URL Connection**: The app connects to the Render API endpoint specified in [main.dart](file:///c:/Users/dell/Downloads/AGROASSIST/AGROASSIST/mobile/lib/main.dart#L91):
  ```dart
  final String apiUrl = 'https://pdd-backend-s6yk.onrender.com/api';
  ```
  - **Android Emulator**: Keep it as `http://10.0.2.2:5000/api` (it forwards to host machine's localhost).
  - **iOS Simulator**: Change it to `http://localhost:5000/api`.
  - **Physical Device**: Change it to the local IP address of your machine running the backend (e.g., `http://192.168.1.100:5000/api`), and ensure both devices are on the same Wi-Fi network.

### Installation & Execution
1. Navigate to the mobile directory:
   ```bash
   cd ../mobile
   ```
2. Fetch Flutter packages:
   ```bash
   flutter pub get
   ```
3. Run the application:
   ```bash
   flutter run
   ```
   *(Ensure you have a simulator open or a physical device connected).*
