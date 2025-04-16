const rateLimit = require('express-rate-limit');

const messageLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // Limit to 5 requests per 10 seconds per user
  message: 'Too many messages sent, please slow down.',
  keyGenerator: (req, res) => {
    return req.body.userId || req.ip; // fallback to IP if userId is missing
  }
});

module.exports = messageLimiter;