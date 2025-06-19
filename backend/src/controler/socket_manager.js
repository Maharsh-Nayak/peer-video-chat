import { Server } from "socket.io";

const connection={};
const messages={};
const users={};

export const connectSocket = (server) => {
    const io = new Server(server, {
        cors:{
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
        }
    }
    );

    io.on("connection", (socket) => {

        console.log("New connection: ", socket.id);


        socket.on("join", (path) => {
            if(!connection[path]) {
                connection[path] = [];
            }
            connection[path].forEach(element => {
                io.to(element).emit("new user joined join");
            });
            
            connection[path].push(socket.id);
        });

        socket.on("signal", (toId, messages) => {
            io.to(toId).emit("signal", socket.id, messages);
        })

        socket.on("message", (path, message)=> {
            connection[path].forEach(element => {
                if(element !== socket.id) {
                    io.to(element).emit("message", socket.id, message);
                }
            });
        })

    });
}