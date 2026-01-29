
import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import jwt from 'jsonwebtoken';

export const registerUser = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            throw new ApiError(400, 'All fields are required');
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new ApiError(409, 'User with this email already exists');
        }

        const user = new User({ username, email, password });
        await user.save();

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        res.status(201).json({
            success: true,                    // ← fixed: "ture" → "true"
            accessToken,
            refreshToken,
            user: { _id: user._id, username, email },
        });
    } catch (error) {
        next(error);
    }
};

export const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new ApiError(400, 'Email and password are required');
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            throw new ApiError(401, 'Invalid credentials');
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            accessToken,
            refreshToken,
            user: { _id: user._id, username: user.username, email },
        });
    } catch (error) {
        next(error);
    }
};

export const refreshAccessToken = async (req, res, next) => {
    try {
        const incomingRefresh = req.body.refreshToken;   // ← fixed typo
        if (!incomingRefresh) {
            throw new ApiError(400, 'Refresh token required');
        }

        const decoded = jwt.verify(incomingRefresh, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decoded._id);

        if (!user || user.refreshToken !== incomingRefresh) {   // ← fixed typo
            throw new ApiError(401, 'Invalid refresh token');
        }

        const accessToken = user.generateAccessToken();
        const newRefreshToken = user.generateRefreshToken();

        user.refreshToken = newRefreshToken;
        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            accessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        next(error);
    }
};