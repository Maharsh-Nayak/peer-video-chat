import express from "express";
import {createServer} from "node:http"
import cors from "cors";
import mongoose from "mongoose";
import userRoutes from "./route/userRoutes.js";
import { connectSocket } from "./controler/socket_manager.js";


const app = express();
app.set("port", (process.env.PORT || 3000));

app.use(cors());
app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/api/user", userRoutes);


const server=createServer(app);
const io= new connectSocket(server);

const start = async () => {

    const connection = await mongoose.connect("mongodb+srv://maharshnayak5:Or5esSYQuGlZLj0i@cluster0.t0bqm.mongodb.net/");

    console.log("Connected to MongoDB");

    server.listen(app.get("port"), () => {
        console.log("Server started on port " + app.get("port"));
    })
}

start()
