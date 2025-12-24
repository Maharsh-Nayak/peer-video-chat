import "../App.css";
import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContext";
import { useLocation } from "react-router-dom";
import {status} from "http-status";
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

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
  const location = useLocation();
  const mode = location.state?.mode || "login";

  const [userName, setUserName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLogin, setIsLogin] = React.useState(mode === "login" ? true : false);

  const navigate = useNavigate();

  const imgUrl = "authBack.png ";

  const { handleLogin, handleRegister } = React.useContext(AuthContext);

  const handleUserRegister = async () => {
    try {
      let res = await handleRegister(userName, email, password);
      if(res){
        setIsLogin(true);
      }
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const handleUserLogin = async () => {
    try {
      let res = await handleLogin(userName, password);
      if(res){
        navigate("/dashboard");
      }
      console.log(res);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const userData = jwtDecode(credentialResponse.credential);
            
            // You should update your AuthContext to have a handleGoogleLogin function
            // For now, let's assume we use the existing handleLogin or a new one
            // let res = await handleGoogleLogin(userData.email, userData.name, userData.picture);
            
            console.log("Google User Data:", userData);
            
            // Example of what to do next:
            // if(res) navigate("/dashboard");
            
            // For now, let's just set the username to show it works
            setUserName(userData.name);
            navigate("/dashboard");
        } catch (error) {
            console.error("Google Login Failed:", error);
        }
    };


 return (

  <Grid container sx={{ height: "100vh" }}>
    
    <Grid item xs={12} md={7} sx={{ height: "100%" }}>
      <img
        src={imgUrl}
        alt="auth visual"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </Grid>

    <Grid
  item
  xs={12}
  md={5}
  sx={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  }}
>
  <Box
    sx={{
      width: "100%",
      maxWidth: "380px",
      textAlign: "center",
      px: 2,
    }}
  >
    <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
      Travel with us
    </Typography>
    <Typography variant="body1" sx={{ mb: 4, opacity: 0.6 }}>
      Join us today
    </Typography>

    {/* <Button
      fullWidth
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: "30px",
        py: 1.4,
        textTransform: "none",
        fontSize: "1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src="https://img.icons8.com/color/20/google-logo.png"
        alt=""
        style={{ marginRight: "8px" }}
      />
      Sign up with Google
    </Button> */}
    <GoogleLogin
      onSuccess={handleGoogleSuccess}
      onError={() => console.log('Login Failed')}
      useOneTap
      shape="pill"
      width="380px"
    />

    <Box sx={{ display: "flex", alignItems: "center", my: 3 }}>
      <Box sx={{ flex: 1, height: "1px", background: "#ddd" }} />
      <Typography sx={{ mx: 2, opacity: 0.7 }}>OR</Typography>
      <Box sx={{ flex: 1, height: "1px", background: "#ddd" }} />
    </Box>

    <TextField label="Username" fullWidth sx={{ mb: 2 }} onChange={(e) => setUserName(e.target.value)} />
    <TextField type="password" label="Password" fullWidth sx={{ mb: 3 }} onChange={(e) => setPassword(e.target.value)} />
    
    {
      !isLogin && (
        <TextField type="email" label="Email" fullWidth sx={{ mb: 3 }} onChange={(e) => setEmail(e.target.value)} />
      )
    }

    <Button
      fullWidth
      sx={{
        backgroundColor: "black",
        color: "white",
        borderRadius: "30px",
        py: 1.5,
        fontSize: "1rem",
        textTransform: "none",
        mb: 3,
        "&:hover": { backgroundColor: "#333" },
      }}
      onClick={isLogin ? handleUserLogin : handleUserRegister}
    >
      {isLogin ? "Log in" : "Sign up"}
    </Button>

    <Typography sx={{ mb: 2, opacity: 0.7 }}>
      Don't have an account?
    </Typography>

    <Button
      fullWidth
      variant="outlined"
      sx={{
        borderRadius: "30px",
        py: 1.2,
        textTransform: "none",
        fontSize: "1rem",
      }}
      onClick={() => setIsLogin(!isLogin)}
    >
      {isLogin ? "Sign up" : "Log in"}
    </Button>
  </Box>
</Grid>

  </Grid>
);

}
