const express = require('express');
const router = express.Router();
const http = require('http');
const url = require('url');

// System prompt to guide the LLM's responses
const SYSTEM_PROMPT = `You are AgroAssist AI, a professional smart farming assistant. Your role is to help farmers, agronomists, and home gardeners. 
You should provide clear, practical, and farmer-friendly advice on crops, soil management, plant diseases, irrigation, pest control, organic fertilizers, harvesting, and government agricultural schemes.
Keep your responses concise, structured, and easy to read (use bullet points where appropriate). 
If you are asked questions completely unrelated to farming, agriculture, or rural life, politely redirect the user back to farming topics.`;

// @route   POST api/ai/chat
// @desc    Send chat messages to Groq API
router.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: 'Conversation history messages array is required.' });
  }

  // Get Groq configuration from environment
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'groq/compound';

  if (!apiKey) {
    return res.status(503).json({
      message: 'Groq AI service key is not configured on the server.',
      detail: 'Please configure GROQ_API_KEY in the backend .env file.'
    });
  }

  // Customize system prompt with user location context if provided
  let activeSystemPrompt = SYSTEM_PROMPT;
  if (req.body.location) {
    const { address, state, district, lat, lng } = req.body.location;
    if (address || state || district) {
      activeSystemPrompt += `\n\n[USER LOCATION CONTEXT] The user's current location is: ${address || ''} (State: ${state || 'unknown'}, District: ${district || 'unknown'}, Lat: ${lat || 'unknown'}, Lng: ${lng || 'unknown'}). Use this geographic information to customize your farming guidance, soil advice, crop suggestions, regional weather adaptation, and local agricultural schemes relevant to this specific area.`;
    }
  }

  // Format messages for Groq API
  // Insert System Prompt at the beginning
  const formattedMessages = [
    { role: 'system', content: activeSystemPrompt },
    ...messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))
  ];

  const postData = JSON.stringify({
    model: model,
    messages: formattedMessages,
    temperature: 0.7,
    stream: false,
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
    timeout: 30000, // 30 second timeout
  };

  const groqReq = https.request(options, (groqRes) => {
    let rawData = '';
    groqRes.on('data', (chunk) => { rawData += chunk; });
    groqRes.on('end', () => {
      try {
        const responseJson = JSON.parse(rawData);

        if (groqRes.statusCode !== 200) {
          console.error('Groq error status code:', groqRes.statusCode, responseJson);
          return res.status(groqRes.statusCode).json({
            message: `Groq error: ${responseJson.error?.message || 'Unknown Groq response error'}`
          });
        }

        let aiContent = responseJson.choices[0].message.content || '';
        
        // Strip any <think>...</think> reasoning tags to keep response clean if the model returns them
        aiContent = aiContent.replace(/<think>[\s\S]*?<\/think>\s*/g, '');

        res.json({
          role: 'assistant',
          content: aiContent,
          model: responseJson.model || model,
          createdAt: new Date().toISOString()
        });

      } catch (err) {
        console.error('Error parsing Groq response:', err, rawData);
        res.status(502).json({ message: 'Invalid response format from Groq service.' });
      }
    });
  });

  groqReq.on('error', (err) => {
    console.error('Groq request failed:', err);
    res.status(503).json({
      message: 'Groq AI service is offline or unreachable.',
      detail: err.message
    });
  });

  groqReq.on('timeout', () => {
    groqReq.destroy();
    res.status(504).json({ message: 'Request to Groq service timed out.' });
  });

  groqReq.write(postData);
  groqReq.end();
});

module.exports = router;
