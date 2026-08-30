const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { protect } = require('../middleware/auth');
const ScanHistory = require('../models/ScanHistory');

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
  const apiKey = process.env.GROQ_API_KEY;

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

  const runPythonPrediction = () => {
    const logFile = path.join(__dirname, '..', 'scan_debug.log');
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] runPythonPrediction started. imagePath=${imagePath}\n`);

    // Spawn Python child process to execute tensorflow classification with absolute path
    const pythonPath = 'C:\\Users\\dell\\AppData\\Local\\Programs\\Python\\Python312\\python.exe';
    execFile(pythonPath, [scriptPath, imagePath], (error, stdout, stderr) => {
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] execFile completed. error=${error ? error.message : 'null'} stderr=${stderr} stdout=${stdout}\n`);

      // Delete temporary uploaded file to keep storage clean
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      // Handle process error
      if (error) {
        console.error('Python execution error:', error, stderr);
        return res.status(500).json({ 
          message: 'An error occurred during plant disease classification.', 
          error: stderr || error.message 
        });
      }

      try {
        // Parse prediction output
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

        // Low-confidence check
        const confidenceThreshold = 0.50;
        if (result.confidence < confidenceThreshold) {
          return res.status(200).json({
            confidenceTooLow: true,
            message: 'Unable to confidently identify this plant. Please upload a clearer image or a supported crop.'
          });
        }

        // Successful diagnosis
        getGroqRecommendation(result.crop, result.disease).then(async (groqRec) => {
          const recText = groqRec || result.recommendation;
          const confVal = parseFloat((result.confidence * 100).toFixed(2));

          let savedScanId = null;
          try {
            // Save to database
            const newScan = new ScanHistory({
              userId: req.user._id,
              crop: result.crop,
              disease: result.disease,
              severity: result.severity,
              confidence: confVal,
              recommendation: recText
            });
            const savedScan = await newScan.save();
            savedScanId = savedScan._id;
          } catch (historyErr) {
            console.error('Failed to save scan history:', historyErr);
          }

          res.json({
            _id: savedScanId,
            confidenceTooLow: false,
            classIndex: result.classIndex,
            crop: result.crop,
            disease: result.disease,
            severity: result.severity,
            recommendation: recText,
            confidence: confVal
          });
        });

      } catch (parseErr) {
        console.error('JSON parsing error from script output:', parseErr, stdout);
        res.status(500).json({ message: 'Error processing classification results.' });
      }
    });
  };

  // If Groq API Key is configured, use the Groq Vision model to check if the uploaded image is actually a plant/crop/leaf
  if (apiKey) {
    try {
      const logFile = path.join(__dirname, '..', 'scan_debug.log');
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] Groq Vision check initiated. imagePath=${imagePath}\n`);

      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const postData = JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image. Is it a plant, leaf, crop, flower, fruit, or vegetable? Answer with only YES or NO.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 500
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
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 8000 // 8 second timeout for vision check
      };

      const visionReq = https.request(options, (visionRes) => {
        let rawData = '';
        visionRes.on('data', (chunk) => { rawData += chunk; });
        visionRes.on('end', () => {
          fs.appendFileSync(logFile, `[${new Date().toISOString()}] Groq Vision response code: ${visionRes.statusCode} rawData: ${rawData}\n`);
          try {
            if (visionRes.statusCode === 200) {
              const resJson = JSON.parse(rawData);
              const answer = resJson.choices[0].message.content.trim().toUpperCase();
              
              let answerText = answer;
              if (answerText.includes('</THINK>')) {
                answerText = answerText.split('</THINK>')[1].trim();
              }
              
              fs.appendFileSync(logFile, `[${new Date().toISOString()}] Parsed Vision Answer: ${answerText}\n`);

              if (answerText.includes('NO')) {
                // Delete image file and return error
                if (fs.existsSync(imagePath)) {
                  fs.unlinkSync(imagePath);
                }
                return res.status(400).json({
                  message: 'This image does not contain a plant or crop.',
                  detail: 'Please upload a clear photo of a crop leaf or plant.'
                });
              }
            }
          } catch (e) {
            console.error('Error parsing Groq vision response:', e);
          }
          // Proceed with python prediction if verified as plant or if parsing failed
          runPythonPrediction();
        });
      });

      visionReq.on('error', (err) => {
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] Groq Vision request error: ${err.message}\n`);
        console.error('Groq vision request error:', err);
        runPythonPrediction();
      });

      visionReq.on('timeout', () => {
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] Groq Vision request timeout\n`);
        visionReq.destroy();
        runPythonPrediction();
      });

      visionReq.write(postData);
      visionReq.end();

    } catch (e) {
      console.error('Error initiating Groq vision check:', e);
      runPythonPrediction();
    }
  } else {
    runPythonPrediction();
  }
});

module.exports = router;
