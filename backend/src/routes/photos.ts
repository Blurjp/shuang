import { Router, Response } from 'express';
import { getUserPhotos, createUserPhoto, deactivateUserPhoto } from '../models/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import { uploadPhoto as uploadToStorage, deletePhoto as deleteFromStorage, isStorageConfigured } from '../services/storage';
import { photoUploadRateLimit } from '../middleware/rateLimit';

const router = Router();

// All photo routes require authentication
router.use(authenticateToken);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload photo
// Now uses Cloudflare R2 for storage (with base64 fallback)
router.post('/upload', photoUploadRateLimit, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    console.log(`📸 Uploading photo for user ${userId}...`);
    console.log(`📊 Storage configured: ${isStorageConfigured() ? 'Yes (R2)' : 'No (base64 fallback)'}`);

    // Upload to storage (R2 or fallback to base64)
    const photoUrl = await uploadToStorage(
      req.file.buffer,
      req.file.mimetype,
      userId,
      req.file.originalname || 'photo.jpg'
    );

    // Store reference in database
    const photo = await createUserPhoto({
      user_id: userId,
      photo_url: photoUrl
    });

    res.json({
      id: photo.id,
      photo_url: photo.photo_url,
      created_at: photo.created_at
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Get user's photos
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  try {
    const photos = await getUserPhotos(userId);

    res.json(photos);
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Failed to get photos' });
  }
});

// Delete photo
router.delete('/:photoId', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const photoId = req.params.photoId as string;

  try {
    // Verify photo belongs to user
    const photos = await getUserPhotos(userId);
    const photo = photos.find(p => p.id === photoId);

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete from storage if it's an R2 URL
    try {
      await deleteFromStorage(photo.photo_url);
    } catch (storageError) {
      console.warn('Failed to delete from storage, continuing with database deletion:', storageError);
    }

    // Soft delete from database
    await deactivateUserPhoto(photoId);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

export default router;
