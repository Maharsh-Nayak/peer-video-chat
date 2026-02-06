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
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import StopIcon from "@mui/icons-material/Stop";

var connections = {};
var connectionStates = {}; // Track connection states for monitoring

// Enhanced WebRTC configuration with STUN and TURN servers
// STUN: For NAT traversal (discovers public IP)
// TURN: For relaying when direct connection fails (behind restrictive firewalls)
const peerConnectionConfig = {
  iceServers: [
    // Primary STUN servers (for NAT traversal)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    
    // Public TURN server (fallback option)
    // Note: In production, use your own TURN server for privacy and reliability
    {
      urls: ["turn:numb.viagenie.ca"],
      credential: "muazkh",
      username: "webrtc@live.com"
    }
  ],
  
  // Optimization: Enable data channel
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
  iceCandidatePoolSize: 10
};

const THEME_BG = "#111214";
const THEME_SURFACE = "#1c1f26";
const ACCENT_COLOR = "#3d5afe";

// LOW-LATENCY OPTIMIZATION: Optimized media constraints
const VIDEO_CONSTRAINTS = {
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
  frameRate: { ideal: 30, max: 60 },  // High FPS for low latency
  facingMode: "user"
};

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,      // Critical for low-latency calls
  noiseSuppression: true,      // Reduces processing delay
  autoGainControl: true,       // Automatic volume adjustment
  latency: { ideal: 0.01 },    // Target 10ms latency
  sampleRate: 48000,           // Optimal for Opus codec
  channelCount: 1              // Mono = half bandwidth = lower latency
};

// LOW-LATENCY: SDP manipulation to prioritize H.264 codec (hardware accelerated)
const preferH264Codec = (sdp) => {
  // H.264 has lower latency than VP8/VP9 due to hardware encoding/decoding
  const h264PayloadType = sdp.match(/a=rtpmap:(\d+) H264\/90000/)?.[1];
  
  if (!h264PayloadType) return sdp; // H.264 not available
  
  // Reorder codecs to prioritize H.264
  const lines = sdp.split('\r\n');
  const mLineIndex = lines.findIndex(line => line.startsWith('m=video'));
  
  if (mLineIndex !== -1) {
    const mLine = lines[mLineIndex];
    const elements = mLine.split(' ');
    const payloadTypes = elements.slice(3);
    
    // Move H.264 to front
    const reorderedPayloads = [
      h264PayloadType,
      ...payloadTypes.filter(pt => pt !== h264PayloadType)
    ];
    
    lines[mLineIndex] = elements.slice(0, 3).join(' ') + ' ' + reorderedPayloads.join(' ');
  }
  
  return lines.join('\r\n');
};

// LOW-LATENCY: Set bitrate limits for adaptive quality
const setBitrateLimit = (sdp, bitrateKbps = 2500) => {
  const lines = sdp.split('\r\n');
  const videoMLineIndex = lines.findIndex(line => line.startsWith('m=video'));
  
  if (videoMLineIndex !== -1) {
    // Find codec line after m=video
    for (let i = videoMLineIndex + 1; i < lines.length; i++) {
      if (lines[i].startsWith('m=')) break;
      if (lines[i].includes('rtpmap')) {
        // Add bandwidth limit
        lines.splice(i + 1, 0, `b=AS:${bitrateKbps}`);
        lines.splice(i + 2, 0, `b=TIAS:${bitrateKbps * 1000}`);
        break;
      }
    }
  }
  
  return lines.join('\r\n');
};

// ENHANCED: Helper function to attempt WebRTC reconnection
const attemptReconnection = (peerId, socketRef, peerConnectionConfig, window) => {
  console.log(`Attempting to reconnect to peer ${peerId}...`);
  
  // Close existing connection
  if (connections[peerId]) {
    try {
      connections[peerId].close();
    } catch (e) {
      console.warn("Error closing existing connection:", e);
    }
    delete connections[peerId];
  }
  
  // Request peer to re-exchange SDP
  if (socketRef.current) {
    socketRef.current.emit("reconnect_request", peerId);
  }
};

// LOW-LATENCY: Adaptive bitrate control based on network conditions
const enableAdaptiveBitrate = (peerId) => {
  const connection = connections[peerId];
  if (!connection) return;
  
  // Monitor stats and adjust bitrate every 3 seconds
  setInterval(async () => {
    try {
      const stats = await connection.getStats();
      let inboundRtp = null;
      
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          inboundRtp = report;
        }
      });
      
      if (!inboundRtp) return;
      
      // Calculate packet loss percentage
      const packetsLost = inboundRtp.packetsLost || 0;
      const packetsReceived = inboundRtp.packetsReceived || 0;
      const totalPackets = packetsLost + packetsReceived;
      const packetLossRate = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;
      
      // Get sender to adjust bitrate
      const senders = connection.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      
      if (videoSender) {
        const parameters = videoSender.getParameters();
        
        if (!parameters.encodings || parameters.encodings.length === 0) {
          parameters.encodings = [{}];
        }
        
        // Adjust bitrate based on packet loss
        if (packetLossRate > 5) {
          // High packet loss - reduce bitrate by 20%
          parameters.encodings[0].maxBitrate = parameters.encodings[0].maxBitrate 
            ? parameters.encodings[0].maxBitrate * 0.8 
            : 2000000; // 2 Mbps default
          console.log(`[ADAPTIVE] High packet loss (${packetLossRate.toFixed(2)}%) - reducing bitrate to ${parameters.encodings[0].maxBitrate / 1000} kbps`);
        } else if (packetLossRate < 1) {
          // Low packet loss - increase bitrate by 10% (max 2.5 Mbps)
          parameters.encodings[0].maxBitrate = Math.min(
            parameters.encodings[0].maxBitrate ? parameters.encodings[0].maxBitrate * 1.1 : 2000000,
            2500000
          );
          console.log(`[ADAPTIVE] Low packet loss (${packetLossRate.toFixed(2)}%) - increasing bitrate to ${parameters.encodings[0].maxBitrate / 1000} kbps`);
        }
        
        await videoSender.setParameters(parameters);
      }
    } catch (error) {
      console.warn(`[ADAPTIVE] Error adjusting bitrate for ${peerId}:`, error);
    }
  }, 3000); // Check every 3 seconds
};

// ENHANCED: Connection quality monitoring
var connectionQuality = {}; // Track quality metrics per connection
const monitorConnectionQuality = async (peerId, connection) => {
  if (!connection || !connection.getStats) return;
  
  try {
    const stats = await connection.getStats();
    let videoStats = {
      bandwidth: 0,
      bytesReceived: 0,
      bytesSent: 0,
      packetsLost: 0,
      jitter: 0,
      latency: 0,
      frameWidth: 0,
      frameHeight: 0,
      framesPerSecond: 0,
    };
    
    let inboundRTPStats = null;
    let outboundRTPStats = null;
    let candidatePairStats = null;
    
    stats.forEach(report => {
      // Inbound RTP (receiving video/audio)
      if (report.type === "inbound-rtp" && report.mediaType === "video") {
        inboundRTPStats = report;
        videoStats.bytesReceived = report.bytesReceived || 0;
        videoStats.packetsLost = report.packetsLost || 0;
        videoStats.jitter = (report.jitter * 1000).toFixed(2) || 0; // Convert to ms
        videoStats.frameWidth = report.frameWidth || 0;
        videoStats.frameHeight = report.frameHeight || 0;
        videoStats.framesPerSecond = report.framesPerSecond || 0;
      }
      
      // Outbound RTP (sending video/audio)
      if (report.type === "outbound-rtp" && report.mediaType === "video") {
        outboundRTPStats = report;
        videoStats.bytesSent = report.bytesSent || 0;
      }
      
      // Candidate pair (connection latency)
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        candidatePairStats = report;
        videoStats.latency = report.currentRoundTripTime
          ? (report.currentRoundTripTime * 1000).toFixed(0) // Convert to ms
          : 0;
      }
    });
    
    // Calculate bandwidth (bytes per second)
    if (!connectionQuality[peerId]) {
      connectionQuality[peerId] = {
        lastBytesReceived: 0,
        lastBytesSent: 0,
        lastTimestamp: Date.now(),
      };
    }
    
    const currentTime = Date.now();
    const timeDiff = (currentTime - connectionQuality[peerId].lastTimestamp) / 1000; // seconds
    
    if (timeDiff > 0) {
      const receiveBandwidth = (
        (videoStats.bytesReceived - connectionQuality[peerId].lastBytesReceived) /
        timeDiff /
        1024 / // Convert to KB
        1024   // Convert to MB
      ).toFixed(2);
      
      const sendBandwidth = (
        (videoStats.bytesSent - connectionQuality[peerId].lastBytesSent) /
        timeDiff /
        1024 / // Convert to KB
        1024   // Convert to MB
      ).toFixed(2);
      
      videoStats.bandwidth = `⬇️ ${receiveBandwidth} MB/s ⬆️ ${sendBandwidth} MB/s`;
    }
    
    // Update connection quality tracking
    connectionQuality[peerId] = {
      ...connectionQuality[peerId],
      lastBytesReceived: videoStats.bytesReceived,
      lastBytesSent: videoStats.bytesSent,
      lastTimestamp: currentTime,
      ...videoStats,
    };
    
    // Log quality metrics
    console.log(`[Quality] Peer: ${peerId}`, {
      bandwidth: videoStats.bandwidth,
      latency: `${videoStats.latency}ms`,
      jitter: `${videoStats.jitter}ms`,
      packetsLost: videoStats.packetsLost,
      resolution: `${videoStats.frameWidth}x${videoStats.frameHeight}`,
      fps: videoStats.framesPerSecond,
    });
    
    return connectionQuality[peerId];
  } catch (error) {
    console.error(`Error monitoring quality for peer ${peerId}:`, error);
  }
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
  
  let [isScreenOn, setIsScreenOn] = useState(false);

  let [askUserName, setAskUserName] = useState(true);
  let [joined, setJoined] = useState(false);
  let [userName, setUserName] = useState("");

  const [screenStream, setScreenStream] = useState(null);

  let [showModal, setShowModal] = useState();

  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [notifications, setNotifications] = useState(0);

  // ENHANCED: Connection quality monitoring
  let [connectionQualityStats, setConnectionQualityStats] = useState({});
  let qualityMonitorIntervalRef = useRef(null);

  // RECORDING: State management
  let [isRecording, setIsRecording] = useState(false);
  let [recordedChunks, setRecordedChunks] = useState([]);
  let mediaRecorderRef = useRef(null);
  let [recordingTime, setRecordingTime] = useState(0);
  let recordingTimerRef = useRef(null);

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
  
  // ENHANCED: Set up connection quality monitoring
  useEffect(() => {
    // Monitor connection quality every 2 seconds
    qualityMonitorIntervalRef.current = setInterval(async () => {
      const qualityMetrics = {};
      
      // Monitor all active connections
      for (let peerId in connections) {
        const quality = await monitorConnectionQuality(peerId, connections[peerId]);
        if (quality) {
          qualityMetrics[peerId] = quality;
        }
      }
      
      if (Object.keys(qualityMetrics).length > 0) {
        setConnectionQualityStats(qualityMetrics);
      }
    }, 2000); // Update every 2 seconds
    
    // Cleanup
    return () => {
      if (qualityMonitorIntervalRef.current) {
        clearInterval(qualityMonitorIntervalRef.current);
      }
    };
  }, []);
 

  let gotMessageFromServer = (fromId, message) => {
    try {
      var signal = JSON.parse(message);

      if (fromId !== socketIdRef.current) {
        if (signal.sdp) {
          if (!connections[fromId]) {
            console.error(`No connection found for peer ${fromId}`);
            return;
          }

          connections[fromId]
            .setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .then(() => {
              if (signal.sdp.type === "offer") {
                connections[fromId]
                  .createAnswer()
                  .then((description) => {
                    connections[fromId]
                      .setLocalDescription(description)
                      .then(() => {
                        socketRef.current.emit(
                          "signal",
                          fromId,
                          JSON.stringify({
                            sdp: connections[fromId].localDescription,
                          })
                        );
                      })
                      .catch((e) => {
                        console.error(
                          `Error setting local description for ${fromId}:`,
                          e
                        );
                      });
                  })
                  .catch((e) => {
                    console.error(`Error creating answer for ${fromId}:`, e);
                  });
              }
            })
            .catch((e) => {
              console.error(
                `Error setting remote description for ${fromId}:`,
                e
              );
            });
        }

        if (signal.ice) {
          if (!connections[fromId]) {
            console.error(`No connection found for ICE candidate from ${fromId}`);
            return;
          }

          connections[fromId]
            .addIceCandidate(new RTCIceCandidate(signal.ice))
            .catch((e) => {
              console.warn(`Error adding ICE candidate from ${fromId}:`, e);
            });
        }
      }
    } catch (error) {
      console.error("Error processing message from server:", error);
    }
  };

  let addMesaage = (id, username, message) => {
    setMessages((oldMessages) => [...oldMessages, {id, username, message }]);
    console.log("New message received: ", messages);
  };

  let connectToSocketServer = () => {
    // ENHANCED: Use environment variable for Socket.IO server URL
    const SOCKET_SERVER = process.env.REACT_APP_SOCKET_SERVER || "https://peer-video-chat-y157.onrender.com";
    
    socketRef.current = io.connect(SOCKET_SERVER, { 
      secure: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socketRef.current.on("signal", gotMessageFromServer);

    // ENHANCED: Connection event handlers
    socketRef.current.on("connect", () => {
      console.log("Socket.IO connected:", socketRef.current.id);
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
        
        // ENHANCED: Monitor connection state
        connectionStates[id] = {
          iceConnectionState: "new",
          connectionState: "new",
          signalingState: "stable"
        };
        
        connections[id].oniceconnectionstatechange = () => {
          const iceState = connections[id].iceConnectionState;
          connectionStates[id].iceConnectionState = iceState;
          console.log(`[${id}] ICE Connection State: ${iceState}`);
          
          if (iceState === "failed") {
            console.warn(`Connection to ${id} failed. Attempting reconnection...`);
            // ENHANCED: Attempt reconnection
            setTimeout(() => {
              attemptReconnection(id, socketRef, peerConnectionConfig, window);
            }, 2000); // Wait 2 seconds before attempting reconnection
          } else if (iceState === "disconnected") {
            console.warn(`Connection to ${id} disconnected. Waiting for recovery...`);
          } else if (iceState === "connected" || iceState === "completed") {
            console.log(`Connection to ${id} established successfully`);
          }
        };
        
        connections[id].onconnectionstatechange = () => {
          const connState = connections[id].connectionState;
          connectionStates[id].connectionState = connState;
          console.log(`[${id}] Connection State: ${connState}`);
        };
        
        connections[id].onsignalingstatechange = () => {
          const sigState = connections[id].signalingState;
          connectionStates[id].signalingState = sigState;
          console.log(`[${id}] Signaling State: ${sigState}`);
        };
        
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
          
          // ENHANCED: Monitor connection state
          connectionStates[idList[id]] = {
            iceConnectionState: "new",
            connectionState: "new",
            signalingState: "stable"
          };
          
          connections[idList[id]].oniceconnectionstatechange = () => {
            const iceState = connections[idList[id]].iceConnectionState;
            connectionStates[idList[id]].iceConnectionState = iceState;
            console.log(`[${idList[id]}] ICE Connection State: ${iceState}`);
          };
          
          connections[idList[id]].onconnectionstatechange = () => {
            const connState = connections[idList[id]].connectionState;
            connectionStates[idList[id]].connectionState = connState;
            console.log(`[${idList[id]}] Connection State: ${connState}`);
          };
          
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

      // ENHANCED: Additional Socket.IO error handlers
      socketRef.current.on("disconnect", (reason) => {
        console.warn("Socket.IO disconnected:", reason);
        // Connection was lost - could attempt reconnection
        if (reason === "io server disconnect") {
          console.error("Server disconnected. Attempting to reconnect...");
          socketRef.current.connect();
        }
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("Socket.IO connection error:", error.message);
      });

      socketRef.current.on("error", (error) => {
        console.error("Socket.IO error event:", error);
      });

      socketRef.current.on("reconnect_attempt", () => {
        console.log("Attempting to reconnect to Socket.IO server...");
      });

      socketRef.current.on("reconnect", () => {
        console.log("Reconnected to Socket.IO server successfully");
        // Rejoin the call after reconnection
        socketRef.current.emit("join-call", window.location.href, userName);
      });
    });
  };

  const getPermission = async () => {
    try {
      // ENHANCED: Try video first with LOW-LATENCY constraints
      let videoPerm = null;
      try {
        videoPerm = await navigator.mediaDevices.getUserMedia({
          video: VIDEO_CONSTRAINTS,  // Optimized for low latency
        });
        setIsVideoAvailable(true);
        setVideoStream(videoPerm);
      } catch (videoErr) {
        console.warn("Video device unavailable:", videoErr.name);
        // Specific error handling for video
        if (videoErr.name === "NotAllowedError") {
          console.error("User denied video camera permission");
        } else if (videoErr.name === "NotFoundError") {
          console.error("No video camera device found");
        } else if (videoErr.name === "NotReadableError") {
          console.error("Video camera is in use by another application");
        }
        setIsVideoAvailable(false);
        setVideoStream(null);
      }

      // ENHANCED: Try audio with LOW-LATENCY constraints
      let audioPerm = null;
      try {
        audioPerm = await navigator.mediaDevices.getUserMedia({
          audio: AUDIO_CONSTRAINTS,  // Echo cancellation, noise suppression for low latency
        });
        setIsAudioAvailable(true);
        setAudioStream(audioPerm);
      } catch (audioErr) {
        console.warn("Audio device unavailable:", audioErr.name);
        // Specific error handling for audio
        if (audioErr.name === "NotAllowedError") {
          console.error("User denied microphone permission");
        } else if (audioErr.name === "NotFoundError") {
          console.error("No microphone device found");
        } else if (audioErr.name === "NotReadableError") {
          console.error("Microphone is in use by another application");
        }
        setIsAudioAvailable(false);
        setAudioStream(null);
      }

      // Get combined stream if at least one is available
      if (isVideoAvailable || isAudioAvailable) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoAvailable ? VIDEO_CONSTRAINTS : false,
          audio: isAudioAvailable ? AUDIO_CONSTRAINTS : false,
        });

        if (stream) {
          window.localStream = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          console.log("Media stream obtained successfully");
        }
      } else {
        console.error("No media devices available. Cannot start call.");
        alert("Error: No camera or microphone available. Please allow access to media devices.");
      }
    } catch (err) {
      console.error("Error accessing media devices.", err.name, err.message);
      alert(`Error accessing media devices: ${err.message}`);
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
        .getUserMedia({ 
          video: isVideoOn ? VIDEO_CONSTRAINTS : false, 
          audio: isAudioOn ? AUDIO_CONSTRAINTS : false 
        })
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
            // LOW-LATENCY: Create offer with SDP manipulation
            connections[id].createOffer().then((description) => {
              let modifiedSdp = preferH264Codec(description.sdp);
              modifiedSdp = setBitrateLimit(modifiedSdp, 2500);
              
              const modifiedDescription = new RTCSessionDescription({
                type: description.type,
                sdp: modifiedSdp
              });
              
              connections[id].setLocalDescription(modifiedDescription).then(() => {
                socketRef.current.emit(
                  "signal",
                  id,
                  JSON.stringify({ sdp: connections[id].localDescription })
                );
                
                enableAdaptiveBitrate(id);
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
        let modifiedSdp = preferH264Codec(description.sdp);
        modifiedSdp = setBitrateLimit(modifiedSdp, 2500);
        
        const modifiedDescription = new RTCSessionDescription({
          type: description.type,
          sdp: modifiedSdp
        });
        
        connections[id].setLocalDescription(modifiedDescription).then(() => {
          socketRef.current.emit(
            "signal",
            id,
            JSON.stringify({ sdp: connections[id].localDescription })
          );
          
          enableAdaptiveBitrate(id);
        });
      });
    }

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
  };

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

  // RECORDING: Start recording local stream
  const startRecording = () => {
    if (!window.localStream) {
      alert('No active stream to record');
      return;
    }

    try {
      // Check for supported MIME types
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        alert('Recording not supported in this browser');
        return;
      }

      // Create MediaRecorder with optimized settings
      const options = {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 2500000,  // 2.5 Mbps for high quality
        audioBitsPerSecond: 128000     // 128 kbps for audio
      };

      mediaRecorderRef.current = new MediaRecorder(window.localStream, options);
      const chunks = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMimeType });
        const url = URL.createObjectURL(blob);
        
        // Auto-download the recording
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);

        setRecordedChunks([]);
        setRecordingTime(0);
        console.log('[RECORDING] Recording saved');
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('[RECORDING] Error:', event.error);
        alert('Recording error: ' + event.error);
      };

      // Start recording with 1-second chunks
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      console.log('[RECORDING] Recording started with format:', selectedMimeType);
    } catch (error) {
      console.error('[RECORDING] Failed to start recording:', error);
      alert('Failed to start recording: ' + error.message);
    }
  };

  // RECORDING: Stop recording
  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    try {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      console.log('[RECORDING] Recording stopped');
    } catch (error) {
      console.error('[RECORDING] Failed to stop recording:', error);
    }
  };

  // RECORDING: Format recording time as MM:SS
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

            {/* Recording Button */}
            <Tooltip title={isRecording ? `Recording: ${formatRecordingTime(recordingTime)}` : "Start Recording"}>
              <IconButton 
                onClick={isRecording ? stopRecording : startRecording} 
                sx={{ 
                  width: 52, 
                  height: 52, 
                  bgcolor: isRecording ? "#ea4335" : "rgba(255,255,255,0.08)", 
                  color: "white",
                  animation: isRecording ? "pulse 1.5s ease-in-out infinite" : "none",
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.6 }
                  }
                }}
              >
                {isRecording ? <StopIcon /> : <FiberManualRecordIcon />}
              </IconButton>
            </Tooltip>

            {/* Recording Timer Display */}
            {isRecording && (
              <Box sx={{ 
                px: 2, 
                py: 1, 
                bgcolor: "rgba(234, 67, 53, 0.1)", 
                borderRadius: 2, 
                color: "#ea4335",
                fontWeight: 600,
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: 1
              }}>
                <FiberManualRecordIcon sx={{ fontSize: 10, animation: "blink 1s ease-in-out infinite" }} />
                {formatRecordingTime(recordingTime)}
              </Box>
            )}

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
