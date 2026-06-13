const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { validate, schemas } = require('../middlewares/validationMiddleware');

// Apply authentication to all chat routes
router.use(authenticateToken);

// Chat conversation routes
router.get('/conversations', chatController.getConversations);
router.get('/conversations/:serviceRequestId', chatController.getOrCreateConversation);

// Direct chat routes (no service request created)
router.post('/direct-chat', chatController.createDirectChat);
router.post('/direct-chat/:chatId/messages', chatController.sendDirectMessage);

// Delete chat route (clears all messages for all participants)
router.delete('/delete/:chatId', chatController.deleteChat);

// Message routes
router.get('/conversations/:serviceRequestId/messages', chatController.getMessages);
router.post('/conversations/:serviceRequestId/messages', validate(schemas.sendMessage), chatController.sendMessage);

// Read status routes
router.post('/conversations/:serviceRequestId/read', chatController.markAsRead);

module.exports = router;
