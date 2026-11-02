const multer = require('multer');

// Memory storage to inspect buffer and run sharp
const storage = multer.memoryStorage();

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

function fileFilter(req, file, cb) {
  if (ALLOWED_MIMES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const err = new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.');
    err.statusCode = 400;
    cb(err, false);
  }
}

const multerInstance = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter
});

// Middleware for up to 3 photos on complaint creation
function uploadComplaintPhotos(req, res, next) {
  const upload = multerInstance.array('photos', 3);

  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 5 MB limit.' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Maximum 3 photos allowed.' });
      }
      return res.status(err.statusCode || 400).json({ error: err.message || 'File upload error.' });
    }
    next();
  });
}

// Middleware for single photo on status update (e.g. resolve)
function uploadStatusPhoto(req, res, next) {
  const upload = multerInstance.single('photo');

  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 5 MB limit.' });
      }
      return res.status(err.statusCode || 400).json({ error: err.message || 'File upload error.' });
    }
    next();
  });
}

module.exports = {
  uploadComplaintPhotos,
  uploadStatusPhoto
};

