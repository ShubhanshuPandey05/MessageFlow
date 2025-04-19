const express = require('express');
const { startSession, closeSession, sendMessage, sendFileWithMessage, clickSs } = require('../controllers/whatsappController');
const messageLimiter = require('../utils/rateLimiter');

const router = express.Router();

router.post('/start', startSession);
router.post('/close', closeSession);
router.post('/send', messageLimiter, sendMessage);
router.post('/sendFile', messageLimiter, sendFileWithMessage);
router.post('/ss', clickSs);

module.exports = router;