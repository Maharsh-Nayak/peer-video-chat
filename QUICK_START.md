# Quick Start Checklist

Complete the steps below to get the Zoom Clone application running locally.

## Pre-requisites

- [ ] Node.js 18+ installed (`node -v`)
- [ ] MongoDB Atlas account created
- [ ] Git installed
- [ ] VS Code or preferred code editor

## Step 1: MongoDB Setup (5 minutes)

- [ ] Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [ ] Create a free cluster or use existing one
- [ ] In "Network Access", add your IP address (or allow 0.0.0.0/0 for development)
- [ ] Click "Connect" and copy connection string
- [ ] Note your MongoDB username and password

## Step 2: Backend Environment Setup (3 minutes)

```bash
# Navigate to backend directory
cd backend

# Copy example to actual .env
cp .env.example .env
```

- [ ] Open `backend/.env` in editor
- [ ] Replace `YOUR_USERNAME` with MongoDB username
- [ ] Replace `YOUR_PASSWORD` with MongoDB password  
- [ ] Replace `cluster0.t0bqm.mongodb.net` with your actual cluster URL
- [ ] Set `PORT=5000`
- [ ] Set `NODE_ENV=development`
- [ ] Set `SOCKET_IO_CORS_ORIGIN=http://localhost:3000`

**Example completed .env:**
```
PORT=5000
MONGODB_URI=mongodb+srv://yourname:yourpass@yourcluster.mongodb.net/?appName=Cluster0
NODE_ENV=development
SOCKET_IO_CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

## Step 3: Backend Installation & Start (3 minutes)

```bash
# Install dependencies (includes dotenv)
npm install

# Start the development server
npm run dev
```

- [ ] Backend should say: ✓ Connected to MongoDB
- [ ] Backend should say: ✓ Server started on port 5000
- [ ] Keep terminal open while testing

## Step 4: Frontend Environment Setup (2 minutes)

In a new terminal:

```bash
# Navigate to frontend directory
cd frontend/my-app

# Copy example to actual .env
cp .env.example .env
```

- [ ] Open `frontend/my-app/.env` in editor
- [ ] Set `REACT_APP_SOCKET_SERVER=http://localhost:5000`
- [ ] Set `REACT_APP_API_BASE_URL=http://localhost:5000/api`
- [ ] Set `REACT_APP_ENVIRONMENT=development`
- [ ] Set `REACT_APP_DEBUG=true`

**Example completed .env:**
```
REACT_APP_SOCKET_SERVER=http://localhost:5000
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG=true
```

## Step 5: Frontend Installation & Start (3 minutes)

```bash
# Install dependencies
npm install

# Start the React dev server
npm start
```

- [ ] Frontend should open automatically on `http://localhost:3000`
- [ ] If not, browser will show: `http://localhost:3000`

## Step 6: Test the Application

- [ ] Open browser to `http://localhost:3000`
- [ ] Click "Start Meeting" on landing page
- [ ] You should see video feed enabled
- [ ] Check browser console (F12) for no errors
- [ ] Check backend terminal for connection logs

## Verification Checklist

**Backend should show:**
- [ ] ✓ Connected to MongoDB
- [ ] ✓ Server started on port 5000
- [ ] Socket.IO connection logs when frontend connects

**Frontend should show:**
- [ ] Landing page loads without errors
- [ ] Camera permission prompt appears
- [ ] "Start Meeting" button clickable
- [ ] Browser console shows no red errors

**Connection test:**
- [ ] Open two browser windows to `http://localhost:3000`
- [ ] Both should allow video
- [ ] Both should connect via Socket.IO

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| "Cannot connect to MongoDB" | Check MONGODB_URI in .env, verify IP whitelisted in MongoDB Atlas |
| "Socket.IO connection failed" | Verify backend is running, check REACT_APP_SOCKET_SERVER in frontend .env |
| "Camera not working" | Check browser permissions, allow camera access when prompted |
| "Port 5000 already in use" | Change PORT in .env or kill process using port 5000 |
| "Module not found" | Run `npm install` in both backend and frontend directories |

## Environment Files to Create

```
✓ backend/.env (created from .env.example)
✓ frontend/my-app/.env (created from .env.example)
✓ backend/.gitignore already contains .env
✓ frontend/my-app/.gitignore already contains .env
```

## Commands Summary

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with MongoDB credentials
npm install
npm run dev

# Frontend (in new terminal)
cd frontend/my-app
cp .env.example .env
# Edit .env with localhost URLs
npm install
npm start
```

## What's Next?

After verification, you can:

1. **Create a second test connection:** Open two browser windows at `http://localhost:3000`
2. **Check connection quality:** Open browser console (F12) and look for quality metrics
3. **View room persistence:** Check MongoDB Atlas for created documents in `rooms` collection
4. **Deploy:** Follow deployment guides for Render (backend) and Vercel (frontend)

## Common Ports

- Backend: `5000` (Socket.IO signaling, REST API)
- Frontend: `3000` (React development server)
- MongoDB: Online service (cluster hosted on Atlas)

---

**Need help?** Check [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md) for detailed explanations.
