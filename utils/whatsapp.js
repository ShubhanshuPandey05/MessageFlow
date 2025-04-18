const puppeteerx = require('puppeteer-extra');
const puppeteer = require('puppeteer');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { executablePath } = puppeteer;

// Add stealth plugin to bypass some detection mechanisms
puppeteerx.use(StealthPlugin());

const SESSION_PATH = path.join(__dirname, '../sessions');

const launchBrowser = async (userId) => {
  const userSessionPath = path.join(SESSION_PATH, userId);

  if (!fs.existsSync(userSessionPath)) {
    fs.mkdirSync(userSessionPath, { recursive: true });
  }
  console.log("Launching browser with system Chrome...");
  const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  console.log("Using Chrome executable path:", execPath);


  const browser = await puppeteerx.launch({
    headless: true,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',  // Important for CI environments
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled'
    ],
    userDataDir: userSessionPath,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });

  const page = await browser.newPage();
  let dataRef = "";


  // Enhanced logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  try {
    // Navigate to WhatsApp Web
    await page.goto('https://web.whatsapp.com', {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });

    // Wait for page to potentially load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Detailed login status check
    const loginStatus = await page.evaluate(() => {
      // Try multiple selectors to find QR code
      const qrCodeSelectors = [
        '[data-testid="qrcode"]',
        'canvas[aria-label="Scan this QR code to link a device!"]',
        'div[data-ref]'
      ];
      for (let selector of qrCodeSelectors) {
        const qrCodeElement = document.querySelector(selector);
        if (qrCodeElement) {
          // If using a canvas, try to get data-ref
          dataRef = qrCodeElement.getAttribute('data-ref') ||
            qrCodeElement.closest('[data-ref]')?.getAttribute('data-ref');
          console.log(dataRef);


          return {
            needsQRCode: true,
            qrCodeFound: true,
            dataRef: dataRef
          };
        }
      }

      // Check for chat list or login indicators
      const chatList = document.querySelector('[data-testid="chat-list"]');
      const loginPage = document.querySelector('.landing-title');

      return {
        needsQRCode: false,
        isLoggedIn: !!chatList,
        isLoginPage: !!loginPage
      };
    });

    console.log('Detailed Login Status:', loginStatus);

    // Handle QR Code scenario
    if (loginStatus.needsQRCode && loginStatus.qrCodeFound) {
      console.log('QR Code Required for Login');

      // Generate QR code in terminal
      if (loginStatus.dataRef) {
        console.log('Scan this QR Code with WhatsApp Mobile:');
        qrcode.generate(loginStatus.dataRef, { small: true });
        dataRef = loginStatus.dataRef
      }

      // Wait indefinitely for login
      await page.waitForFunction(() => {
        const qrCode = document.querySelector('[data-testid="qrcode"]');
        const chatList = document.querySelector('[data-testid="chat-list"]');
        return chatList !== null || qrCode === null;
      }, {
        timeout: 0  // Wait indefinitely
      });

      console.log('Successfully logged in!');
    } else if (loginStatus.isLoggedIn) {
      console.log('Already logged in');
    }
    console.log("Hello here is you data", dataRef);


    return { browser, page, qrCodeUrl: dataRef };

  } catch (error) {
    console.error('Detailed Login Error:', error);

    // Take a screenshot for debugging
    const errorScreenshotPath = path.join(userSessionPath, 'error-screenshot.png');
    await page.screenshot({ path: errorScreenshotPath });
    console.log(`Error screenshot saved to: ${errorScreenshotPath}`);

    // Ensure browser is closed
    await browser.close();
    throw error;
  }
};

module.exports = { launchBrowser };