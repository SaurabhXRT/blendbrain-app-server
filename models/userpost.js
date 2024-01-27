const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  text: {
    type: String,
    require: true
  },
  image: {
    type: String,
    require: true
  }, 
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  comments: [
    {
      text: String,
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
 
});

module.exports = mongoose.model('Post', postSchema);
