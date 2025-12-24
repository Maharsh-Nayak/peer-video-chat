import "../App.css";
import { Avatar } from "@mui/material";
import React from "react";
import { Box, Typography } from "@mui/material";
import Button from '@mui/material/Button';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import TextField from '@mui/material/TextField';
import { useNavigate } from "react-router-dom";
import Paper from '@mui/material/Paper';

export function Dashboard() {

    function meetCodeGenerator(){
        const array = new Uint8Array(5);
        window.crypto.getRandomValues(array);
        
        const raw = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        
        return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6, 9)}`;
    }

    const navigate = useNavigate();

    return (
        <div className="Dashboard">
            <nav className="navbar">
                <h2 className="logo">Zoom</h2>
                <Box sx={{display:"flex", alignItems:"center"}}>
                    <div className="nav-links">
                        <p className="link">About Us</p>
                        <Avatar>{localStorage.getItem('user')[0]}</Avatar>
                    </div>
                    <Button variant="contained" sx={{marginLeft:"20px", borderRadius:"20px"}} onClick={() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        navigate('/');
                    }}>Logout</Button>
                </Box>
            </nav>

            <div className="main">
                <Box sx={{margin:"auto", textAlign:"center"}}>
                    <Box sx={{mb:4}}>
                        <Typography variant="h3" gutterBottom>
                            Video calls and meetings for everyone
                        </Typography>
                        <Typography variant="h5">
                            Connect with friends, family, and colleagues from anywhere in the world with our easy-to-use video calling platform.
                        </Typography>
                    </Box>
                    <Box mb={4}>
                        <div className="Joinmeet" style={{ display: "flex", gap: "40px", marginTop: "20px", justifyContent:"center" }}>
                            <Button variant="contained" endIcon={<VideoCallIcon />} sx={{borderRadius:"20px"}} onClick={() => {
                                const meetCode = meetCodeGenerator();
                                navigate(`/meet/${meetCode}`);
                            }}>
                                Start a Meeting
                            </Button>
                            <div className="joinCode" style={{ display: "flex", gap: "10px", justifyContent:"center" }}>
                                <TextField id="outlined-basic" label="Enter meet code" variant="outlined" />
                                <Button variant="outlined" sx={{borderRadius:"20px"}} onClick={() => {
                                    const meetCode = document.getElementById("outlined-basic").value;
                                    if(meetCode!=="")
                                    navigate(`/meet/${meetCode}`);
                                }}>
                                    Join Meeting
                                </Button>
                            </div>
                        </div>
                    </Box>
                    <Paper elevation={10} sx={{display:"inline-block", padding:"20px", borderRadius:"20px", width:"40%"}}>
                        <img src="/Dashboard_image.jpg" alt="Dashboard" style={{width:"100%", marginTop:"40px"}} />
                    </Paper>
                </Box>
            </div>
        </div>
    );
}