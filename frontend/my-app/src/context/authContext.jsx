import { createContext, useContext } from "react";
import axios from "axios";
import HttpStatus from "http-status-codes";
import React from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: "https://peer-video-chat-y157.onrender.com/api/user",
});

export const AuthProvider = ({ children }) => {
    
    const authContext = useContext(AuthContext);
    const [user, setUser] = React.useState(authContext);

    const router = useNavigate();
    
    const handleRegister = async( userName, email, password) => {
        try{
            const respose = await client.post("/register", {
                username:userName,
                email:email,
                password:password,
            });

            if(respose.status === HttpStatus.CREATED) {
                console.log("Registration successful:", respose.data);
                return respose.data.message;
            }
        } catch (error) {
            console.error("Registration failed:", error);
            throw error;
        }
    };

    const handleLogin = async (userName, password) => {
        try {
            const response = await client.post("/login", {
                username: userName,
                password: password,
            });
            if (response.status === HttpStatus.OK) {
                console.log("Login successful:", response.data);
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', response.data.user);
                setUser(response.data.user);
                return response.data.token;
            }
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const handleGoogleLogin = async (token) => {
        try {
            const response = await axios.post("https://helpful-puppy-444ddb.netlify.app/api/google-login", {
                token: token // Send the credential string from Google
            });
            
            if (response.status === 200) {
                localStorage.setItem("token", response.data.token);
                return true;
            }
        } catch (err) {
            console.log(err);
            return false;
        }
    }

    const data = {
        user,
        setUser,
        handleRegister,
        handleLogin,
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
    
}