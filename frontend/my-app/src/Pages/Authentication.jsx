import "../App.css";
import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContext";

import {
  Button,
  TextField,
  Container,
  Grid,
  Typography,
  Box,
  Paper,
} from "@mui/material";

export function Authentication() {
  const [userName, setUserName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLogin, setIsLogin] = React.useState(true);

  const navigate = useNavigate();


  const imgUrl = "https://picsum.photos/500?random";

  const { handleLogin, handleRegister } = React.useContext(AuthContext);

  const handleUserRegister = async () => {
    try {
      let res = await handleRegister(userName, email, password);
      console.log(res);
      
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const handleUserLogin = async () => {
    try {
      let res = await handleLogin(userName, password);
      console.log(res);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ height: "100vh", display: "flex", alignItems: "center" }}>
      <Paper elevation={6} sx={{ borderRadius: 4, overflow: "hidden", width: "100%" }}>
        <Grid container>
          
          <Grid item xs={12} md={7}>
            <img src={imgUrl} alt="auth visual"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Grid>

          <Grid item xs={12} md={5}>
            <Box sx={{ p: 5, display: "flex", flexDirection: "column", gap: 3 }}>

                <Button
                variant="outlined"
                fullWidth
                sx={{ py: 1, fontSize: "1rem" }}
                onClick={() => navigate("/")}
                >
                    ⬅ Back
                </Button>

              
              <Typography variant="h4" fontWeight="bold" textAlign="center">
                {isLogin ? "Welcome Back 👋" : "Create Your Account 📝"}
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                <Button 
                  variant={isLogin ? "contained" : "outlined"} 
                  onClick={() => setIsLogin(true)}
                  sx={{ width: "40%" }}
                >
                  Login
                </Button>

                <Button 
                  variant={!isLogin ? "contained" : "outlined"} 
                  onClick={() => setIsLogin(false)}
                  sx={{ width: "40%" }}
                >
                  Register
                </Button>
              </Box>

              {/* Form Inputs */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {!isLogin && (
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                )}
                
                <TextField
                  label="Username"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  fullWidth
                />

                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Box>

              {/* Submit Button */}
              <Button
                variant="contained"
                fullWidth
                sx={{ py: 1.5, mt: 2, fontSize: "1.1rem" }}
                onClick={isLogin ? handleUserLogin : handleUserRegister}
              >
                {isLogin ? "Login" : "Register"}
              </Button>

              <Typography textAlign="center" sx={{ mt: 1, fontSize: "0.9rem", opacity: 0.6 }}>
                {isLogin ? "Don't have an account? Register instead." : "Already have an account? Login instead."}
              </Typography>

            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
