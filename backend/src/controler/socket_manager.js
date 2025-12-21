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


        socket.on("join-call", (path) => {
            if(!connection[path]) {
                connection[path] = [];
            }
            connection[path].forEach(element => {
                io.to(element).emit("user-joined", socket.id, path);
            });
            
            io.to(socket.id).emit("joined-list", connection[path], path);
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

        socket.on("disconect", (path) => {

            if(connection[path]) {
                connection[path] = connection[path].filter(id => id !== socket.id);
                connection[path].forEach(element => {
                    io.to(element).emit("user-left", socket.id);
                });

                if(connection[path].length === 0) {
                    delete connection[path];
                }
            }

        });

    });
}