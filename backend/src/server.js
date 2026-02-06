import express from "express";
import {createServer} from "node:http"
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRoutes from "./route/userRoutes.js";
import { connectSocket } from "./controler/socket_manager.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const CORS_ORIGIN = process.env.SOCKET_IO_CORS_ORIGIN || "*";
const NODE_ENV = process.env.NODE_ENV || "development";

// Validate required environment variables
if (!MONGODB_URI) {
  console.error("ERROR: MONGODB_URI environment variable is not set");
  process.exit(1);
}

app.set("port", PORT);

// ENHANCED: Use environment variable for CORS origin
app.use(cors({
  origin: CORS_ORIGIN.split(',').map(origin => origin.trim()),
  credentials: true
}));
app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/api/user", userRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: NODE_ENV });
});

const server=createServer(app);
const io = connectSocket(server, CORS_ORIGIN);

const start = async () => {
    try {
      // ENHANCED: Use environment variable for MongoDB connection
      const connection = await mongoose.connect(MONGODB_URI);

      console.log("✓ Connected to MongoDB");
      console.log(`✓ Environment: ${NODE_ENV}`);
      console.log(`✓ CORS origins: ${CORS_ORIGIN}`);

      server.listen(PORT, () => {
          console.log(`✓ Server started on port ${PORT}`);
      })
    } catch (error) {
      console.error("✗ Failed to start server:", error.message);
      process.exit(1);
    }
}

start()

