const { launchBrowser } = require('../utils/whatsapp');
const User = require('../models/User');

const sessions = {};


const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads - modified to keep original filename
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Keep the original filename, but add a timestamp to avoid conflicts
    // Get the name and extension parts
    const originalName = path.parse(file.originalname);
    const timestamp = Date.now();
    // Combine as: originalname-timestamp.extension
    const filename = `${originalName.name}-${timestamp}${originalName.ext}`;
    cb(null, filename);
  }
});

const upload = multer({ storage: storage });

// Middleware function to use before the main handler
const uploadMiddleware = upload.single('file');

// const startSessions = async (req, res) => {
//   const { userId, phoneNumber } = req.body;

//   if (!userId || !phoneNumber) {
//     return res.status(400).json({ error: 'Invalid input' });
//   }

//   try {
//     // Ensure sessions object is defined
//     global.sessions = global.sessions || {};

//     if (global.sessions[userId]) {
//       return res.status(400).json({ error: 'Session already active' });
//     }

//     const { browser, page } = await launchBrowser(userId);

//     global.sessions[userId] = { browser, page };

//     // Assuming User model is imported
//     const user = await User.findOneAndUpdate(
//       { userId },
//       { phoneNumber, sessionPath: `sessions/${userId}` },
//       { upsert: true, new: true }
//     );

//     res.status(200).json({ success: true, message: 'Session started' });
//   } catch (err) {
//     console.error('Session start error:', err);
//     res.status(500).json({
//       error: 'Failed to start session',
//       details: err.message
//     });
//   }
// };


const startSession = async (req, res) => {
  const { userId, phoneNumber } = req.body;

  if (!userId || !phoneNumber) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    if (sessions[userId]) {
      return res.status(400).json({ error: 'Session already active' });
    }

    const { browser, page } = await launchBrowser(userId);

    sessions[userId] = { browser, page };

    const user = await User.findOneAndUpdate(
      { userId },
      { phoneNumber, sessionPath: `sessions/${userId}` },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: 'Session started' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start session' });
  }
};

const closeSession = async (req, res) => {
  const { userId } = req.body;

  if (sessions[userId]) {
    await sessions[userId].browser.close();
    delete sessions[userId];
    res.status(200).json({ success: true, message: 'Session closed' });
  } else {
    res.status(400).json({ error: 'No active session for this user' });
  }
};


// const sendMessage = async (req, res) => {
//   const { userId, phoneNumber, message } = req.body;

//   if (!sessions[userId]) {
//     return res.status(400).json({ error: 'Session not active' });
//     // startSession(req,res);
//   }

//   try {
//     const page = sessions[userId].page;

//     // Selectors based on the working code
//     const searchSelector = 'div[contenteditable="true"][role="textbox"]';
//     const messageSelector = 'div[contenteditable="true"][data-tab="10"]';
//     const sendButtonSelector = 'button[data-testid="send"]';

//     // Wait for search box
//     await page.waitForSelector(searchSelector, { timeout: 30000 });
//     const searchBox = await page.$(searchSelector);

//     if (searchBox) {
//       // Clear any existing text and type phone number
//       await searchBox.click();
//       await searchBox.type(phoneNumber, { delay: 100 });
//       await page.keyboard.press('Enter');

//       // Wait for contact to be selected
//       // await page.waitForTimeout(2000);
//     } else {
//       throw new Error('Search box not found');
//     }

//     // Wait for message input box
//     await page.waitForSelector(messageSelector, { timeout: 30000 });
//     const messageBox = await page.$(messageSelector);

//     if (messageBox) {
//       // Type and send message
//       await messageBox.click();
//       await messageBox.type(message, { delay: 100 });
//       await page.keyboard.press('Enter');

//       // Optional: wait to ensure message is sent
//       // await page.waitForTimeout(1000);
//     } else {
//       throw new Error('Message box not found');
//     }

//     res.status(200).json({ 
//       success: true, 
//       message: 'Message sent successfully' 
//     });
//   } catch (err) {
//     console.error('Message sending error:', err);
//     res.status(500).json({ 
//       error: 'Failed to send message', 
//       details: err.message,
//       stack: err.stack
//     });
//   }
// };

const sendMessage = async (req, res) => {
  const { userId, phoneNumber, message } = req.body;

  if (!sessions[userId]) {
    return res.status(400).json({ error: 'Session not active' });
  }

  try {
    const page = sessions[userId].page;
    // const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    // console.log(`Attempting to send message to: ${formattedNumber}`);

    // Attempt to navigate to chat and send message
    let success = false;
    let errorMessage = '';

    try {
      // Step 1: Go back to main screen to clear any existing state
      // await goToMainScreen(page);
      // console.log("Reset to main screen");

      // // Step 2: Open new chat
      // await openNewChat(page);
      // console.log("Opened new chat dialog");

      // // Step 3: Enter phone number
      // await enterPhoneNumber(page, formattedNumber);
      // console.log("Entered phone number");

      // // Step 4: Check if contact found and proceed
      // const contactFound = await selectContact(page);
      // if (!contactFound) {
      //   throw new Error(`Contact not found for ${formattedNumber}`);
      // }
      // console.log("Contact selected");

      const formattedNumber = phoneNumber.startsWith('+')
        ? phoneNumber.replace(/\D/g, '')
        : phoneNumber.replace(/\D/g, '');

      // Direct navigation to the chat with this phone number
      const chatUrl = `https://web.whatsapp.com/send?phone=${formattedNumber}`;
      await page.goto(chatUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      
      // Step 5: Send the message
      await sendMessageToChat(page, message);
      console.log("Message sent");

      success = true;
    } catch (err) {
      errorMessage = err.message;
      console.error("Process failed:", errorMessage);
    }

    if (success) {
      return res.status(200).json({
        success: true,
        message: 'Message sent successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Failed to send message: ${errorMessage}`
      });
    }
  } catch (err) {
    console.error('Message sending error:', err);
    return res.status(500).json({
      error: 'Failed to send message',
      details: err.message
    });
  }
};

// Go back to main WhatsApp screen
async function goToMainScreen(page) {
  try {
    // Look for the back button and click it if found
    const hasBackButton = await page.evaluate(() => {
      // Try several possible back button selectors
      const backButtons = document.querySelectorAll('span[data-icon="back"], div[data-icon="back"], button[aria-label="Back"]');
      if (backButtons && backButtons.length > 0) {
        backButtons[0].click();
        return true;
      }
      return false;
    });

    // If back button clicked, wait for transition
    if (hasBackButton) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Verify we are on main screen by looking for new chat button
    const onMainScreen = await page.evaluate(() => {
      return !!document.querySelector('button[aria-label="New chat"]');
    });

    if (!onMainScreen) {
      // If we're still not on main screen, try clicking the WhatsApp icon
      await page.evaluate(() => {
        const appIcon = document.querySelector('div[data-testid="whatsapp-icon"]');
        if (appIcon) appIcon.click();
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.log("Error going to main screen:", error.message);
    // Even if there's an error, continue with the process
  }
}

// Open new chat dialog
// async function openNewChat(page) {
//   try {
//     // Click new chat button
//     await page.evaluate(() => {
//       const newChatButton = document.querySelector('button[aria-label="New chat"]');
//       if (newChatButton) newChatButton.click();
//     });

//     // Wait for the search box to appear
//     await page.waitForSelector('div[contenteditable="true"][role="textbox"]', { timeout: 5000 });

//     // Additional wait to ensure the dialog is fully loaded
//     await new Promise(resolve => setTimeout(resolve, 1000));
//   } catch (error) {
//     throw new Error(`Failed to open new chat: ${error.message}`);
//   }
// }

// // Enter phone number in search box
// async function enterPhoneNumber(page, phoneNumber) {
//   const searchSelector = 'div[contenteditable="true"][role="textbox"]';

//   try {
//     // Clear and focus the search box
//     await page.evaluate((selector) => {
//       const searchBox = document.querySelector(selector);
//       if (searchBox) {
//         searchBox.innerHTML = '';
//         searchBox.focus();
//       } else {
//         throw new Error('Search box not found');
//       }
//     }, searchSelector);

//     // Type the phone number with a slight delay
//     await page.type(searchSelector, phoneNumber, { delay: 100 });

//     // Wait for search results
//     await new Promise(resolve => setTimeout(resolve, 1500));
//   } catch (error) {
//     throw new Error(`Failed to enter phone number: ${error.message}`);
//   }
// }

// // Check if contact is found and select it
// async function selectContact(page) {
//   try {
//     // First check if there's a "no results" message
//     const noResults = await page.evaluate(() => {
//       const content = document.body.textContent;
//       return content.includes('No contacts found') ||
//         content.includes('Invalid phone number') ||
//         content.includes('Phone number shared via url is invalid');
//     });

//     if (noResults) {
//       return false;
//     }

//     // Press Enter to select the contact
//     await page.keyboard.press('Enter');

//     // Wait for chat to load
//     await page.waitForSelector('div[contenteditable="true"][data-tab="10"]', { timeout: 5000 });
//     await new Promise(resolve => setTimeout(resolve, 1500));

//     // Check if we're actually in a chat
//     const inChat = await page.evaluate(() => {
//       return !!document.querySelector('div[contenteditable="true"][data-tab="10"]');
//     });

//     return inChat;
//   } catch (error) {
//     throw new Error(`Failed to select contact: ${error.message}`);
//   }
// }

// Send message text
async function sendMessageToChat(page, message) {
  const messageSelector = 'div[contenteditable="true"][data-tab="10"]';
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check for and handle any popups
      await dismissPopups(page);

      // Wait for message input box
      await page.waitForSelector(messageSelector, { timeout: 5000 });

      // Use paste simulation to insert the message (looks more human than typing)
      await page.evaluate((selector, text) => {
        const el = document.querySelector(selector);
        if (el) {
          // Focus the element
          el.focus();

          // Clear existing content
          el.innerHTML = '';

          // Create a "paste" event with the message text
          const dataTransfer = new DataTransfer();
          dataTransfer.setData('text/plain', text);

          const pasteEvent = new ClipboardEvent('paste', {
            clipboardData: dataTransfer,
            bubbles: true,
            cancelable: true
          });

          // Dispatch the paste event
          el.dispatchEvent(pasteEvent);
        }
      }, messageSelector, message);

      // Small random delay to simulate human behavior (300-800ms)
      const randomDelay = Math.floor(Math.random() * 500) + 300;
      await new Promise(resolve => setTimeout(resolve, randomDelay));

      // Press Enter to send
      await page.keyboard.press('Enter');

      // Wait briefly to ensure message is sent
      await new Promise(resolve => setTimeout(resolve, 500));

      return;
    } catch (error) {
      console.log(`Attempt ${attempt + 1} to send message failed: ${error.message}`);
      // If it's the last retry, throw the error
      if (attempt === maxRetries - 1) {
        throw new Error(`Failed to send message after ${maxRetries} attempts: ${error.message}`);
      }
      // Otherwise wait and try again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Handle any popups that appear
async function dismissPopups(page) {
  try {
    await page.evaluate(() => {
      // Common dismiss button selectors
      const dismissSelectors = [
        'div[data-testid="popup-controls-cancel"]',
        'div[data-testid="confirm-popup-cancel-button"]',
        'button[aria-label="Close"]',
        'span[data-icon="close"]'
      ];

      for (const selector of dismissSelectors) {
        const button = document.querySelector(selector);
        if (button) {
          button.click();
          return true;
        }
      }

      return false;
    });
  } catch (error) {
    console.log("Error dismissing popups:", error.message);
  }
}





// .....................here every thing is working.............................
// const sendFileWithMessage = async (req, res) => {
//   // Use middleware to handle file upload
//   uploadMiddleware(req, res, async (err) => {
//     if (err) {
//       return res.status(400).json({ error: 'File upload failed', details: err.message });
//     }

//     const { userId, phoneNumber, message } = req.body;

//     // Log incoming data
//     console.log('Request body:', req.body);
//     console.log('User data:', userId, phoneNumber, message);
//     console.log('File data:', req.file);

//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }

//     if (!sessions[userId]) {
//       // Clean up the uploaded file if session is not active
//       fs.unlinkSync(req.file.path);
//       return res.status(400).json({ error: 'Session not active' });
//     }

//     let filePath = null;

//     try {
//       const page = sessions[userId].page;

//       // Ensure we have an absolute file path that exists
//       filePath = path.resolve(req.file.path);

//       // Verify file exists before attempting to upload
//       if (!fs.existsSync(filePath)) {
//         throw new Error(`File does not exist at path: ${filePath}`);
//       }

//       console.log('Uploading file from path:', filePath);
//       console.log('Original filename:', req.file.originalname);

//       // Selectors
//       const searchSelector = 'div[contenteditable="true"][role="textbox"]';
//       const attachmentSelector = 'button[title="Attach"]';
//       const fileInputSelector = 'input[type="file"]';
//       const messageSelector = 'div[contenteditable="true"][role="textbox"][aria-placeholder="Add a caption"]';
//       const sendButtonSelector = 'span[data-icon="send"]';

//       // Wait for search box and find contact
//       // await page.waitForSelector(searchSelector, { timeout: 30000 });
//       // const searchBox = await page.$(searchSelector);

//       // if (searchBox) {
//       //   // Clear and paste phone number
//       //   await searchBox.click({ clickCount: 3 });
//       //   await page.keyboard.press('Backspace');

//         const formattedNumber = phoneNumber.startsWith('+') 
//           ? phoneNumber 
//           : `+${phoneNumber}`;

//       //   await page.keyboard.type(formattedNumber);
//       //   await page.keyboard.press('Enter');
//       //   await new Promise(resolve => setTimeout(resolve, 2000));
//       // } else {
//       //   throw new Error('Search box not found');
//       // }

//       await goToMainScreen(page);
//       console.log("Reset to main screen");

//       // Step 2: Open new chat
//       await openNewChat(page);
//       console.log("Opened new chat dialog");

//       // Step 3: Enter phone number
//       await enterPhoneNumber(page, formattedNumber);
//       console.log("Entered phone number");

//       // Step 4: Check if contact found and proceed
//       const contactFound = await selectContact(page);
//       if (!contactFound) {
//         throw new Error(`Contact not found for ${formattedNumber}`);
//       }
//       console.log("Contact selected");



//       // Open attachment menu
//       await page.waitForSelector(attachmentSelector, { timeout: 10000 });
//       await page.click(attachmentSelector);

//       // Wait for file input and upload file
//       await page.waitForSelector(fileInputSelector, { timeout: 10000 });
//       const fileInput = await page.$(fileInputSelector);

//       if (fileInput) {
//         // Log before upload attempt
//         console.log('Attempting to upload file to WhatsApp...');

//         try {
//           // Upload file with explicit options
//           await fileInput.uploadFile(filePath);
//           console.log('File upload initiated successfully');
//         } catch (uploadError) {
//           console.error('File upload error:', uploadError);
//           throw new Error(`File upload failed: ${uploadError.message}`);
//         }

//         // Wait for file to be attached - longer wait for larger files
//         console.log('Waiting for file to attach...');
//         // Increased wait time to accommodate larger files
//         await new Promise(resolve => setTimeout(resolve, 5000));
//       } else {
//         throw new Error('File upload input not found');
//       }

//       // Add message if provided
//       if (message) {
//         await page.waitForSelector(messageSelector, { timeout: 10000 });
//         const messageBox = await page.$(messageSelector);

//         if (messageBox) {
//           await messageBox.click();
//           await page.keyboard.type(message);
//         }
//       }

//       // Look for send button - more reliable than pressing Enter
//       await page.waitForSelector(sendButtonSelector, { timeout: 10000 });
//       await page.click(sendButtonSelector);
//       console.log('File sent command issued');

//       // Wait a longer time for the send to complete, especially for larger files
//       const fileSize = req.file.size;
//       // Calculate wait time based on file size (minimum 5 seconds, more for larger files)
//       const waitTime = Math.max(5000, Math.min(30000, fileSize / 50000 * 1000));
//       console.log(`Waiting ${waitTime}ms for file send to complete...`);
//       await new Promise(resolve => setTimeout(resolve, waitTime));

//       // Success response - note we're NOT deleting the file yet
//       res.status(200).json({
//         success: true,
//         message: 'File sent successfully',
//         fileName: req.file.originalname
//       });

//       // IMPORTANT: Delete the file AFTER the response has been sent
//       console.log('Response sent, now cleaning up file...');
//       setTimeout(() => {
//         try {
//           if (fs.existsSync(filePath)) {
//             fs.unlinkSync(filePath);
//             console.log('Temporary file removed after successful send');
//           }
//         } catch (cleanupError) {
//           console.error('Failed to remove temporary file:', cleanupError);
//         }
//       }, 10000); // Wait an additional 10 seconds after response before deleting

//     } catch (err) {
//       console.error('File sending error:', err);

//       res.status(500).json({
//         error: 'Failed to send file',
//         details: err.message
//       });

//       // Even on error, don't delete the file immediately
//       if (filePath && fs.existsSync(filePath)) {
//         setTimeout(() => {
//           try {
//             fs.unlinkSync(filePath);
//             console.log('Temporary file removed after error');
//           } catch (cleanupError) {
//             console.error('Failed to remove temporary file during error handling:', cleanupError);
//           }
//         }, 5000);
//       }
//     }
//   });
// };







const sendFileWithMessage = async (req, res) => {
  // Use middleware to handle file upload
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: 'File upload failed', details: err.message });
    }

    const { userId, phoneNumber, message } = req.body;

    // Log only essential data
    console.log('Processing file send request for:', phoneNumber);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!sessions[userId]) {
      // Clean up the uploaded file if session is not active
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Session not active' });
    }

    let filePath = null;

    try {
      const page = sessions[userId].page;

      // Ensure we have an absolute file path that exists
      filePath = path.resolve(req.file.path);

      // Verify file exists before attempting to upload
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist at path: ${filePath}`);
      }

      // FASTER APPROACH - Use direct navigation to chat instead of search
      // Format phone number correctly
      const formattedNumber = phoneNumber.startsWith('+')
        ? phoneNumber.replace(/\D/g, '')
        : phoneNumber.replace(/\D/g, '');

      // Direct navigation to the chat with this phone number
      const chatUrl = `https://web.whatsapp.com/send?phone=${formattedNumber}`;
      await page.goto(chatUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      // Wait for the chat to load
      // const chatLoadSelector = 'div[data-testid="conversation-panel-wrapper"]';
      // await page.waitForSelector(chatLoadSelector, { timeout: 20000 });

      // Brief pause to ensure everything is loaded
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Open attachment menu
      const attachmentSelector = 'button[title="Attach"]';
      await page.waitForSelector(attachmentSelector, { timeout: 10000 });
      await page.click(attachmentSelector);

      // Wait for file input and upload file
      const fileInputSelector = 'input[type="file"]';
      await page.waitForSelector(fileInputSelector, { timeout: 10000 });
      const fileInput = await page.$(fileInputSelector);

      if (fileInput) {
        // Upload file
        await fileInput.uploadFile(filePath);

        // Dynamic wait based on file size - but faster overall
        const fileSize = req.file.size;
        const uploadWaitTime = Math.max(3000, Math.min(5000, fileSize / 50000 * 500));
        await new Promise(resolve => setTimeout(resolve, uploadWaitTime));
      } else {
        throw new Error('File upload input not found');
      }

      // Add message if provided
      if (message) {
        const messageSelector = 'div[contenteditable="true"][role="textbox"][aria-placeholder="Add a caption"]';
        await page.waitForSelector(messageSelector, { timeout: 10000 });
        await page.evaluate((selector, text) => {
          const el = document.querySelector(selector);
          if (el) {
            // Focus the element
            el.focus();
  
            // Clear existing content
            el.innerHTML = '';
  
            // Create a "paste" event with the message text
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', text);
  
            const pasteEvent = new ClipboardEvent('paste', {
              clipboardData: dataTransfer,
              bubbles: true,
              cancelable: true
            });
  
            // Dispatch the paste event
            el.dispatchEvent(pasteEvent);
          }
        }, messageSelector, message);
      }

      // Send the file
      // Press Enter to send
      await page.keyboard.press('Enter');

      // Wait for send to complete - faster dynamic wait
      const fileSize = req.file.size;
      const sendWaitTime = Math.max(2000, Math.min(4000, fileSize / 100000 * 1000));
      await new Promise(resolve => setTimeout(resolve, sendWaitTime));

      // Immediately return success response
      res.status(200).json({
        success: true,
        message: 'File sent successfully',
        fileName: req.file.originalname
      });

      // Clean up file after response is sent
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          console.error('File cleanup error:', cleanupError.message);
        }
      }, 5000);

    } catch (err) {
      console.error('File sending error:', err);

      res.status(500).json({
        error: 'Failed to send file',
        details: err.message
      });

      // Clean up file on error
      if (filePath && fs.existsSync(filePath)) {
        setTimeout(() => {
          try {
            fs.unlinkSync(filePath);
          } catch (cleanupError) {
            console.error('File cleanup error:', cleanupError.message);
          }
        }, 2000);
      }
    }
  });
};
module.exports = { startSession, closeSession, sendMessage, sendFileWithMessage };