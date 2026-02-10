import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import { uploadAvatar } from '../middlewares/multer.middlewares.js';
import {cloudinary} from '../config/cloudinary.js';

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        avatar: user.avatar || null,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateCurrentUser = [
  uploadAvatar,

  async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        throw new ApiError(401, 'Authentication required');
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const { username } = req.body;

      if (username) {
        user.username = username.trim();
      }

      if (req.file) {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'finance-tracker/avatars',
              resource_type: 'image',
              allowed_formats: ['jpg', 'png', 'jpeg'],
              // No heavy transformation → faster on Render
              // transformation: [{ width: 500, height: 500, crop: 'limit' }],
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );

          uploadStream.end(req.file.buffer);
        });

        user.avatar = result.secure_url;
      }

      if (!username && !req.file) {
        throw new ApiError(400, 'No changes provided (username or avatar required)');
      }

      await user.save();

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: user.avatar || null,
        },
      });
    } catch (err) {
      next(err);
    }
  },
];