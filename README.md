# Project : Blog API — Full Notes (Posts + Comments)

## What this project is

A backend where:
- People can create **blog posts** (title + content)
- People can add **comments** on a specific post
- Every comment is **linked** to the exact post it belongs to

**New skill vs. Todo project:** two separate collections (`posts`, `comments`) connected to each other, instead of just one collection standing alone.

Same database (MongoDB), same tools (Express + Mongoose) as the Todo project — nothing new installed.

---

## The core concept — references (like a foreign key)

In SQL, a foreign key stores another table's primary key to link rows. MongoDB doesn't have foreign keys, but does the same thing with a **reference**: a Comment document stores the `_id` of the Post it belongs to.

```
Comment { text: "Great post!", post: "<Post's _id>" }
```

Two pieces are needed to make this work in a schema:
1. **`type: mongoose.Schema.Types.ObjectId`** — says "this field holds a MongoDB id" (not text, not true/false)
2. **`ref: 'Post'`** — says "and that id specifically belongs to the `Post` collection" — this removes ambiguity, since ids look the same across different collections. Without `ref`, MongoDB wouldn't know which collection to search when looking up that id later.

`mongoose.Schema.Types.ObjectId` is long because `ObjectId` isn't a plain JavaScript built-in (like `String`/`Boolean` are) — it's a type Mongoose built specifically for MongoDB ids, stored deep inside Mongoose's own library structure. You must write the full "path" to reach it: `mongoose → Schema → Types → ObjectId`.

---

## File structure (industry standard)

```
project-folder/
  ├── db.js                  (database connection)
  ├── models/
  │     ├── post.js           (Post schema/model)
  │     └── comment.js        (Comment schema/model)
  └── index.js                (main file — routes, middleware, listen)
```

**Why split this way:**
- `db.js` — connection logic in one place, so it's not repeated across files
- `models/` — one file per collection; keeps things organized as the project grows
- `index.js` — only server setup and routes; no database detail lives here

---

## File 1 — `db.js`

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/blogdb')
  .then(() => console.log('MongoDB connected!'))
  .catch((err) => console.log('Connection error', err));
```

Nothing new — same connection code as the Todo project, just moved into its own file. Not exported (nothing needs to be pulled out of it — it just needs to run).

---

## File 2 — `models/post.js`

```javascript
const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    title: String,
    content: String
});

module.exports = mongoose.model('Post', postSchema);
```

Simple schema, no references — same pattern as the Todo schema, just different field names.

---

## File 3 — `models/comment.js`

```javascript
const mongoose = require('mongoose');

const commentSchema = mongoose.Schema({
    text: String,
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    }
});

module.exports = mongoose.model('Comment', commentSchema);
```

- `text` — plain field, same as before
- `post` — the reference field: holds a Post's `_id`, and `ref: 'Post'` tells Mongoose which collection that id belongs to

---

## File 4 — `index.js`

```javascript
const express = require('express');
const app = express();

require('./db');
const Post = require('./models/post');
const Comment = require('./models/comment');

app.use(express.json());

// POST — create a new post
app.post('/posts', async (req, res) => {
  const newPost = await Post.create({
    title: req.body.title,
    content: req.body.content
  });
  res.status(201).json(newPost);
});

// GET — all posts
app.get('/posts', async (req, res) => {
  const posts = await Post.find();
  res.json(posts);
});

// POST — create a new comment, linked to a post
app.post('/comments', async (req, res) => {
  const newComment = await Comment.create({
    text: req.body.text,
    post: req.body.postId
  });
  res.status(201).json(newComment);
});

// GET — all comments, WITH full post details populated
app.get('/comments', async (req, res) => {
  const comments = await Comment.find().populate('post');
  res.json(comments);
});

app.listen(3000, () => console.log('running on 3000'));
```

**Note:** `require('./db')` is called without storing it in a variable — we don't need anything back from that file, it just needs to run (connect to MongoDB) once, when the app starts.

---

## `.populate()` — the payoff

Without `.populate()`, `GET /comments` would show the raw id sitting in the `post` field — not very useful.

```javascript
Comment.find().populate('post')
```

This tells Mongoose: "for every comment found, look at its `post` field, go fetch the **actual Post document** that id points to, and swap it in instead of just the id."

**Result — instead of:**
```json
{ "text": "Great post!", "post": "6ab62169ccb94e3f26425ea6" }
```

**You get:**
```json
{
  "text": "Great post!",
  "post": {
    "_id": "6ab62169ccb94e3f26425ea6",
    "title": "First Blog",
    "content": "Hi, I am Vipul shrivastav..."
  }
}
```

The word `'post'` passed to `.populate()` is the **field name** in the Comment schema (the one with `ref: 'Post'`) — not the model name.

---

## How to test the whole flow, step by step

1. **Create a post:**
   `POST http://localhost:3000/posts`
   ```json
   { "title": "First Blog", "content": "Hi, this is my first blog" }
   ```
   Copy the returned `_id`.

2. **Confirm posts list:**
   `GET http://localhost:3000/posts`

3. **Create a comment on that post** (use the copied `_id` as `postId`):
   `POST http://localhost:3000/comments`
   ```json
   { "text": "Great post!", "postId": "<paste post's _id here>" }
   ```

4. **See the comment with full post details populated:**
   `GET http://localhost:3000/comments`
   → the `post` field should show the entire post object, not just an id.

---

## Common mistakes to avoid (from this session)

- **JSON body must be valid JSON**, always: curly braces `{ }`, double quotes around every field name and text value, no semicolons, no trailing commas.
- **One JSON object per request body** — never paste two objects into one Body box. Each POST needs its own separate request.
- Schema field names must **exactly match** what your routes send (`req.body.task` won't save anything if the schema field is called `filed1`) — Mongoose silently drops fields not defined in the schema.
- Every route function (`app.get`, `app.post`, etc.) must live at the top level, directly on `app` — never nested inside another route's callback.
- Always call `Todo.something()` / `Model.something()` with the model name in front — a bare function like `findByIdAndUpdate(...)` without `Todo.` in front doesn't exist on its own.

---

## Optional next step (not yet built)

**GET a single post along with all its comments** — the reverse direction (post → its comments). This would need a separate query filtering comments by `post` id, e.g.:
```javascript
app.get('/posts/:id', async (req, res) => {
  const post = await Post.findById(req.params.id);
  const comments = await Comment.find({ post: req.params.id });
  res.json({ post, comments });
});
```
This introduces passing a filter object to `.find()` — worth doing as a follow-up exercise.




Installation
bash
git clone <your-repo-url>
cd blog-api
npm install
Configuration

By default, the app connects to a local MongoDB instance:

javascript
mongodb://localhost:27017/blogdb

Update this in db.js if you're using a different MongoDB URI.

Running the app
bash
node index.js

The server starts on http://localhost:3000.

API Routes
Posts
Method	Route	Description	Body
POST	/posts	Create a new post	{ "title": "string", "content": "string" }
GET	/posts	Get all posts	—
Comments
Method	Route	Description	Body
POST	/comments	Create a comment on a post	{ "text": "string", "postId": "post's _id" }
GET	/comments	Get all comments, with full post details populated	—
Example usage

Create a post:

json
POST /posts
{
  "title": "First Blog",
  "content": "Hi, this is my first blog post"
}

Create a comment on that post:

json
POST /comments
{
  "text": "Great post!",
  "postId": "<the post's _id from above>"
}

Fetch comments (with post details populated):

json
GET /comments

[
  {
    "_id": "...",
    "text": "Great post!",
    "post": {
      "_id": "...",
      "title": "First Blog",
      "content": "Hi, this is my first blog post"
    }
  }
]
What this project demonstrates
Basic CRUD operations with Express and Mongoose
Structuring a Node.js app into separate concerns (database connection, models, routes)
Linking two MongoDB collections using references (ObjectId + ref)
Using .populate() to fetch related documents across collections
Status

This is a learning project, currently run locally. Not yet deployed.

Content
