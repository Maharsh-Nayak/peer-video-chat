import User from '../model/user_models.js';
import httpStatus from 'http-status';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const register=async (req, res) => {
    const {username, email, password} = req.body;

    if(!username || !password || !email) {
        return res.statur(httpStatus.PARTIAL_CONTENT).json({message: "Username and password are required"});
    }
    try{
        const exist=await User.findOne({unsername});
        if(exist){
            return res.status(httpStatus.CONFLICT).json({message: "Username already exists"});
        }
        exist=await User.findOne({email});
        if(exist){
            return res.status(httpStatus.CONFLICT).json({message: "Email already exists"});
        }
    }catch(error) {
        console.error("Error checking username:", error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }

    try{
        const hashedPassword = await bcrypt.hash(password, 10); 
        const user= new User({
            username:username,
            email:email,
            password:password,
            hashedPassword:hashedPassword
        });
        res.status(httpStatus.CREATED).json({message: "User registered successfully", user});
    }
    catch(error) {
        console.error("Error registering user:", error);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
};

const login = async (req, res) => {
    const{username, password} = req.body;
    if(!username || !password) {
        return res.status(httpStatus.PARTIAL_CONTENT).json({message: "Username and password are required"});
    }

    try{
        const user = await User.find({username});
        if(!user) {
            return res.status(httpStatus.NOT_FOUND).json({message: "User not found"});
        }
        if(user.password !== password) {
            return res.status(httpStatus.UNAUTHORIZED).json({message: "Invalid password"});
        }

        const token = crypto.randomBytes(20).toString('hex');
        user.token = token;
        return res.status(httpStatus.OK).json({message: "Login successful", token});
    }
    catch(error) {
        console.error("Error logging in user:", error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message: "Internal server error"});
    }
}

export {
    register,
    login
};
