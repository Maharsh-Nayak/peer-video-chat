import mongoose from "mongoose";
import { Schema } from "mongoose";

const roomSchema = new Schema({
  // Room identification
  roomCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  // Room metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  
  expiresAt: {
    type: Date,
    // Rooms expire after 24 hours
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: true,
  },
  
  // Participants tracking
  participants: [
    {
      socketId: String,
      username: String,
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      leftAt: Date,
      duration: Number, // Duration in seconds
    }
  ],
  
  // Room statistics
  statistics: {
    totalParticipants: {
      type: Number,
      default: 0,
    },
    peakParticipants: {
      type: Number,
      default: 0,
    },
    totalDuration: {
      type: Number,
      default: 0, // In seconds
    },
    messages: {
      type: Number,
      default: 0,
    },
  },
  
  // Room status
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
});

// TTL index: automatically delete rooms 24 hours after creation
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook to ensure expiresAt is set
roomSchema.pre("save", function (next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  next();
});

// Method to add participant
roomSchema.methods.addParticipant = function (socketId, username) {
  const participant = {
    socketId,
    username,
    joinedAt: new Date(),
  };
  this.participants.push(participant);
  
  // Update statistics
  this.statistics.totalParticipants += 1;
  if (this.participants.length > this.statistics.peakParticipants) {
    this.statistics.peakParticipants = this.participants.length;
  }
  
  return this.save();
};

// Method to remove participant
roomSchema.methods.removeParticipant = function (socketId) {
  const participant = this.participants.find(p => p.socketId === socketId);
  
  if (participant) {
    participant.leftAt = new Date();
    participant.duration = Math.round((new Date() - participant.joinedAt) / 1000);
    this.statistics.totalDuration += participant.duration;
  }
  
  // Remove participant if left (optional: keep history)
  this.participants = this.participants.filter(p => p.socketId !== socketId);
  
  return this.save();
};

// Method to get current participant count
roomSchema.methods.getParticipantCount = function () {
  return this.participants.length;
};

// Method to check if room is empty
roomSchema.methods.isEmpty = function () {
  return this.participants.length === 0;
};

// Method to mark room as inactive
roomSchema.methods.markInactive = function () {
  this.isActive = false;
  return this.save();
};

const Room = mongoose.model("Room", roomSchema);
export default Room;
