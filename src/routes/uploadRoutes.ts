import express from 'express';
import { uploadGeneric } from '../middlewares/upload';

const router = express.Router();

// @desc    Upload any file (generic endpoint)
// @route   POST /api/upload
// @access  Public
router.post('/', uploadGeneric.single('file'), (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    const fileUrl = (req.file as any).path;
    res.status(200).json({ fileUrl });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error uploading file' });
  }
});

export default router;
