const Chat = require('../models/Chat');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         sender:
 *           type: string
 *           description: User ID of the message sender
 *         content:
 *           type: string
 *           description: Message content
 *         messageType:
 *           type: string
 *           enum: [text, image, file]
 *           description: Type of message
 *         fileUrl:
 *           type: string
 *           description: URL of attached file (if any)
 *         isRead:
 *           type: boolean
 *           description: Whether the message has been read
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Chat:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         participants:
 *           type: array
 *           items:
 *             type: string
 *         serviceRequest:
 *           type: string
 *         messages:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Message'
 *         customer:
 *           type: string
 *         mechanic:
 *           type: string
 *         isActive:
 *           type: boolean
 */

/**
 * @swagger
 * /api/chat/conversations:
 *   get:
 *     summary: Get user's chat conversations
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of chat conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Chat'
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    logger.info('Getting conversations for user:', { userId, userRole: req.user.role });
    
    const conversations = await Chat.find({
      participants: userId,
      isActive: true
    })
    .populate('customer', 'name email phone')
    .populate('mechanic', 'name email phone')
    .populate('serviceRequest', 'issueType description status')
    .populate('messages.sender', 'name')
    .sort({ updatedAt: -1 });

    logger.info('Found conversations:', { 
      count: conversations.length,
      conversationIds: conversations.map(c => c._id)
    });

    // Add unread count for each conversation
    const conversationsWithUnreadCount = conversations.map(chat => {
      const unreadCount = chat.messages.filter(msg => 
        !msg.isRead && msg.sender._id.toString() !== userId
      ).length;
      
      return {
        ...chat.toObject(),
        unreadCount
      };
    });

    logger.info('Conversations retrieved successfully', { 
      userId, 
      conversationCount: conversationsWithUnreadCount.length 
    });
    
    return sendSuccessResponse(res, 200, 'Conversations retrieved successfully', conversationsWithUnreadCount);
  } catch (error) {
    logger.error('Error getting conversations:', error);
    return sendErrorResponse(res, 500, 'Failed to get conversations');
  }
};

/**
 * @swagger
 * /api/chat/conversations/{serviceRequestId}:
 *   get:
 *     summary: Get or create chat conversation for a service request
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceRequestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat conversation details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Chat'
 */
const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceRequestId } = req.params;

    // First check if this is a direct chat (the param is actually a chatId)
    const directChat = await Chat.findOne({
      _id: serviceRequestId,
      isDirectChat: true,
      isActive: true
    })
      .populate('customer', 'name email phone')
      .populate('mechanic', 'name email phone')
      .populate('messages.sender', 'name');

    if (directChat) {
      if (!directChat.participants.some(p => p.toString() === userId.toString())) {
        return sendErrorResponse(res, 403, 'Access denied');
      }
      await directChat.markAsRead(userId);
      return sendSuccessResponse(res, 200, 'Chat conversation retrieved successfully', directChat);
    }

    // Otherwise, treat as a real service request chat
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return sendErrorResponse(res, 404, 'Service request not found');
    }

    // Check if user is authorized to access this chat
    const isCustomer = (serviceRequest.customerId || serviceRequest.customer)?.toString() === userId;
    const isMechanic = (serviceRequest.mechanicId || serviceRequest.mechanic)?.toString() === userId;
    
    if (!isCustomer && !isMechanic) {
      return sendErrorResponse(res, 403, 'Access denied');
    }

    // Find existing chat or create new one
    let chat = await Chat.findOne({
      serviceRequest: serviceRequestId,
      isActive: true
    })
    .populate('customer', 'name email phone')
    .populate('mechanic', 'name email phone')
    .populate('serviceRequest', 'issueType description status')
    .populate('messages.sender', 'name');

    if (!chat) {
      const customerId = serviceRequest.customerId || serviceRequest.customer;
      const mechanicId = serviceRequest.mechanicId || serviceRequest.mechanic;
      // Create new chat conversation
      chat = new Chat({
        participants: [customerId, mechanicId].filter(Boolean),
        serviceRequest: serviceRequestId,
        customer: customerId,
        mechanic: mechanicId,
        messages: []
      });

      await chat.save();
      
      // Populate the newly created chat
      chat = await Chat.findById(chat._id)
        .populate('customer', 'name email phone')
        .populate('mechanic', 'name email phone')
        .populate('serviceRequest', 'issueType description status')
        .populate('messages.sender', 'name');
    }

    // Mark messages as read for the current user
    await chat.markAsRead(userId);

    logger.info('Chat conversation retrieved/created successfully', { 
      userId, 
      serviceRequestId, 
      chatId: chat._id 
    });

    return sendSuccessResponse(res, 200, 'Chat conversation retrieved successfully', chat);
  } catch (error) {
    logger.error('Error getting/creating chat conversation:', error);
    return sendErrorResponse(res, 500, 'Failed to get chat conversation');
  }
};

/**
 * @swagger
 * /api/chat/conversations/{serviceRequestId}/messages:
 *   post:
 *     summary: Send a message in a chat conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceRequestId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 required: true
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *               fileUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 */
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceRequestId } = req.params;
    const { content, messageType = 'text', fileUrl } = req.body;

    logger.info('Attempting to send message:', {
      userId,
      serviceRequestId,
      content: content ? content.substring(0, 50) + '...' : 'empty',
      messageType
    });

    if (!content || content.trim().length === 0) {
      return sendErrorResponse(res, 400, 'Message content is required');
    }

    // Get or create chat conversation
    let chat = await Chat.findOne({
      serviceRequest: serviceRequestId,
      isActive: true
    });

    if (!chat) {
      logger.error('Chat conversation not found:', { serviceRequestId });
      return sendErrorResponse(res, 404, 'Chat conversation not found');
    }

    logger.info('Found chat conversation:', { chatId: chat._id, participants: chat.participants });

    // Verify user is a participant (handle both string and ObjectId comparison)
    const isParticipant = chat.participants.some(participant => 
      participant.toString() === userId.toString()
    );
    
    if (!isParticipant) {
      logger.error('User not a participant:', { 
        userId, 
        userIdType: typeof userId,
        participants: chat.participants.map(p => ({ id: p.toString(), type: typeof p })),
        isParticipant 
      });
      return sendErrorResponse(res, 403, 'Access denied');
    }

    // Add message to chat
    logger.info('Adding message to chat...');
    let message;
    try {
      message = await chat.addMessage(userId, content.trim(), messageType, fileUrl);
      logger.info('Message added successfully:', { messageId: message._id });
    } catch (addMessageError) {
      logger.error('Error in addMessage:', addMessageError);
      throw addMessageError;
    }

    // Populate sender information
    try {
      await message.populate('sender', 'name');
      logger.info('Message populated successfully');
    } catch (populateError) {
      logger.error('Error populating message:', populateError);
      // Continue without population rather than failing
    }

    logger.info('Message sent successfully', { 
      userId, 
      serviceRequestId, 
      messageId: message._id 
    });

    return sendSuccessResponse(res, 200, 'Message sent successfully', message);
  } catch (error) {
    logger.error('Error sending message:', error);
    logger.error('Error stack:', error.stack);
    return sendErrorResponse(res, 500, 'Failed to send message');
  }
};

/**
 * @swagger
 * /api/chat/conversations/{serviceRequestId}/messages:
 *   get:
 *     summary: Get messages from a chat conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceRequestId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Message'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceRequestId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get chat conversation — try by serviceRequestId first, fall back to chatId (for direct chats)
    let chat = await Chat.findOne({
      serviceRequest: serviceRequestId,
      isActive: true
    });

    if (!chat) {
      // Fallback: the ID is actually the chatId (direct chat with no service request)
      chat = await Chat.findOne({
        _id: serviceRequestId,
        isActive: true
      });
    }

    if (!chat) {
      return sendErrorResponse(res, 404, 'Chat conversation not found');
    }

    // Verify user is a participant (use .toString() for ObjectId comparison)
    if (!chat.participants.some(p => p.toString() === userId.toString())) {
      return sendErrorResponse(res, 403, 'Access denied');
    }

    // Mark messages as read
    await chat.markAsRead(userId);

    // Get messages with pagination
    const messages = await Chat.aggregate([
      { $match: { _id: chat._id } },
      { $unwind: '$messages' },
      { $sort: { 'messages.createdAt': -1 } },
      { $skip: skip },
      { $limit: limit },
      { $sort: { 'messages.createdAt': 1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'messages.sender',
          foreignField: '_id',
          as: 'senderInfo'
        }
      },
      {
        $addFields: {
          'messages.sender': { $arrayElemAt: ['$senderInfo', 0] }
        }
      },
      { $project: { messages: 1 } }
    ]);

    const totalMessages = chat.messages.length;
    const totalPages = Math.ceil(totalMessages / limit);

    const response = {
      messages: messages.map(m => m.messages),
      pagination: {
        page,
        limit,
        total: totalMessages,
        pages: totalPages
      }
    };

    logger.info('Messages retrieved successfully', { 
      userId, 
      serviceRequestId, 
      page, 
      limit 
    });

    return sendSuccessResponse(res, 200, 'Messages retrieved successfully', response);
  } catch (error) {
    logger.error('Error getting messages:', error);
    return sendErrorResponse(res, 500, 'Failed to get messages');
  }
};

/**
 * @swagger
 * /api/chat/direct-chat:
 *   post:
 *     summary: Create a direct chat conversation with a mechanic
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mechanicId:
 *                 type: string
 *                 required: true
 *               serviceRequestData:
 *                 type: object
 *                 properties:
 *                   issueType:
 *                     type: string
 *                   description:
 *                     type: string
 *                   location:
 *                     type: object
 *                   vehicleInfo:
 *                     type: object
 *     responses:
 *       200:
 *         description: Direct chat created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Chat'
 */
const createDirectChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mechanicId } = req.body;

    if (!mechanicId) {
      return sendErrorResponse(res, 400, 'Mechanic ID is required');
    }

    // Verify mechanic exists and is active
    const mechanic = await User.findOne({ _id: mechanicId, role: 'mechanic', isActive: true });
    if (!mechanic) {
      return sendErrorResponse(res, 404, 'Mechanic not found or inactive');
    }

    // Find existing direct chat between this customer and mechanic (NO service request)
    let chat = await Chat.findOne({
      customer: userId,
      mechanic: mechanicId,
      isDirectChat: true,
      isActive: true
    })
      .populate('customer', 'name email phone')
      .populate('mechanic', 'name email phone')
      .populate('messages.sender', 'name');

    if (!chat) {
      // Create a brand-new direct-only chat (no ServiceRequest document at all)
      const newChat = new Chat({
        participants: [userId, mechanicId],
        serviceRequest: null,
        isDirectChat: true,
        customer: userId,
        mechanic: mechanicId,
        messages: []
      });
      await newChat.save();

      chat = await Chat.findById(newChat._id)
        .populate('customer', 'name email phone')
        .populate('mechanic', 'name email phone')
        .populate('messages.sender', 'name');
    }

    logger.info('Direct chat ready', { userId, mechanicId, chatId: chat._id });
    return sendSuccessResponse(res, 200, 'Direct chat ready', chat);
  } catch (error) {
    logger.error('Error creating direct chat:', error);
    return sendErrorResponse(res, 500, 'Failed to create direct chat');
  }
};

// Send a message in a direct chat keyed by chatId
const sendDirectMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const { content, messageType = 'text' } = req.body;

    if (!content || !content.trim()) {
      return sendErrorResponse(res, 400, 'Message content is required');
    }

    const chat = await Chat.findOne({ _id: chatId, isActive: true });
    if (!chat) {
      return sendErrorResponse(res, 404, 'Chat not found');
    }

    if (!chat.participants.map(p => p.toString()).includes(userId)) {
      return sendErrorResponse(res, 403, 'Access denied');
    }

    const message = await chat.addMessage(userId, content.trim(), messageType);

    const populatedChat = await Chat.findById(chat._id).populate('messages.sender', 'name');
    const savedMessage = populatedChat.messages.id(message._id);

    // Emit to socket room so both sides receive the message live
    // Socket server uses 'request_${id}' room naming convention
    const io = req.app.get('io');
    if (io) {
      const requestNamespace = io.of('/requests');
      requestNamespace.to(`request_${chatId}`).emit('new-message', {
        _id: message._id,
        chatId,
        requestId: chatId,
        sender: { _id: userId, name: req.user.name },
        content: content.trim(),
        messageType,
        createdAt: message.createdAt,
        isRead: false
      });
    }

    logger.info('Direct message sent', { userId, chatId, messageId: message._id });
    return sendSuccessResponse(res, 200, 'Message sent successfully', savedMessage);
  } catch (error) {
    logger.error('Error sending direct message:', error);
    return sendErrorResponse(res, 500, 'Failed to send message');
  }
};

/**
 * @swagger
 * /api/chat/conversations/{serviceRequestId}/read:
 *   post:
 *     summary: Mark messages as read in a chat conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceRequestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     readCount:
 *                       type: integer
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceRequestId } = req.params;

    // Support serviceRequest-based and chatId-based lookup
    let chat = await Chat.findOne({ serviceRequest: serviceRequestId, isActive: true });
    if (!chat) {
      chat = await Chat.findOne({ _id: serviceRequestId, isActive: true });
    }

    if (!chat) {
      return sendErrorResponse(res, 404, 'Chat conversation not found');
    }

    if (!chat.participants.map(p => p.toString()).includes(userId)) {
      return sendErrorResponse(res, 403, 'Access denied');
    }

    const readCount = await chat.markAsRead(userId);

    logger.info('Messages marked as read', { userId, serviceRequestId, readCount });
    return sendSuccessResponse(res, 200, 'Messages marked as read successfully', { readCount });
  } catch (error) {
    logger.error('Error marking messages as read:', error);
    return sendErrorResponse(res, 500, 'Failed to mark messages as read');
  }
};

// Delete/clear a chat conversation (soft-delete all messages)
const deleteChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    // Support both chatId and serviceRequestId
    let chat = await Chat.findOne({ _id: chatId, isActive: true });
    if (!chat) {
      chat = await Chat.findOne({ serviceRequest: chatId, isActive: true });
    }

    if (!chat) {
      return sendErrorResponse(res, 404, 'Chat not found');
    }

    if (!chat.participants.map(p => p.toString()).includes(userId)) {
      return sendErrorResponse(res, 403, 'Access denied');
    }

    // Clear all messages from the chat
    chat.messages = [];
    chat.lastMessage = undefined;
    await chat.save();

    logger.info('Chat messages deleted', { userId, chatId });
    return sendSuccessResponse(res, 200, 'Chat cleared successfully', {});
  } catch (error) {
    logger.error('Error deleting chat:', error);
    return sendErrorResponse(res, 500, 'Failed to delete chat');
  }
};

module.exports = {
  getConversations,
  getOrCreateConversation,
  sendMessage,
  getMessages,
  markAsRead,
  createDirectChat,
  sendDirectMessage,
  deleteChat
};
