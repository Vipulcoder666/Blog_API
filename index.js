const express = require('express');
const app = express();

require('./db')
const Post = require('./models/post');
const Comment = require('./models/comment');

app.use(express.json());        

app.post('/posts', async (req, res) => {
  const newPost = await Post.create({
    title: req.body.title,
    content: req.body.content
  });
  res.status(201).json(newPost);
});

app.get('/posts', async (req, res) => {
  const posts = await Post.find();
  res.json(posts);
});

app.post('/comments', async (req, res) => {
  const newComment = await Comment.create({
    text: req.body.text,
    post: req.body.postId
  });
  res.status(201).json(newComment);
});

app.get('/comments', async (req, res) => {
  const comments = await Comment.find().populate('post');
  res.json(comments);
});

app.listen(3000);