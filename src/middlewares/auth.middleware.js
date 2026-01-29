import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import User from '../models/User.model.js';
 const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if(!token) throw new ApiError(401, "No token provided");
        
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await  User.findById(decoded._id).select('-password -refreshToken');
        if(!user) throw new ApiError (401, 'Invalid token ');

        req.user = user;
        next();

    } catch (error) {
        next( new ApiError(401, 'Authentication failed'));
    }
 };

 export default authMiddleware;