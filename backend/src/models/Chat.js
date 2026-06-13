const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Message content cannot exceed 1000 characters']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  serviceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest',
    required: false,
    default: null
  },
  isDirectChat: {
    type: Boolean,
    default: false
  },
  messages: [messageSchema],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId
  },
  isActive: {
    type: Boolean,
    default: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mechanic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
chatSchema.index({ participants: 1 });
chatSchema.index({ serviceRequest: 1 });
chatSchema.index({ customer: 1, mechanic: 1 });
chatSchema.index({ 'messages.createdAt': -1 });

// Virtual for unread message count
chatSchema.virtual('unreadCount').get(function() {
  return this.messages.filter(msg => !msg.isRead).length;
});

// Method to mark messages as read
chatSchema.methods.markAsRead = async function(userId) {
  const unreadMessages = this.messages.filter(msg => 
    !msg.isRead && msg.sender.toString() !== userId.toString()
  );
  
  if (unreadMessages.length > 0) {
    unreadMessages.forEach(msg => {
      msg.isRead = true;
      msg.readAt = new Date();
    });
    await this.save();
  }
  
  return unreadMessages.length;
};

// Method to add a new message
chatSchema.methods.addMessage = async function(senderId, content, messageType = 'text', fileUrl = null) {
  try {
    const message = {
      sender: senderId,
      content,
      messageType,
      fileUrl,
      isRead: false
    };
    
    this.messages.push(message);
    await this.save();
    
    // Set lastMessage after saving (when the message has an _id)
    this.lastMessage = this.messages[this.messages.length - 1]._id;
    await this.save();
    
    return this.messages[this.messages.length - 1];
  } catch (error) {
    console.error('Error in addMessage method:', error);
    throw error;
  }
};

module.exports = mongoose.model('Chat', chatSchema);
