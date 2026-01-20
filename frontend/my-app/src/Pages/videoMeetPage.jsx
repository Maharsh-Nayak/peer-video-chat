import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  Button,
  TextField,
  IconButton,
  Card,
  Typography,
  Box,
  Tooltip,
  Paper,
  Avatar,
  Fade,
} from "@mui/material";

// Icons
import VideoCameraFrontIcon from "@mui/icons-material/VideoCameraFront";
import MicIcon from "@mui/icons-material/Mic";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicOffIcon from "@mui/icons-material/MicOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import ChatIcon from "@mui/icons-material/Chat";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import SendIcon from "@mui/icons-material/Send";

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
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const THEME_BG = "#111214";
const THEME_SURFACE = "#1c1f26";
const ACCENT_COLOR = "#3d5afe";

const MeetEntery = () => {

  let [isVideoAvailable, setIsVideoAvailable] = useState(true);
  let [isVideoOn, setIsVideoOn] = useState(true);
  let [videoStream, setVideoStream] = useState([]);
  let localVideoRef = useRef();
  let videoRef = useRef([]);
  let [videos, setVideos] = useState([]);
  
  let [isAudioAvailable, setIsAudioAvailable] = useState(true);
  let [isAudioOn, setIsAudioOn] = useState(true);
  const [audioStream, setAudioStream] = useState([]);
  
  let [isScreenOn, setIsScreenOn] = useState(false);

  let [askUserName, setAskUserName] = useState(true);
  let [joined, setJoined] = useState(false);
  let [userName, setUserName] = useState("");

  const [screenStream, setScreenStream] = useState(null);

  let [showModal, setShowModal] = useState();

  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [notifications, setNotifications] = useState(0);

  let socketRef = useRef();
  let socketIdRef = useRef();

  let [remoteUserNames, setRemoteUserNames] = useState([]);

  let peopleSize = 12;

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setAskUserName(false);
      setUserName(storedUser);
    }
  }, []); 

  let gotMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message)

    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
          if (signal.sdp.type === 'offer') {
            connections[fromId].createAnswer().then((description) => {
              connections[fromId].setLocalDescription(description).then(() => {
                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
              }).catch(e => console.log(e))
            }).catch(e => console.log(e))
          }
        }).catch(e => console.log(e))
      }

      if (signal.ice) {
        connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
      }
    }
  }

  let addMesaage = (id, username, message) => {
    setMessages((oldMessages) => [...oldMessages, {id, username, message }]);
    console.log("New message received: ", messages);
  };

  let connectToSocketServer = () => {
    socketRef.current = io.connect("https://peer-video-chat-y157.onrender.com", { secure: false });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", window.location.href, userName);
      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("message", addMesaage);

      socketRef.current.on("user-left", (id) => {
        console.log("User left");
        setVideos((prevStreams) => prevStreams.filter((video) => video.socketId !== id));
        videoRef.current = videoRef.current.filter((video => video.socketId !== id));
        if (connections[id]) {
          connections[id].close();
          delete connections[id];
        }
      });

      socketRef.current.on("user-joined", (id, userName) => {
        console.log("User joined: ", id);

        connections[id] = new RTCPeerConnection(peerConnectionConfig);
        connections[id].onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({
                ice: event.candidate,
              })
            );
          }
        };

        connections[id].onaddstream = (event) => {
          console.log("Video ref : " , videoRef.current)
          let videoExists = videoRef.current.find(
            (video) => video.socketId === id
          );

          if (videoExists) {
            console.log("FOUND EXISTING");

            setVideos((videos) => {
              const updatedVideos = videos.map((video) =>
                video.socketId === id
                  ? { ...video, stream: event.stream }
                  : video
              );
              videoRef.current = updatedVideos;
              return updatedVideos;
            });
          } else {
            console.log("CREATING NEW");
            let newVideo = {
              socketId: id,
              stream: event.stream,
              autoplay: true,
              playsinline: true,
            };

            setVideos((videos) => {
              const updatedVideos = [...videos, newVideo];
              videoRef.current = updatedVideos;
              return updatedVideos;
            });
          }

          console.log("CURRENT VIDEOS: ", videos);
        };

        if (window.localStream !== undefined && window.localStream !== null) {
          connections[id].addStream(window.localStream);
        } else {
          let blackSilence = (...args) =>
            new MediaStream([videoOffStream(...args), micOffStream()]);
          window.localStream = blackSilence();
          connections[id].addStream(window.localStream);
        }

        setRemoteUserNames((prevNames) => [...prevNames, {id: id, name: userName}]);
      });

      socketRef.current.on("joined-list", (idList, client) => {
        console.log("Joined list received: ", idList);

        for (let id in idList) {
          connections[idList[id]] = new RTCPeerConnection(peerConnectionConfig);
          connections[idList[id]].onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit(
                "signal",
                idList[id],
                JSON.stringify({
                  ice: event.candidate,
                })
              );
            }
          };

          connections[idList[id]].onaddstream = (event) => {
            let videoExists = videoRef.current.find(
              (video) => video.socketId === idList[id]
            );

            if (videoExists) {
              console.log("FOUND EXISTING");
              setVideos((videos) => {
                const updatedVideos = videos.map((video) =>
                  video.socketId === idList[id]
                    ? { ...video, stream: event.stream }
                    : video
                );
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            } else {
              console.log("CREATING NEW");
              let newVideo = {
                socketId: idList[id],
                stream: event.stream,
                autoplay: true,
                playsinline: true,
              };
              setVideos((videos) => {
                const updatedVideos = [...videos, newVideo];
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            }
          };

          if (window.localStream !== undefined && window.localStream !== null) {
            connections[idList[id]].addStream(window.localStream);
          } else {
            let blackSilence = (...args) =>
              new MediaStream([videoOffStream(...args), micOffStream()]);
            window.localStream = blackSilence();
            connections[idList[id]].addStream(window.localStream);
          }
        }
      });
    });
  };

  const getPermission = async () => {
    try {
      const videoPerm = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      if (videoPerm) {
        setIsVideoAvailable(true);
        setVideoStream(videoPerm);
      } else {
        setIsVideoAvailable(false);
        setVideoStream(null);
      }

      const audioPerm = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (audioPerm) {
        setIsAudioAvailable(true);
        setAudioStream(audioPerm);
      } else {
        setIsAudioAvailable(false);
        setAudioStream(null);
      }

      if (isVideoAvailable || isAudioAvailable) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoAvailable,
          audio: isAudioAvailable,
        });

        if (stream) {
          window.localStream = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      }
    } catch (err) {
      console.log("Error accessing media devices.", err);
    }
  };

  useEffect(() => {
    getPermission();
  }, []);

  useEffect(() => {
    if (videoStream !== undefined && audioStream !== undefined) {
      getUserMedia();
      console.log("SET STATE HAS ", videoStream, audioStream);
    }
  }, [videoStream, audioStream, isVideoOn, isAudioOn]);

  let getMedia = () => {
    setVideoStream(isVideoAvailable);
    setAudioStream(isAudioAvailable);
    connectToSocketServer();
  };

  let getUserMedia = () => {
    if ((videoStream && isVideoOn) || (audioStream && isAudioOn)) {
      navigator.mediaDevices
        .getUserMedia({ video: isVideoOn, audio: isAudioOn })
        .then(getUserMediaSuccess)
        .catch((e) => console.log(e));
    } else {
      try {
        let tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (e) {
        console.log(e);
      }
    }
  };

  let getUserMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => {
        track.stop();
      });
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    localVideoRef.current.srcObject = stream;

    for (let id in connections) {
      if (id == socketIdRef.current) continue;

      connections[id].addStream(window.localStream);
      connections[id].createOffer().then((description) => {
        connections[id].setLocalDescription(description).then(() => {
          socketRef.current.emit(
            "signal",
            id,
            JSON.stringify({ sdp: connections[id].localDescription })
          );
        });
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setIsAudioOn(false);
          setIsVideoOn(false);

          try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let newStream = new MediaStream([videoOffStream(), micOffStream()]);
          localVideoRef.current.srcObject = newStream;
          window.localStream = newStream;

          for (let id in connections) {
            if (id == socketIdRef.current) continue;

            connections[id].addStream(window.localStream);
            connections[id].createOffer().then((description) => {
              connections[id].setLocalDescription(description).then(() => {
                socketRef.current.emit(
                  "signal",
                  id,
                  JSON.stringify({ sdp: connections[id].localDescription })
                );
              });
            });
          }
        })
    );
  };

  function handleSendMessage() {
    if (message.trim() === "") return;
    socketRef.current.emit("message", window.location.href, message);
    setMessages((oldMessages) => [
      ...oldMessages,
      { id: socketIdRef.current, message: message },
    ]);
    setMessage("");
  }

  function videoOffStream() {
    let blanckScreen = Object.assign(document.createElement("canvas"), {
      width: 640,
      height: 480,
    });
    let context = blanckScreen.getContext("2d");
    context.fillStyle = "black";
    context.fillRect(0, 0, blanckScreen.width, blanckScreen.height);
    let videoStream = blanckScreen.captureStream(10);
    return Object.assign(videoStream.getVideoTracks()[0], { enabled: false });
  }

  let micOffStream = () => {
    let audioCtx = new AudioContext();
    let oscillator = audioCtx.createOscillator();
    let dst = oscillator.connect(audioCtx.createMediaStreamDestination());
    oscillator.start();
    let track = dst.stream.getAudioTracks()[0];
    return Object.assign(track, { enabled: false });
  };

  function toggleMic() {
    setIsAudioOn(!isAudioOn);
  }

  function toggleVideo() {
    setIsVideoOn(!isVideoOn);
  }

  let toggleScreen = () => {
    setIsScreenOn(!isScreenOn);
  };

  useEffect(() => {
      getUserScreen();
  }, [isScreenOn]);

  let getUserScreen = () => {
    if (isScreenOn) {
      navigator.mediaDevices
        .getDisplayMedia({ video: true, audio: true })
        .then(getUserScreenSuccess)
        .catch((e) => console.log(e));
    }
  };

  let getUserScreenSuccess = (stream) => {
    try{
      window.localStream.getTracks().forEach((track) => {
        track.stop();
      });
    }catch(e){
      console.log(e);
    }

    window.localStream = stream;
    localVideoRef.current.srcObject = stream;

    for (let id in connections) {
      if (id == socketIdRef.current) continue;

      connections[id].addStream(window.localStream);
      connections[id].createOffer().then((description) => {
        connections[id].setLocalDescription(description).then(() => {
          socketRef.current.emit(
            "signal",
            id,
            JSON.stringify({ sdp: connections[id].localDescription })
          );
        });
      });

      stream.getTracks().forEach(
        (track) =>
          (track.onended = () => {
            setIsScreenOn(false);

            try{
              let tracks = localVideoRef.current.srcObject.getTracks();
              tracks.forEach((track) => track.stop());
            }catch(e){
              console.log(e);
            }

            let newStream = new MediaStream([videoOffStream(), micOffStream()]);
            localVideoRef.current.srcObject = newStream;
            window.localStream = newStream;

            getUserMedia();
          })
      );
    }
  }

  let connect = () => {
    setJoined(true);
    getMedia();
  };

  let leaveCall = () => {
    socketRef.current.emit("disconect", window.location.href);
    
    if (window.localStream) {
      window.localStream.getTracks().forEach((track) => track.stop());
    }
    
    for (let id in connections) {
      connections[id].close();
      delete connections[id];
    }

    window.location.reload();

    setJoined(false);
    setVideos([]);
  }

  const mainContainerStyle = {
    height: "100vh",
    width: "100vw",
    backgroundColor: "#121212",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  const videoGridStyle = {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: "12px",
    padding: "20px",
    alignContent: "center",
    justifyContent: "center",
    overflowY: "auto",
  };

  const videoWrapperStyle = {
    position: "relative",
    borderRadius: "16px",
    overflow: "hidden",
    aspectRatio: "16/9",
    backgroundColor: "#1e1e1e",
    border: "2px solid #333",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  };

  const nameTagStyle = {
    position: "absolute",
    bottom: "12px",
    left: "12px",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    color: "white",
    padding: "4px 12px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "500",
  };

  const bottomBarStyle = {
    height: "80px",
    backgroundColor: "#1a1a1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
    borderTop: "1px solid #333",
  };

  return (
    <Box sx={{ height: "100vh", width: "100vw", bgcolor: THEME_BG, color: "white", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      
      {!joined ? (
        /* --- PRE-JOIN LOBBY --- */
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 3, background: "radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)" }}>
          <Card sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, width: "100%", maxWidth: "1100px", borderRadius: 6, bgcolor: "rgba(30, 30, 30, 0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", overflow: "hidden" }}>
            
            {/* Video Preview Side */}
            <Box sx={{ flex: 1.4, position: "relative", bgcolor: "#000", minHeight: "450px" }}>
              <video ref={localVideoRef} autoPlay muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
              
              {!isVideoOn && (
                <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#1a1a1a" }}>
                  <Avatar sx={{ width: 120, height: 120, bgcolor: ACCENT_COLOR, fontSize: "3rem" }}>{userName[0]?.toUpperCase() || "?"}</Avatar>
                </Box>
              )}

              <Box sx={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2, p: 1, borderRadius: 10, bgcolor: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)" }}>
                <IconButton onClick={toggleMic} sx={{ bgcolor: isAudioOn ? "rgba(255,255,255,0.1)" : "#ea4335", color: "white", "&:hover": { bgcolor: isAudioOn ? "rgba(255,255,255,0.2)" : "#d93025" } }}>
                  {isAudioOn ? <MicIcon /> : <MicOffIcon />}
                </IconButton>
                <IconButton onClick={toggleVideo} sx={{ bgcolor: isVideoOn ? "rgba(255,255,255,0.1)" : "#ea4335", color: "white", "&:hover": { bgcolor: isVideoOn ? "rgba(255,255,255,0.2)" : "#d93025" } }}>
                  {isVideoOn ? <VideoCameraFrontIcon /> : <VideocamOffIcon />}
                </IconButton>
              </Box>
            </Box>

            {/* Form Side */}
            <Box sx={{ flex: 1, p: 6, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
              <Box>
                <Typography variant="h4" fontWeight="800" sx={{ mb: 1, background: "linear-gradient(to right, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Ready to join?</Typography>
                <Typography variant="body1" color="grey.400">Check your audio and video settings.</Typography>
              </Box>

              <TextField 
                fullWidth label="Your Name" variant="filled" value={userName} onChange={(e) => setUserName(e.target.value)}
                sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: 2, "& .MuiInputBase-root": { color: "white" }, "& .MuiInputLabel-root": { color: "grey.500" } }}
              />

              <Button variant="contained" size="large" onClick={connect} disabled={!userName} sx={{ py: 2, borderRadius: 3, fontWeight: "bold", bgcolor: ACCENT_COLOR, fontSize: "1.1rem", textTransform: "none", boxShadow: `0 8px 20px ${ACCENT_COLOR}44` }}>
                Enter Meeting
              </Button>
            </Box>
          </Card>
        </Box>
      ) : (
        /* --- ACTIVE CALL INTERFACE --- */
        <>
         <Box sx={{ flex: 1, display: "flex", p: 2, gap: 2, overflow: "hidden", height: "100vh" }}>
  
  {/* Dynamic Video Grid Container */}
  <Box 
    sx={{ 
      flex: 1, 
      display: "grid", 
      p: 1, // Reduced padding to give videos more room
      gap: 2, 
      gridTemplateColumns: {
        xs: "1fr",
        // Logic: If sidebar is open, allow tiles to get smaller (min 300px) 
        // to prevent forcing a vertical scroll too early
        sm: (videos.length + 1) <= 1 ? "1fr" : 
            (videos.length + 1) === 2 ? "1fr 1fr" : 
            `repeat(auto-fit, minmax(${showModal ? '300px' : '400px'}, 1fr))`
      },
      gridAutoRows: "min-content",
      alignContent: "center", 
      justifyContent: "center",
      // Important: Ensure this container doesn't grow past parent
      overflow: "hidden", 
      width: "100%",
    }}
  >
    {/* Local Participant Tile */}
    <Paper 
      elevation={4}
      sx={{ 
        position: "relative", 
        borderRadius: 4, 
        overflow: "hidden", 
        bgcolor: THEME_SURFACE,
        aspectRatio: "16/9",
        border: "1px solid rgba(255,255,255,0.1)",
        // Prevents the video from becoming too tall and causing scroll
        maxHeight: "100%", 
      }}
    >
      <video 
        ref={localVideoRef} 
        autoPlay 
        muted 
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} 
      />
      <Box sx={{ position: "absolute", bottom: 12, left: 12, px: 1.5, py: 0.6, borderRadius: 2, bgcolor: "rgba(32, 33, 36, 0.75)", backdropFilter: "blur(10px)", color: "white", fontSize: "0.75rem" }}>
        You (Me)
      </Box>
    </Paper>

    {/* Remote Participant Tiles */}
    {videos.map((v) => (
      <Paper 
        key={v.socketId} 
        elevation={4}
        sx={{ 
          position: "relative", borderRadius: 4, overflow: "hidden", bgcolor: THEME_SURFACE, 
          aspectRatio: "16/9", border: "1px solid rgba(255,255,255,0.1)"
        }}
      >
        <video
          ref={(el) => { if (el && v.stream) el.srcObject = v.stream; }}
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <Box sx={{ position: "absolute", bottom: 12, left: 12, px: 1.5, py: 0.6, borderRadius: 2, bgcolor: "rgba(32, 33, 36, 0.75)", backdropFilter: "blur(10px)", color: "white", fontSize: "0.75rem" }}>
          {remoteUserNames.find(u => u.id === v.socketId)?.name || "Guest"}
        </Box>
      </Paper>
    ))}
  </Box>

  {/* Sidebar remains the same - Paper will naturally push the flex: 1 Box above */}
  {showModal && (
    <Fade in={showModal}>
      <Paper sx={{ width: 360, display: "flex", flexDirection: "column", borderRadius: 4, bgcolor: THEME_SURFACE, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <Box sx={{ p: 2, borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography fontWeight="700">Messages</Typography>
                    <IconButton size="small" onClick={() => setShowModal(false)} sx={{ color: "grey.500" }}>✕</IconButton>
                  </Box>
                  
                  <Box 
                    sx={{ 
                      flex: 1, 
                      p: 2, 
                      overflowY: "auto", 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: 1.5, // Slightly tighter gap for conversation flow
                      bgcolor: "transparent" 
                    }}
                  >
                    {messages.map((m, idx) => {
                      const isMe = m.id === socketIdRef.current;
                      
                      return (
                        <Box 
                          key={idx} 
                          sx={{ 
                            alignSelf: isMe ? "flex-end" : "flex-start", 
                            maxWidth: "75%", // Narrower bubbles are easier to read
                            display: "flex",
                            flexDirection: "column",
                            alignItems: isMe ? "flex-end" : "flex-start"
                          }}
                        >
                          {/* Username Label */}
                          {!isMe && (
                            <Typography 
                              variant="caption" 
                              sx={{ color: "rgba(255,255,255,0.5)", ml: 1, mb: 0.5, fontWeight: 'bold' }}
                            >
                              {m.username}
                            </Typography>
                          )}

                          <Paper 
                            elevation={0}
                            sx={{ 
                              p: "10px 16px", 
                              borderRadius: 3, 
                              // Custom border radius to create a "bubble" tail
                              borderBottomRightRadius: isMe ? 0 : 12,
                              borderBottomLeftRadius: isMe ? 12 : 0,
                              bgcolor: isMe ? ACCENT_COLOR : "rgba(255,255,255,0.12)", 
                              color: "white",
                              boxShadow: isMe ? "0 2px 8px rgba(0,0,0,0.2)" : "none"
                            }}
                          >
                            <Typography variant="body1" sx={{ lineHeight: 1.4, wordBreak: "break-word" }}>
                              {m.message}
                            </Typography>
                            
                            {/* Timestamp (Optional but recommended) */}
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: "block", 
                                textAlign: "right", 
                                fontSize: "0.65rem", 
                                mt: 0.5, 
                                opacity: 0.7 
                              }}
                            >
                              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Paper>
                        </Box>
                      );
                    })}
                  </Box>

                  <Box sx={{ p: 2, display: "flex", gap: 1 }}>
                    <TextField 
                      fullWidth size="small" placeholder="Send a message..." value={message} onChange={(e) => setMessage(e.target.value)}
                      sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: 2, input: { color: "white", fontSize: "0.9rem" } }}
                    />
                    <IconButton sx={{ bgcolor: ACCENT_COLOR, color: "white", "&:hover": { bgcolor: "#2a4ad9" } }}>
                      <SendIcon fontSize="small" onClick={handleSendMessage} />
                    </IconButton>
                  </Box>
      </Paper>
    </Fade>
  )}
</Box>

          {/* Control Bar */}
          <Box sx={{ height: 90, display: "flex", alignItems: "center", justifyContent: "center", gap: 2, px: 4, bgcolor: "rgba(17, 18, 20, 0.9)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            
            <Tooltip title={isAudioOn ? "Mute" : "Unmute"}>
              <IconButton onClick={toggleMic} sx={{ width: 52, height: 52, bgcolor: isAudioOn ? "rgba(255,255,255,0.08)" : "#ea4335", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}>
                {isAudioOn ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={isVideoOn ? "Stop Video" : "Start Video"}>
              <IconButton onClick={toggleVideo} sx={{ width: 52, height: 52, bgcolor: isVideoOn ? "rgba(255,255,255,0.08)" : "#ea4335", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}>
                {isVideoOn ? <VideoCameraFrontIcon /> : <VideocamOffIcon />}
              </IconButton>
            </Tooltip>

            {/* <Box sx={{ width: 1, height: 32, mx: 1, bgcolor: "rgba(255,255,255,0.1)" }} /> */}

            <Tooltip title="Share Screen">
              <IconButton onClick={toggleScreen} sx={{ width: 52, height: 52, bgcolor: isScreenOn ? ACCENT_COLOR : "rgba(255,255,255,0.08)", color: "white" }}>
                <ScreenShareIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Chat">
              <IconButton onClick={() => setShowModal(!showModal)} sx={{ width: 52, height: 52, bgcolor: showModal ? ACCENT_COLOR : "rgba(255,255,255,0.08)", color: "white" }}>
                <ChatIcon />
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              onClick={leaveCall}
              sx={{ ml: 4, borderRadius: 8, px: 4, py: 1.2, bgcolor: "#ea4335", fontWeight: "700", textTransform: "none", "&:hover": { bgcolor: "#d93025" } }}
              startIcon={<CallEndIcon />}
            >
              Leave
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default MeetEntery;
