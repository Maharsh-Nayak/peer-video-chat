# Zoom Clone - P2P Video Conferencing Application

A real-time video conferencing application built with WebRTC (Peer-to-Peer) technology, featuring multi-participant video calls, screen sharing, and chat functionality.

## 🚀 Features

- ✅ **Multi-participant video calls** - Connect with multiple users in real-time
- ✅ **Audio/Video toggle** - Mute/unmute audio and enable/disable video
- ✅ **Screen sharing** - Share your screen with participants
- ✅ **Real-time chat** - Text messaging during calls
- ✅ **User authentication** - Login and registration system
- ✅ **Meeting rooms** - Create or join meetings with unique codes
- ✅ **Guest access** - Join meetings without authentication
- ✅ **Responsive UI** - Modern, Material-UI based interface

## 🏗️ Architecture

### Tech Stack

#### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5.1.0
- **Database**: MongoDB (MongoDB Atlas) with Mongoose 8.15.1
- **Real-time Communication**: Socket.IO 4.8.1
- **Security**: bcrypt, crypto

#### Frontend
- **Framework**: React 19.1.0
- **UI Library**: Material-UI 7.1.2
- **Routing**: React Router DOM 7.6.2
- **HTTP Client**: Axios 1.10.0
- **WebRTC**: Native Browser APIs
- **Socket**: Socket.IO Client 4.8.1
- **Auth**: Google OAuth (partial implementation)

### Network Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client A  │◄──P2P──►│  Google STUN │◄──P2P──►│  Client B   │
│  (Browser)  │         │   Server     │         │  (Browser)  │
└──────┬──────┘         └──────────────┘         └──────┬──────┘
       │                                                 │
       │              ┌─────────────────┐                │
       └─────────────►│  Socket.IO      │◄──────────────┘
                      │  Signaling      │
                      │  Server         │
                      └─────────────────┘
```

- **Signaling**: Centralized via Socket.IO WebSocket server
- **Media**: Direct peer-to-peer connections between clients
- **STUN**: Google's public STUN server for NAT traversal
- **No TURN**: Currently no TURN server (may fail behind restrictive firewalls)

## 📁 Project Structure

```
zoomclone/
├── backend/                    # Node.js backend
│   ├── src/
│   │   ├── server.js          # Main server entry point
│   │   ├── controler/
│   │   │   ├── socket_manager.js  # Socket.IO signaling logic
│   │   │   └── user.js        # Authentication logic
│   │   ├── model/
│   │   │   ├── user_models.js # User MongoDB schema
│   │   │   └── schema_model.js # Meeting schema (unused)
│   │   └── route/
│   │       └── userRoutes.js  # API routes
│   └── package.json
│
└── frontend/my-app/           # React frontend
    ├── src/
    │   ├── App.js             # Main router configuration
    │   ├── Pages/
    │   │   ├── videoMeetPage.jsx  # Main video call UI (P2P logic)
    │   │   ├── Authentication.jsx  # Login/Register forms
    │   │   ├── Dasboard.jsx   # Meeting dashboard
    │   │   └── LandingPage.jsx    # Public landing page
    │   ├── context/
    │   │   └── authContext.jsx    # Authentication state management
    │   └── Utils/
    │       └── ProtectedRoutes.jsx # Route protection component
    └── package.json
```

## 🔧 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB instance)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Update MongoDB connection string in `src/server.js`:
```javascript
const connection = await mongoose.connect("YOUR_MONGODB_CONNECTION_STRING");
```

4. Configure CORS origin in `src/server.js` (if needed):
```javascript
app.use(cors({
  origin: 'https://peer-video-chat-y157.onrender.com', // Your frontend URL
  credentials: true
}));
```

5. Start the server:
```bash
npm run dev  # Development mode with nodemon
# or
npm start    # Production mode
```

The backend server will run on port 5000 (default).

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend/my-app
```

2. Install dependencies:
```bash
npm install
```

3. Update Socket.IO server URL in `src/Pages/videoMeetPage.jsx`:
```javascript
socketRef.current = io.connect("https://peer-video-chat-y157.onrender.com", { secure: false });
```

4. Update API base URL in `src/context/authContext.jsx`:
```javascript
const client = axios.create({
  baseURL: "https://peer-video-chat-y157.onrender.com/api/user",
});
```

5. Start the development server:
```bash
npm start
```

The frontend will run on https://peer-video-chat-y157.onrender.com

## 🎯 How It Works

### P2P Connection Flow

1. **Signaling**: Clients connect to Socket.IO server for signaling
2. **Room Join**: Users join a meeting room identified by URL path
3. **Peer Discovery**: Server notifies all participants about new joins
4. **WebRTC Setup**: Each peer creates RTCPeerConnection instances
5. **ICE Exchange**: STUN server helps discover public IP addresses
6. **Media Exchange**: Direct peer-to-peer audio/video streams

### WebRTC Configuration

The application uses Google's public STUN server:
```javascript
const peerConnectionConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
```

### Key Components

#### Backend
- **Socket Manager**: Handles WebSocket connections, room management, and message routing
- **User Controller**: Manages authentication (registration/login)
- **User Model**: MongoDB schema for user data

#### Frontend
- **Video Meet Page**: Main video conferencing interface with WebRTC logic
- **Dashboard**: Create or join meetings
- **Authentication**: User login and registration
- **Landing Page**: Public page with guest join option

## 🔐 Security Considerations

⚠️ **Important Security Issues to Address:**

1. **Password Storage**: Plain passwords are stored alongside hashed passwords
2. **Password Comparison**: Currently uses plain text comparison instead of bcrypt
3. **Token Management**: Simple random tokens instead of JWT with expiration
4. **CORS**: Socket.IO allows all origins (`origin: "*"`)
5. **Database Credentials**: MongoDB connection string hardcoded in source code

**Recommended Fixes:**
- Store only hashed passwords
- Use `bcrypt.compare()` for password verification
- Implement JWT tokens with expiration
- Restrict CORS to known origins
- Use environment variables for sensitive data

## 🐛 Known Issues

1. **Socket.IO Event Typo**: `disconect` should be `disconnect` (line 49 in socket_manager.js)
2. **Deprecated WebRTC API**: Using `addStream()` and `onaddstream` (should use `addTrack()` and `ontrack`)
3. **Limited Error Handling**: Minimal error handling and user feedback
4. **No TURN Server**: May fail behind restrictive NATs/firewalls
5. **Memory Leaks**: Possible cleanup issues on component unmount

## 🚧 Missing Features

- ❌ TURN server configuration for restrictive networks
- ❌ Recording functionality
- ❌ Recording indicators
- ❌ Participant management (mute others, remove participants)
- ❌ Network quality indicators
- ❌ Connection retry logic
- ❌ Comprehensive error handling

## 📝 Usage

### Creating a Meeting

1. Login to your account
2. Navigate to Dashboard
3. Click "Start a Meeting"
4. Share the generated meeting code with participants

### Joining a Meeting

1. Enter the meeting code in the dashboard or landing page
2. Click "Join Meeting" or "Join as Guest"
3. Allow camera/microphone permissions
4. Enter your name and click "Enter Meeting"

### During a Meeting

- **Mute/Unmute**: Click the microphone icon
- **Video On/Off**: Click the camera icon
- **Screen Share**: Click the screen share icon
- **Chat**: Click the chat icon to open message sidebar
- **Leave**: Click the red "Leave" button

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the ISC License.

## 🔮 Future Improvements

- [ ] Add TURN server support
- [ ] Implement proper JWT authentication
- [ ] Fix security vulnerabilities
- [ ] Add recording functionality
- [ ] Improve error handling
- [ ] Add connection quality indicators
- [ ] Implement participant management
- [ ] Add unit and integration tests
- [ ] Migrate to modern WebRTC APIs
- [ ] Add Docker support
- [ ] Implement CI/CD pipeline

## 📞 Support

For issues and questions, please open an issue on the repository.

---

**Note**: This is a learning project. For production use, please address the security concerns mentioned above.
