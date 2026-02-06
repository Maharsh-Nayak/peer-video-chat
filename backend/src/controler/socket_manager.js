import { Server } from "socket.io";
import Room from "../model/room_models.js";

const connection = {};        // { "room-path": ["socket-id-1", "socket-id-2"] }
const messages = {};          // { "room-path": [...] }
const users = {};             // { "room-path": [{id, name}, ...] }
const socketRooms = {};       // Track which room each socket is in { "socket-id": "room-path" }
const roomInstances = {};     // In-memory room instances { "room-path": Room }

export const connectSocket = (server, corsOrigin = "*") => {
    // Parse CORS origin (can be comma-separated string or array)
    const corsOrigins = typeof corsOrigin === 'string' 
      ? corsOrigin.split(',').map(origin => origin.trim())
      : corsOrigin;
    
    const io = new Server(server, {
        cors:{
            origin: corsOrigins,
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
        }
    }
    );

    io.on("connection", (socket) => {

        console.log("New connection: ", socket.id);


        socket.on("join-call", (path, userName) => {
            try {
                if(!connection[path]) {
                    connection[path] = [];
                    users[path] = [];
                }
                
                // Store which room this socket is in
                socketRooms[socket.id] = path;
                
                // ENHANCED: Persist room in MongoDB
                (async () => {
                    try {
                        // Extract room code from path (e.g., "/meet/abc-123" -> "abc-123")
                        const roomCode = path.split('/').pop() || path;
                        
                        // Find or create room
                        let room = await Room.findOne({ roomCode });
                        
                        if (!room) {
                            // Create new room
                            room = new Room({
                                roomCode: roomCode,
                                participants: []
                            });
                            console.log(`[ROOM] Created new room: ${roomCode}`);
                        }
                        
                        // Add participant to room
                        await room.addParticipant(socket.id, userName);
                        
                        // Store room instance
                        roomInstances[path] = room;
                        
                        console.log(`[ROOM] ${userName} joined room ${roomCode}. Current participants: ${room.getParticipantCount()}`);
                    } catch (dbError) {
                        console.error("Error persisting room data:", dbError);
                        // Continue even if DB operation fails
                    }
                })();
                
                // Notify existing participants about new user
                connection[path].forEach(element => {
                    io.to(element).emit("user-joined", socket.id, userName);
                });
                
                // Send list of existing users to the new joiner
                io.to(socket.id).emit("joined-list", connection[path], path);
                
                // Add new user to room
                connection[path].push(socket.id);
                users[path].push({id: socket.id, name: userName});
                
                console.log(`User ${socket.id} (${userName}) joined room ${path}. Total users: ${connection[path].length}`);
            } catch (error) {
                console.error("Error in join-call:", error);
                socket.emit("error", {message: "Failed to join call"});
            }
        });

        socket.on("signal", (toId, messages) => {
            try {
                io.to(toId).emit("signal", socket.id, messages);
            } catch (error) {
                console.error("Error in signal:", error);
            }
        });

        socket.on("message", (path, message) => {
            try {
                if(connection[path]) {
                    connection[path].forEach(element => {
                        if(element !== socket.id) {
                            let user = users[path].find(user => user.id === socket.id);
                            let username = user ? user.name : "Anonymous";
                            io.to(element).emit("message", socket.id, username, message);
                        }
                    });
                }
            } catch (error) {
                console.error("Error in message:", error);
            }
        });

        // Fixed: Changed "disconect" to "disconnect" (proper Socket.IO event)
        // Note: disconnect doesn't receive parameters, we track rooms via socketRooms
        socket.on("disconnect", () => {

            console.log("Disconnected: ", socket.id);

            const path = socketRooms[socket.id];
            
            if(path && connection[path]) {
                // Remove user from connection list
                connection[path] = connection[path].filter(id => id !== socket.id);
                
                // Notify remaining users
                connection[path].forEach(element => {
                    io.to(element).emit("user-left", socket.id);
                });
                
                // Remove user from users list
                users[path] = users[path].filter(user => user.id !== socket.id);
                
                // ENHANCED: Persist room data to MongoDB
                (async () => {
                    try {
                        const roomCode = path.split('/').pop() || path;
                        const room = await Room.findOne({ roomCode });
                        
                        if (room) {
                            // Remove participant from database
                            await room.removeParticipant(socket.id);
                            
                            // If room is empty, mark as inactive
                            if (room.isEmpty()) {
                                await room.markInactive();
                                delete roomInstances[path];
                                console.log(`[ROOM] Room ${roomCode} marked as inactive (empty)`);
                            } else {
                                console.log(`[ROOM] User left room ${roomCode}. Current participants: ${room.getParticipantCount()}`);
                            }
                        }
                    } catch (dbError) {
                        console.error("Error updating room data:", dbError);
                        // Continue even if DB operation fails
                    }
                })();
                
                // Clean up empty rooms
                if(connection[path].length === 0) {
                    delete connection[path];
                    delete messages[path];
                    delete users[path];
                    console.log(`Room ${path} deleted (empty)`);
                } else {
                    console.log(`User left. Room ${path} has ${connection[path].length} users remaining`);
                }
            }
            
            // Clean up socket room tracking
            delete socketRooms[socket.id];

        });

    });

    return io;
}