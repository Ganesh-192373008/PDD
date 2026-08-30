const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const Document = require('../models/Document');

// Private secure vault folder (isolated from public express.static)
const vaultDir = path.join(__dirname, '..', 'secure_vault');
if (!fs.existsSync(vaultDir)) {
  fs.mkdirSync(vaultDir, { recursive: true });
}

// Multer storage with randomized cryptographically secure filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, vaultDir);
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(24).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${randomName}${ext}`);
  }
});

// File validation filter
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /pdf|jpg|jpeg|png/i;
  const allowedMimeTypes = /pdf|jpg|jpeg|png/i;
  const extValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedMimeTypes.test(file.mimetype);

  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG documents are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB maximum limit
  fileFilter
});

// @route   POST api/documents/upload
// @desc    Upload document to private vault
router.post('/upload', protect, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum allowed size is 10MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please select a document file to upload.' });
    }

    try {
      const { documentName, category, maskedNumber, notes } = req.body;
      const ext = path.extname(req.file.originalname).toLowerCase();

      const doc = new Document({
        userId: req.user._id,
        documentName: documentName && documentName.trim() ? documentName.trim() : req.file.originalname.replace(ext, ''),
        category: category || 'Other Document',
        fileType: req.file.mimetype,
        fileExtension: ext,
        fileSize: req.file.size,
        storageKey: req.file.filename,
        maskedNumber: maskedNumber ? maskedNumber.trim() : '',
        notes: notes ? notes.trim() : ''
      });

      const saved = await doc.save();
      res.status(201).json({
        success: true,
        message: 'Document securely uploaded to vault.',
        document: saved
      });
    } catch (dbErr) {
      // Clean up orphaned file on database error
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      console.error('Document save error:', dbErr);
      res.status(500).json({ message: 'Failed to record document metadata.', error: dbErr.message });
    }
  });
});

// @route   GET api/documents
// @desc    Get all documents of logged-in user with search & category filter
router.get('/', protect, async (req, res) => {
  try {
    const { q, category, group } = req.query;
    const filter = { userId: req.user._id };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (group && group !== 'All') {
      filter.groupCategory = group;
    }

    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { documentName: searchRegex },
        { category: searchRegex },
        { notes: searchRegex },
        { maskedNumber: searchRegex }
      ];
    }

    const documents = await Document.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: documents.length, documents });
  } catch (error) {
    console.error('Fetch documents error:', error);
    res.status(500).json({ message: 'Server error retrieving documents.' });
  }
});

// @route   GET api/documents/stats/summary
// @desc    Get vault statistics and summary for user
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id });
    const totalBytes = documents.reduce((acc, d) => acc + (d.fileSize || 0), 0);

    const countsByGroup = {
      Identity: 0,
      Farming: 0,
      Government: 0,
      Bills: 0,
      Other: 0
    };

    documents.forEach(d => {
      if (countsByGroup[d.groupCategory] !== undefined) {
        countsByGroup[d.groupCategory]++;
      } else {
        countsByGroup.Other++;
      }
    });

    res.json({
      totalDocuments: documents.length,
      totalBytes,
      totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
      countsByGroup
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating vault statistics.' });
  }
});

// @route   GET api/documents/:id
// @desc    Get document details
router.get('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }
    // Strict ownership verification
    if (doc.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized access to this document.' });
    }
    res.json({ success: true, document: doc });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving document metadata.' });
  }
});

// @route   GET api/documents/:id/view
// @desc    Stream document file inline for secure view / preview
router.get('/:id/view', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }
    // Strict ownership verification
    if (doc.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: You do not own this document.' });
    }

    const filePath = path.join(vaultDir, doc.storageKey);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Document file is missing from private storage.' });
    }

    res.setHeader('Content-Type', doc.fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.documentName)}${doc.fileExtension}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Document view streaming error:', error);
    res.status(500).json({ message: 'Error streaming document.' });
  }
});

// @route   GET api/documents/:id/download
// @desc    Download document securely with attachment header
router.get('/:id/download', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }
    // Strict ownership verification
    if (doc.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: You do not own this document.' });
    }

    const filePath = path.join(vaultDir, doc.storageKey);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Document file not found on disk.' });
    }

    const downloadFilename = `${doc.documentName.replace(/[^a-zA-Z0-9_-]/g, '_')}${doc.fileExtension}`;
    res.download(filePath, downloadFilename);
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({ message: 'Error downloading document.' });
  }
});

// @route   PUT api/documents/:id
// @desc    Update document metadata (rename, category, notes, masked number)
router.put('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }
    // Strict ownership verification
    if (doc.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: You cannot edit this document.' });
    }

    const { documentName, category, maskedNumber, notes } = req.body;
    if (documentName && documentName.trim()) doc.documentName = documentName.trim();
    if (category) doc.category = category;
    if (maskedNumber !== undefined) doc.maskedNumber = maskedNumber.trim();
    if (notes !== undefined) doc.notes = notes.trim();

    const updated = await doc.save();
    res.json({ success: true, message: 'Document updated successfully.', document: updated });
  } catch (error) {
    console.error('Document update error:', error);
    res.status(500).json({ message: 'Error updating document details.' });
  }
});

// @route   DELETE api/documents/:id
// @desc    Permanently delete document from vault and disk
router.delete('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }
    // Strict ownership verification
    if (doc.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized: You cannot delete this document.' });
    }

    const filePath = path.join(vaultDir, doc.storageKey);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { console.error('Disk unlink error:', e); }
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Document securely deleted from vault.' });
  } catch (error) {
    console.error('Document delete error:', error);
    res.status(500).json({ message: 'Error deleting document.' });
  }
});

module.exports = router;
