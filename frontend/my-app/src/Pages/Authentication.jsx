import "../App.css";
import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContext";
import { useLocation } from "react-router-dom";

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

  

  <Grid container sx={{ height: "100vh" }}>
    
    {/* LEFT IMAGE SECTION */}
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

    {/* RIGHT FORM SECTION */}
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

    {/* Google */}
    <Button
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
    </Button>

    {/* Apple */}
    <Button
      fullWidth
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: "30px",
        py: 1.4,
        textTransform: "none",
        fontSize: "1rem",
      }}
    >
      🍎 Sign up with Apple
    </Button>

    {/* Divider */}
    <Box sx={{ display: "flex", alignItems: "center", my: 3 }}>
      <Box sx={{ flex: 1, height: "1px", background: "#ddd" }} />
      <Typography sx={{ mx: 2, opacity: 0.7 }}>OR</Typography>
      <Box sx={{ flex: 1, height: "1px", background: "#ddd" }} />
    </Box>

    {/* Fields */}
    <TextField label="Username" fullWidth sx={{ mb: 2 }} />
    <TextField type="password" label="Password" fullWidth sx={{ mb: 3 }} />

    {/* Login button */}
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
    >
      Log in
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
    >
      Sign up
    </Button>
  </Box>
</Grid>

  </Grid>
);

}
