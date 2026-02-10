import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import { uploadAvatar } from '../middlewares/multer.middlewares.js';

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
  // Multer/Cloudinary middleware – handles file upload
  uploadAvatar,

  // Main handler
  async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        throw new ApiError(401, 'Authentication required');
      }

      const userId = req.user._id.toString();
      const user = await User.findById(userId);

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const { username } = req.body;

      // Update username if provided
      if (username) {
        user.username = username.trim();
      }

      // Update avatar if a new file was uploaded
      if (req.file) {
        user.avatar = req.file.path; // Full Cloudinary URL
      }

      // If no changes were provided
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