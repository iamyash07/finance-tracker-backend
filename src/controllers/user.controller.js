
import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import { uploadAvatar } from '../middlewares/multer.middlewares.js';

export const getCurrentUser = async (req, res, next) => {
  try {
    console.log('[GET CURRENT USER] Fetching user for ID:', req.user?._id);

    const user = await User.findById(req.user._id).select('-password -refreshToken');
    
    if (!user) {
      console.log('[GET CURRENT USER] User not found in DB');
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
    console.error('[GET CURRENT USER ERROR]', err.message);
    next(err);
  }
};

export const updateCurrentUser = [
  // Multer middleware – handles file upload
  uploadAvatar,

  // Main handler
  async (req, res, next) => {
    try {
      // Debug logs – very helpful right now
      console.log('[UPDATE USER] Request received');
      console.log('[UPDATE USER] req.user exists?', !!req.user);
      console.log('[UPDATE USER] req.user._id type:', typeof req.user?._id);
      console.log('[UPDATE USER] req.user._id value:', req.user?._id);

      if (!req.user || !req.user._id) {
        console.log('[UPDATE USER] No req.user or _id – auth middleware failed');
        throw new ApiError(401, 'Authentication required');
      }

      // Convert to string to avoid ObjectId vs string issues
      const userId = req.user._id.toString();

      const user = await User.findById(userId);

      if (!user) {
        console.log('[UPDATE USER] User not found in database for ID:', userId);
        throw new ApiError(404, 'User not found');
      }

      const { username } = req.body;

      // Update fields if provided
      if (username) {
        user.username = username.trim();
      }

      if (req.file) {
        console.log('[UPDATE USER] Avatar uploaded:', req.file.filename);
        user.avatar = `/uploads/${req.file.filename}`;
      }

      // Optional: check if anything actually changed
      if (!username && !req.file) {
        throw new ApiError(400, 'No changes provided');
      }

      await user.save();

      console.log('[UPDATE USER] Profile updated successfully');

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
      console.error('[UPDATE USER ERROR]', err.message);
      next(err);
    }
  },
];