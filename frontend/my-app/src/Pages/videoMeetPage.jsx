import VideoCameraFrontIcon from "@mui/icons-material/VideoCameraFront";
import MicIcon from "@mui/icons-material/Mic";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicOffIcon from "@mui/icons-material/MicOff";
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
import { connect, io } from "socket.io-client";

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
  let [isAudioAvailable, setIsAudioAvailable] = useState(true);
  let [isVideoOn, setIsVideoOn] = useState(true);
  let [isAudioOn, setIsAudioOn] = useState(true);
  let [isScreenAvailable, setIsScreenAvailable] = useState(false);
  let [isScreenOn, setIsScreenOn] = useState(false);

  let [askUserName, setAskUserName] = useState(true);
  let [joined, setJoined] = useState(false);
  let [userName, setUserName] = useState("");

  const [videoStream, setVideoStream] = useState([]);
  const [audioStream, setAudioStream] = useState([]);
  const [screenStream, setScreenStream] = useState(null);

  let [showModal, setShowModal] = useState();

  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [notifications, setNotifications] = useState(0);

  let localVideoRef = useRef();
  let socketRef = useRef();
  let socketIdRef = useRef();

  let gotMessageFromServer = (fromId, message) => {
    console.log("Got message from server", fromId, message);
  };

  let addMesaage = (id, message) => {
    setMessages((oldMessages) => [...oldMessages, { id, message }]);
  };

  let connectToSocketServer = () => {
    socketRef.current = io.connect("http://localhost:5000", { secure: false });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", window.location.href);
      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMesaage);

      socketRef.current.on("user-left", (id) => {
        console.log("User left");
        setVideoStream((prevStreams) => {
          prevStreams.filter((stream) => stream.id !== id);
        });
      });

      socketRef.current.on("user-joined", (id, client) => {
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
          let videoExists = videoStream.current.find(
            (video) => video.socketId === id
          );

          if (videoExists) {
            console.log("FOUND EXISTING");

            setVideoStream((videos) => {
              const updatedVideos = videos.map((video) =>
                video.socketId === id
                  ? { ...video, stream: event.stream }
                  : video
              );
              videoStream.current = updatedVideos;
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

            setVideoStream((videos) => {
              const updatedVideos = [...videos, newVideo];
              videoStream.current = updatedVideos;
              return updatedVideos;
            });
          }
        };

        if (window.localStream !== undefined && window.localStream !== null) {
          connections[id].addStream(window.localStream);
        } else {
          let blackSilence = (...args) =>
            new MediaStream([videoOffStream(...args), micOffStream()]);
          window.localStream = blackSilence();
          connections[id].addStream(window.localStream);
        }
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
            let videoExists = videoStream.current.find(
              (video) => video.socketId === idList[id]
            );

            if (videoExists) {
              console.log("FOUND EXISTING");
              setVideoStream((videos) => {
                const updatedVideos = videos.map((video) =>
                  video.socketId === idList[id]
                    ? { ...video, stream: event.stream }
                    : video
                );
                videoStream.current = updatedVideos;
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
              setVideoStream((videos) => {
                const updatedVideos = [...videos, newVideo];
                videoStream.current = updatedVideos;
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

  return (
    <>
      {!joined ? (
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
                <IconButton
                  style={{ color: "white" }}
                  onClick={() => {
                    toggleMic();
                  }}
                >
                  {isAudioOn ? <MicIcon /> : <MicOffIcon />}
                </IconButton>

                <IconButton
                  style={{ color: "white" }}
                  onClick={() => {
                    toggleVideo();
                  }}
                >
                  {isVideoOn ? <VideoCameraFrontIcon /> : <VideocamOffIcon />}
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

              {askUserName ? (
                <TextField
                  label="Enter your name"
                  variant="outlined"
                  fullWidth
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              ) : null}

              <Button variant="contained" size="large" fullWidth onClick={connect}>
                Join
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <div>
          <video ref={localVideoRef} autoPlay muted></video>

          <div>
            {videoStream.map((video) => (
                <div key={video.socketId}>
                    <video

                        data-socket={video.socketId}
                        ref={ref => {
                            if (ref && video.stream) {
                                ref.srcObject = video.stream;
                            }
                        }}
                        autoPlay
                    >
                    </video>
                </div>

            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default MeetEntery;
