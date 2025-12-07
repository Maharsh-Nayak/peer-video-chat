import VideoCameraFrontIcon from "@mui/icons-material/VideoCameraFront";
import MicIcon from "@mui/icons-material/Mic";
import {
  Button,
  TextField,
  IconButton,
  ButtonGroup,
  Card,
  CardContent,
  Typography,
  Stack,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";


var connections = {};

// WebRTC connection configuration:
// The `iceServers` field tells WebRTC how to discover the best network path
// between two devices. Since most users are behind routers or firewalls (NAT),
// WebRTC cannot directly know each peer's public IP address.
// 
// To solve that, WebRTC contacts a STUN (Session Traversal Utilities for NAT)
// server. The STUN server responds with the device's public IP and port,
// allowing WebRTC to generate "ICE candidates"—possible connection routes.
// 
// These ICE candidates are then shared with the remote peer through the
// signaling channel (like WebSockets). If a direct peer-to-peer connection
// is possible, WebRTC uses it. If not, typically a TURN server is needed,
// but here we only use a public STUN server provided by Google.
// 
// Summary: This config allows WebRTC to perform NAT traversal and establish
// a real-time peer-to-peer connection using the public STUN server.
const peerConnectionConfig = {
    iceServers: [
        {urls: 'stun:stun.l.google.com:19302'}
    ]
};

const MeetEntery = () => {
  let [isVideoAvailable, setIsVideoAvailable] = useState(true);
  let [isAudioAvailable, setIsAudioAvailable] = useState(true);
  let [isVideoOn, setIsVideoOn] = useState(true);
  let [isAudioOn, setIsAudioOn] = useState(true);
  let [isScreenAvailable, setIsScreenAvailable] = useState(false);
  let [isScreenOn, setIsScreenOn] = useState(false);

  let [askUserName, setAskUserName] = useState(true);
  let [userName, setUserName] = useState("");

  const [videoStream, setVideoStream] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);

  let [showModal, setShowModal] = useState();

  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [notifications, setNotifications] = useState(0);


  let localVideoRef = useRef();
  let socketRef = useRef();
  let socketIdRef = useRef();



  const getPermission = async () => {
    try{
        const videoPerm = await navigator.mediaDevices.getUserMedia({video: true});
        if(videoPerm){
            setIsVideoAvailable(true);
            setVideoStream(videoPerm);
        }else{
            setIsVideoAvailable(false);
            setVideoStream(null);
        }
        
        const audioPerm = await navigator.mediaDevices.getUserMedia({audio: true});
        if(audioPerm){
            setIsAudioAvailable(true);
            setAudioStream(audioPerm);
        }else{
            setIsAudioAvailable(false);
            setAudioStream(null);
        }

        if(navigator.mediaDevices.getDisplayMedia){
            setIsScreenAvailable(true);
        }else{
            setIsScreenAvailable(false);
        }

        if(isVideoAvailable || isAudioAvailable){
            const stream = await navigator.mediaDevices.getUserMedia({
                video: isVideoAvailable,
                audio: isAudioAvailable
            });

            if(stream){
                window.localStream = stream;
                if(localVideoRef.current){
                    localVideoRef.current.srcObject = stream;
                }    
            }
        }
    }catch(err){
        console.log("Error accessing media devices.", err);
    }
  }

  useEffect(() => {
    getPermission();
  }, [])

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        padding: "20px",
        background: "#f4f5f7",
      }}
    >
      <Card
        style={{
          display: "flex",
          flexDirection: "row",
          padding: "20px",
          borderRadius: "14px",
          width: "80%",
          maxWidth: "1200px",
          boxShadow: "0px 4px 20px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            flex: 2,
            marginRight: "20px",
            borderRadius: "12px",
            overflow: "hidden",
            position: "relative",
            background: "#000",
            height: "400px",
          }}
        >
          <video
            ref={localVideoRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            autoPlay
            muted
          />
          
          <div
            style={{
              position: "absolute",
              bottom: "15px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "15px",
              background: "rgba(0,0,0,0.5)",
              padding: "10px 20px",
              borderRadius: "30px",
            }}
          >
            <IconButton style={{ color: "white" }} onClick={() => {setIsAudioOn(true)}}>
              <MicIcon />
            </IconButton>

            <IconButton style={{ color: "white" }} onClick={() => {setIsVideoOn(true)}}>
              <VideoCameraFrontIcon />
            </IconButton>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "20px",
          }}
        >
          <Typography variant="h4" fontWeight="600">
            Join Meeting
          </Typography>
          
          <TextField
            label="Enter your name"
            variant="outlined"
            fullWidth
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />

          <Button variant="contained" size="large" fullWidth>
            Join
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MeetEntery;
