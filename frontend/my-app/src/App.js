import logo from './logo.svg';
import './App.css';
import { Routes, BrowserRouter as Router, Route } from 'react-router-dom';
import { LandingPage } from './Pages/LandingPage.jsx';
import { Authentication } from './Pages/Authentication.jsx';
import { AuthProvider } from "./context/authContext";
import MeetEntery from './Pages/videoMeetPage.jsx';
import { Dashboard } from './Pages/Dasboard.jsx';
import ProtectedRoute from './Utils/ProtectedRoutes.jsx'

function App() {
  return (
    <>
      <Router>
        <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path='/login' element={<Authentication />} />
              <Route path="/meet/:meetCode" element={<MeetEntery />} />
              <Route path="/about" element={<div className="App"><header className="App-header"><h1>About Page</h1><p>This is the about page.</p></header></div>} />
              <Route path="/contact" element={<div className="App"><header className="App-header"><h1>Contact Page</h1><p>This is the contact page.</p></header></div>} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={<div className="App"><header className="App-header"><h1>Profile Page</h1><p>This is your profile page.</p></header></div>} />
              <Route path="/settings" element={<div className="App"><header className="App-header"><h1>Settings Page</h1><p>Adjust your settings here.</p></header></div>} />
              <Route path="/help" element={<div className="App"><header className="App-header"><h1>Help Page</h1><p>Find help and support here.</p></header></div>} />
              <Route path="/feedback" element={<div className="App"><header className="App-header"><h1>Feedback Page</h1><p>Provide your feedback here.</p></header></div>} />
          </Routes>
        </AuthProvider>
      </Router>
    </>
  );
}

export default App;
