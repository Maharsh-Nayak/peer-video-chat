import { Schema } from "mongoose";

const meetingSchema = new Schema({
    link:{
        type: String,
        required: true,
        unique: true
    },
    Date:{
        type: Date,
        required: true,
        default: Date.now
    },
    name:{
        type: String,
        required: false
    }
})

const Meeting=mongoose.model("Meeting", meetingSchema);
export default Meeting;

