import { createContext, useContext } from "react";
import axios from "axios";
import HttpStatus from "http-status-codes";
import React from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: "http://localhost:5000/api/user",
});

export const AuthProvider = ({ children }) => {
    
    const authContext = useContext(AuthContext);
    const [user, setUser] = React.useState(authContext);

    const router = useNavigate();
    
    const handleRegister = async( userName, email, password) => {
        try{
            const respose = await client.post("/register", {
                usename:userName,
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
                return response.data.token;
            }
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

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