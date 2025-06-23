import logo from './logo.svg';
import './App.css';
import { Routes, BrowserRouter as Router, Route } from 'react-router-dom';
import { LandingPage } from './Pages/LandingPage.jsx';
import { Authentication } from './Pages/Authentication.jsx';

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path='/auth' element={<Authentication />} />
          <Route path="/about" element={<div className="App"><header className="App-header"><h1>About Page</h1><p>This is the about page.</p></header></div>} />
          <Route path="/contact" element={<div className="App"><header className="App-header"><h1>Contact Page</h1><p>This is the contact page.</p></header></div>} />
          <Route path="/login" element={<div className="App"><header className="App-header"><h1>Login Page</h1><p>Please log in to continue.</p></header></div>} />
          <Route path="/register" element={<div className="App"><header className="App-header"><h1>Register Page</h1><p>Please register to create an account.</p></header></div>} />
          <Route path="/dashboard" element={<div className="App"><header className="App-header"><h1>Dashboard</h1><p>Welcome to your dashboard.</p></header></div>} />
          <Route path="/profile" element={<div className="App"><header className="App-header"><h1>Profile Page</h1><p>This is your profile page.</p></header></div>} />
          <Route path="/settings" element={<div className="App"><header className="App-header"><h1>Settings Page</h1><p>Adjust your settings here.</p></header></div>} />
          <Route path="/help" element={<div className="App"><header className="App-header"><h1>Help Page</h1><p>Find help and support here.</p></header></div>} />
          <Route path="/feedback" element={<div className="App"><header className="App-header"><h1>Feedback Page</h1><p>Provide your feedback here.</p></header></div>} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
