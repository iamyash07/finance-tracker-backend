import { v2 as cloudinary } from "cloudinary";

// Load .env only in development (Render injects env vars directly)
if (process.env.NODE_ENV !== "production") {
  import("dotenv").then(dotenv => dotenv.config({ path: "./.env" }));
}

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
      // Upload from memory buffer (recommended for Render)
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
      // Upload from local file path (fallback/old style)
      result = await cloudinary.uploader.upload(fileInput, finalOptions);
      // Clean up local file after successful upload
      require("fs").unlinkSync(fileInput);
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
    // Silent failure – return null in production
    return null;
  }
};

export { cloudinary, uploadOnCloudinary };
export default cloudinary;