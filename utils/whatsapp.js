const puppeteerx = require('puppeteer-extra');
const puppeteer = require('puppeteer');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { executablePath } = puppeteer;
const stealthPlugin = StealthPlugin();
stealthPlugin.enabledEvasions.delete('chrome.runtime');
stealthPlugin.enabledEvasions.delete('iframe.contentWindow');
puppeteerx.use(stealthPlugin);

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
    headless: false,
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
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

  await page.setRequestInterception(true);
  page.on('request', request => {
    console.log(`Request: ${request.url().substring(0, 100)}`);
    request.continue();
  });

  page.on('requestfailed', request => {
    console.log(`Failed request: ${request.url().substring(0, 100)}`);
    console.log(`Failure reason: ${request.failure().errorText}`);
  });
  let dataRef = "";
  let base64Screenshot = ""


  // Enhanced logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  try {
    // Navigate to WhatsApp Web
    await page.goto('https://web.whatsapp.com', {
      waitUntil: 'networkidle0',
      timeout: 120000
    });

    // Wait for page to potentially load
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log("Taking screenshot of WhatsApp page...");
    const ScreenshotPath = path.join(__dirname, 'screenshot.png');
    const screenshotBuffer = await page.screenshot({ fullPage: true, path: ScreenshotPath });
    console.log(`screenshot saved to: ${ScreenshotPath}`);
    base64Screenshot = screenshotBuffer.toString('base64');

    await new Promise(resolve => setTimeout(resolve, 5000));


    // Detailed login status check
    const loginStatus = await page.evaluate(() => {
      console.log("Document body:", document.body.innerHTML.substring(0, 500) + "...");
      const splashScreen = document.querySelector('#app > div._aiwl'); 
      const loadingIndicator = document.querySelector('.landing-title');
      // Try multiple selectors to find QR code
      const qrCodeSelectors = [
        '[data-testid="qrcode"]',
        'canvas[aria-label="Scan this QR code to link a device!"]',
        'div[data-ref]',
        '.landing-wrapper', // Add parent containers too
        '_2UwZ_', // Class that might be present on QR container
        'canvas[aria-label*="Scan"]',
        'div[data-ref]',
        'div[data-testid="qrcode"]',
        // WhatsApp sometimes uses these class names
        '._2d4l0', 
        '._19vUU',
        '.landing-wrapper canvas'
      ];
      for (let selector of qrCodeSelectors) {
        try {
          const qrCodeElement = document.querySelector(selector);
          if (qrCodeElement) {
            console.log("Found QR element with selector:", selector);
            const dataRef = qrCodeElement.getAttribute('data-ref') ||
              qrCodeElement.closest('[data-ref]')?.getAttribute('data-ref');
            return { needsQRCode: true, qrCodeFound: true, dataRef: dataRef };
          }
        } catch (e) {
          console.log("Error checking selector:", selector, e);
        }
      }

      // Check for chat list or login indicators
      console.log("QR elements not found, checking login status");
      const chatList = document.querySelector('[data-testid="chat-list"]');
      const loginPage = document.querySelector('.landing-title');
      const anyContent = document.querySelector('body').textContent.length > 100;

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


    return { browser, page, qrCodeUrl: dataRef, screenshot: base64Screenshot  };

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