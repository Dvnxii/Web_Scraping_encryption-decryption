// server.js - Enhanced server with better scraping capabilities

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const mongoose = require('mongoose');
const https = require('https');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/webscraper', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// MongoDB Schema
const ScrapedDataSchema = new mongoose.Schema({
  url: String,
  originalText: String,
  encryptedText: String,
  encryptionKey: String,
  createdAt: { type: Date, default: Date.now }
});

const ScrapedData = mongoose.model('ScrapedData', ScrapedDataSchema);

// Encryption Helper Functions
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function encrypt(text, key) {
  const keyBuffer = crypto.createHash('sha256').update(String(key)).digest();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text, key) {
  try {
    const keyBuffer = crypto.createHash('sha256').update(String(key)).digest();
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed. Invalid key or corrupted data.');
  }
}

// Enhanced scraping function with multiple methods
async function scrapeWebsite(url) {
  console.log('🔍 Attempting to scrape:', url);
  
  // Method 1: Try with axios and multiple user agents
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  for (let i = 0; i < userAgents.length; i++) {
    try {
      console.log(`📡 Attempt ${i + 1} with User-Agent ${i + 1}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgents[i],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0'
        },
        timeout: 15000,
        maxRedirects: 5,
        httpsAgent: new https.Agent({  
          rejectUnauthorized: false // Allow self-signed certificates
        })
      });

      if (response.data) {
        console.log('✅ Successfully fetched HTML');
        return response.data;
      }
    } catch (error) {
      console.log(`❌ Attempt ${i + 1} failed:`, error.message);
      if (i === userAgents.length - 1) {
        throw error;
      }
    }
  }
}

// Extract text from HTML
function extractText(html, url) {
  const $ = cheerio.load(html);
  
  // Remove unwanted elements
  $('script, style, nav, footer, header, iframe, noscript, svg').remove();
  $('.advertisement, .ad, .sidebar, .cookie-banner, .popup').remove();
  
  // Try to find main content
  let text = '';
  
  // Look for main content areas
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.main-content',
    '#content',
    '#main',
    '.post-content',
    '.article-content',
    'body'
  ];
  
  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      text = element.text();
      if (text.length > 100) {
        console.log(`✅ Found content using selector: ${selector}`);
        break;
      }
    }
  }
  
  // Fallback to body if nothing found
  if (!text || text.length < 100) {
    text = $('body').text();
    console.log('✅ Using body text as fallback');
  }
  
  // Clean up the text
  text = text
    .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
    .replace(/\n+/g, '\n')          // Replace multiple newlines
    .trim();
  
  // Get page title
  const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
  
  // Get meta description
  const description = $('meta[name="description"]').attr('content') || 
                     $('meta[property="og:description"]').attr('content') || '';
  
  // Combine information
  const fullText = `Title: ${title}\n\nDescription: ${description}\n\n${text}`;
  
  // Limit to reasonable size (10000 characters)
  const limitedText = fullText.substring(0, 10000);
  
  console.log(`✅ Extracted ${limitedText.length} characters`);
  
  return {
    text: limitedText,
    title: title,
    description: description,
    wordCount: limitedText.split(/\s+/).length
  };
}

// API Routes

// 1. Enhanced Scrape Website
app.post('/api/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false,
        error: 'URL is required' 
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid URL format. Please include http:// or https://' 
      });
    }

    console.log('\n🚀 Starting scrape for:', url);

    // Scrape the website
    const html = await scrapeWebsite(url);
    
    // Extract text
    const result = extractText(html, url);

    if (!result.text || result.text.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract meaningful content from the website. The site might be using JavaScript rendering or blocking scraping.'
      });
    }

    console.log('✅ Scraping completed successfully\n');

    res.json({
      success: true,
      text: result.text,
      title: result.title,
      description: result.description,
      wordCount: result.wordCount,
      url
    });

  } catch (error) {
    console.error('❌ Scraping error:', error.message);
    
    let errorMessage = 'Failed to scrape website';
    let errorDetails = error.message;
    
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'Website not found. Please check the URL.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. The website is not accessible.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timed out. The website is taking too long to respond.';
    } else if (error.response?.status === 403) {
      errorMessage = 'Access forbidden. The website is blocking scraping requests.';
    } else if (error.response?.status === 404) {
      errorMessage = 'Page not found (404). Please check the URL.';
    } else if (error.response?.status === 429) {
      errorMessage = 'Too many requests. The website is rate limiting.';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails,
      suggestions: [
        'Make sure the URL is correct and includes http:// or https://',
        'Some websites block automated scraping',
        'Try a different website (e.g., https://example.com)',
        'The website might require JavaScript rendering'
      ]
    });
  }
});

// 2. Test URL accessibility
app.post('/api/test-url', async (req, res) => {
  try {
    const { url } = req.body;
    
    const response = await axios.head(url, {
      timeout: 5000,
      maxRedirects: 5
    });
    
    res.json({
      success: true,
      accessible: true,
      status: response.status,
      headers: response.headers
    });
  } catch (error) {
    res.json({
      success: false,
      accessible: false,
      error: error.message
    });
  }
});

// 3. Save Encrypted Data
app.post('/api/save', async (req, res) => {
  try {
    const { url, originalText, encryptedText, encryptionKey } = req.body;

    const scrapedData = new ScrapedData({
      url,
      originalText,
      encryptedText,
      encryptionKey
    });

    await scrapedData.save();

    res.json({
      success: true,
      message: 'Data saved successfully',
      id: scrapedData._id
    });

  } catch (error) {
    console.error('Save error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to save data',
      details: error.message
    });
  }
});

// 4. Get All Saved Items
app.get('/api/items', async (req, res) => {
  try {
    const items = await ScrapedData.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('-originalText -encryptedText');

    res.json(items);

  } catch (error) {
    console.error('Fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch items',
      details: error.message
    });
  }
});

// 5. Get Single Item
app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await ScrapedData.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        error: 'Item not found' 
      });
    }

    res.json(item);

  } catch (error) {
    console.error('Fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch item',
      details: error.message
    });
  }
});

// 6. Encrypt Text (standalone)
app.post('/api/encrypt', async (req, res) => {
  try {
    const { text, key } = req.body;
    
    if (!text || !key) {
      return res.status(400).json({ 
        success: false,
        error: 'Text and key are required' 
      });
    }

    const encrypted = encrypt(text, key);
    
    res.json({
      success: true,
      encrypted
    });

  } catch (error) {
    console.error('Encryption error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Encryption failed',
      details: error.message
    });
  }
});

// 7. Decrypt Text (standalone)
app.post('/api/decrypt', async (req, res) => {
  try {
    const { text, key } = req.body;
    
    if (!text || !key) {
      return res.status(400).json({ 
        success: false,
        error: 'Text and key are required' 
      });
    }

    const decrypted = decrypt(text, key);
    
    res.json({
      success: true,
      decrypted
    });

  } catch (error) {
    console.error('Decryption error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Decryption failed',
      details: error.message
    });
  }
});

// 8. Delete Item
app.delete('/api/items/:id', async (req, res) => {
  try {
    const result = await ScrapedData.findByIdAndDelete(req.params.id);
    
    if (!result) {
      return res.status(404).json({ 
        success: false,
        error: 'Item not found' 
      });
    }

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Delete error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete item',
      details: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`${'='.repeat(50)}\n`);
});