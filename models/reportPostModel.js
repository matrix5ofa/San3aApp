const mongoose = require('mongoose');

const reportPostSchema = mongoose.Schema({
  postId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Post',
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  description: String,
  reportedAt: String
});

const ReportPost = mongoose.model('ReportPost', reportPostSchema);

module.exports = ReportPost;
