const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { protect } = require('../middleware/auth');

// Set up temporary storage for uploaded crop images
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

// File validation filter: allow images only
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp/i;
  const isExtensionValid = allowedExtensions.test(path.extname(file.originalname));
  const isMimetypeValid = allowedExtensions.test(file.mimetype);

  if (isExtensionValid && isMimetypeValid) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, PNG, and WEBP image files are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter
});

// @route   POST api/disease/scan
// @desc    Upload crop leaf image and get diagnosis prediction
router.post('/scan', protect, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file uploaded.' });
  }

  const imagePath = req.file.path;
  const scriptPath = path.join(__dirname, '..', 'predict.py');

  // Spawn Python child process to execute tensorflow classification
  execFile('python', [scriptPath, imagePath], (error, stdout, stderr) => {
    // 1. Delete temporary uploaded file to keep storage clean
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // 2. Handle process error
    if (error) {
      console.error('Python execution error:', error, stderr);
      return res.status(500).json({ 
        message: 'An error occurred during plant disease classification.', 
        error: stderr || error.message 
      });
    }

    try {
      // 3. Parse prediction output
      const result = JSON.parse(stdout.trim());

      if (result.error) {
        if (result.error === 'Model file not found.') {
          return res.status(503).json({
            message: 'AI Crop Disease Detection model is currently unavailable on the server.',
            detail: result.detail
          });
        }
        return res.status(400).json({ message: result.error, detail: result.detail });
      }

      // 4. Low-confidence check as per rule 4
      const confidenceThreshold = 0.50; // 50% minimum threshold
      if (result.confidence < confidenceThreshold) {
        return res.status(200).json({
          confidenceTooLow: true,
          message: 'Unable to confidently identify this plant. Please upload a clearer image or a supported crop.'
        });
      }

      // Helper to fetch detailed recommendation from Groq AI
      const getGroqRecommendation = (crop, disease) => {
        return new Promise((resolve) => {
          const apiKey = process.env.GROQ_API_KEY;
          const model = process.env.GROQ_MODEL || 'groq/compound';

          if (!apiKey) {
            return resolve(null);
          }

          const postData = JSON.stringify({
            model: model,
            messages: [
              {
                role: 'system',
                content: 'You are an agronomy and crop disease expert. Provide clear, highly practical, organic and chemical treatment advice, along with prevention tips for the crop disease described by the user. Keep it structured, action-oriented, and concise (under 120 words).'
              },
              {
                role: 'user',
                content: `Crop: ${crop}\nDisease: ${disease}`
              }
            ],
            temperature: 0.2,
            max_tokens: 300
          });

          const https = require('https');
          const options = {
            hostname: 'api.groq.com',
            port: 443,
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'Content-Length': Buffer.byteLength(postData),
            },
            timeout: 12000,
          };

          const req = https.request(options, (groqRes) => {
            let rawData = '';
            groqRes.on('data', (chunk) => { rawData += chunk; });
            groqRes.on('end', () => {
              try {
                if (groqRes.statusCode === 200) {
                  const json = JSON.parse(rawData);
                  let content = json.choices[0].message.content || '';
                  content = content.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
                  resolve(content.trim());
                } else {
                  console.error('Groq API Error in disease scan:', rawData);
                  resolve(null);
                }
              } catch (e) {
                console.error('Groq Parse Error in disease scan:', e);
                resolve(null);
              }
            });
          });

          req.on('error', (e) => {
            console.error('Groq Request Error in disease scan:', e);
            resolve(null);
          });

          req.on('timeout', () => {
            req.destroy();
            resolve(null);
          });

          req.write(postData);
          req.end();
        });
      };

      // 5. Successful diagnosis
      getGroqRecommendation(result.crop, result.disease).then((groqRec) => {
        res.json({
          confidenceTooLow: false,
          classIndex: result.classIndex,
          crop: result.crop,
          disease: result.disease,
          severity: result.severity,
          recommendation: groqRec || result.recommendation,
          confidence: parseFloat((result.confidence * 100).toFixed(2))
        });
      });

    } catch (parseErr) {
      console.error('JSON parsing error from script output:', parseErr, stdout);
      res.status(500).json({ message: 'Error processing classification results.' });
    }
  });
});

module.exports = router;
