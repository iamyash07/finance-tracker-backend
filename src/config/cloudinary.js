import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Load .env FIRST (sync, before anything else)
dotenv.config();

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload function – supports buffer (memory) and local path (disk)
const uploadOnCloudinary = async (fileInput, options = {}) => {
  try {
    const defaultOptions = {
      folder: "finance-tracker/avatars",
      resource_type: "image",
      allowed_formats: ["jpg", "png", "jpeg"],
    };

    const finalOptions = { ...defaultOptions, ...options };

    let result;

    if (Buffer.isBuffer(fileInput)) {
      result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          finalOptions,
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(fileInput);
      });
    } else {
      result = await cloudinary.uploader.upload(fileInput, finalOptions);
    }

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    return null;
  }
};

export { cloudinary, uploadOnCloudinary };
export default cloudinary;