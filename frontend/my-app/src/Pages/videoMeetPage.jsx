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
} from "@mui/material";

// Icons
import VideoCameraFrontIcon from "@mui/icons-material/VideoCameraFront";
import MicIcon from "@mui/icons-material/Mic";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicOffIcon from "@mui/icons-material/MicOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import ChatIcon from "@mui/icons-material/Chat";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";

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
  
  let [isScreenAvailable, setIsScreenAvailable] = useState(false);
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

  let addMesaage = (id, message) => {
    setMessages((oldMessages) => [...oldMessages, { id, message }]);
  };

  let connectToSocketServer = () => {
    socketRef.current = io.connect("http://localhost:5000", { secure: false });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", window.location.href, userName);
      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMesaage);

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

      if (navigator.mediaDevices.getDisplayMedia) {
        setIsScreenAvailable(true);
      } else {
        setIsScreenAvailable(false);
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
    <Box sx={mainContainerStyle}>
      {!joined ? (
        // --- PRE-JOIN SCREEN ---
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)" }}>
          <Card sx={{ display: "flex", p: 4, borderRadius: 4, width: "90%", maxWidth: "1000px", boxShadow: 24 }}>
            <Box sx={{ flex: 1.5, mr: 3, borderRadius: 3, overflow: "hidden", position: "relative", bgcolor: "black", height: "400px" }}>
              <video ref={localVideoRef} autoPlay muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
              <Box sx={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2, bgcolor: "rgba(0,0,0,0.7)", p: 1.5, borderRadius: 10 }}>
                <IconButton onClick={toggleMic} sx={{ color: isAudioOn ? "white" : "#ff5252" }}>
                  {isAudioOn ? <MicIcon /> : <MicOffIcon />}
                </IconButton>
                <IconButton onClick={toggleVideo} sx={{ color: isVideoOn ? "white" : "#ff5252" }}>
                  {isVideoOn ? <VideoCameraFrontIcon /> : <VideocamOffIcon />}
                </IconButton>
              </Box>
            </Box>
            
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
              <Typography variant="h4" fontWeight="700" color="primary.main">Ready to join?</Typography>
              <TextField 
                label="What's your name?" 
                variant="filled" 
                fullWidth 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)} 
                sx={{ bgcolor: "#f5f5f5", borderRadius: 1 }}
              />
              <Button variant="contained" size="large" onClick={connect} sx={{ py: 1.5, borderRadius: 2, fontWeight: "bold", fontSize: "1.1rem" }}>
                Join Meeting
              </Button>
            </Box>
          </Card>
        </Box>
      ) : (
        // --- IN-CALL SCREEN ---
        <>
          <Box sx={videoGridStyle}>
            {/* Local User */}
            <Box sx={videoWrapperStyle}>
              <video ref={localVideoRef} autoPlay muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
              <Box sx={nameTagStyle}>You (Me)</Box>
            </Box>

            {/* Remote Users */}
            {videos.map((video) => (
              <Box key={video.socketId} sx={videoWrapperStyle}>
                <video
                  ref={(ref) => { if (ref && video.stream) ref.srcObject = video.stream; }}
                  autoPlay
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <Box sx={nameTagStyle}>
                  Participant: {remoteUserNames.find(user => user.id === video.socketId)?.name || "Unknown"}
                </Box>
              </Box>
            ))}
          </Box>

          {/* Persistent Control Bar */}
          <Box sx={bottomBarStyle}>
            <Tooltip title={isAudioOn ? "Mute" : "Unmute"}>
              <IconButton onClick={toggleMic} sx={{ bgcolor: isAudioOn ? "#333" : "#ea4335", color: "white", "&:hover": { bgcolor: isAudioOn ? "#444" : "#d93025" } }}>
                {isAudioOn ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={isVideoOn ? "Stop Video" : "Start Video"}>
              <IconButton onClick={toggleVideo} sx={{ bgcolor: isVideoOn ? "#333" : "#ea4335", color: "white", "&:hover": { bgcolor: isVideoOn ? "#444" : "#d93025" } }}>
                {isVideoOn ? <VideoCameraFrontIcon /> : <VideocamOffIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Share Screen">
              <IconButton sx={{ bgcolor: "#333", color: "white" }}>
                <ScreenShareIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Chat">
              <IconButton sx={{ bgcolor: "#333", color: "white" }}>
                <ChatIcon />
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              color="error"
              startIcon={<CallEndIcon />}
              onClick={leaveCall}
              sx={{ borderRadius: "20px", px: 4, fontWeight: "bold" }}
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
