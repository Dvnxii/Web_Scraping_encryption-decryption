Web Scraping + Encryption/Decryption Tool
A full-stack web application that combines web scraping with encryption and decryption — scrape content from target websites and secure it using cryptographic techniques, all through a clean browser-based interface.


Features
Web Scraping — Extract content from target websites via a Node.js backend
Encrypt Data — Secure scraped or custom text using encryption algorithms
Decrypt Data — Restore encrypted content back to its original form
Environment Config — API keys and secrets managed via .env for security
Interactive UI — Clean frontend to input URLs, view scraped data, and toggle encryption


Tech Stack
LayerTechnologyFrontendHTML, CSS, JavaScriptBackendNode.js (server.js)ScrapingNode.js HTTP/Cheerio/Axios (via script.js)Config.env for secrets and environment variablesPackage Managernpm (package.json)

Project Structure
Web_Scraping_encryption-decryption/
│
├── index.html             
├── script.js              
├── server.js
├── style.css              
├── website_to_scrape.md   
├── .env                   
├── .gitignore            
├── package.json          
└── package-lock.json      


How It Works
Web Scraping
The Node.js backend sends HTTP requests to a target URL, parses the HTML response, and extracts the relevant content (text, links, etc.) which is then returned to the frontend.
Encryption / Decryption
The extracted or user-provided data is encrypted using a symmetric algorithm (e.g., AES) with a secret key defined in .env. The same key is used to decrypt the ciphertext back to plaintext.
Input Text → Encrypt (AES + Secret Key) → Ciphertext
Ciphertext → Decrypt (AES + Secret Key) → Original Text

Important Notes
Never commit your .env file — it's listed in .gitignore for a reason
Only scrape websites you have permission to access; respect robots.txt

Future Improvements
 Support for multiple encryption algorithms (AES, RSA, DES)
 Scraping with JavaScript-rendered pages (Puppeteer integration)
 Export encrypted output to file
 User authentication for secure access
 Rate limiting and error handling for scraping failures
