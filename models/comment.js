const mongoose = require('mongoose');

const commentSchema = mongoose.Schema({
  text: String,
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }
});

module.exports = mongoose.model('Comment', commentSchema);