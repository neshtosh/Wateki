const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const auth = require('basic-auth');

const app = express();
const port = 3000;
 
// Enable CORS for your wateki.org domain
app.use(cors({ origin: 'https://www.wateki.org' }));

const uri = "mongodb+srv://alexwateki:Homecoming@cluster0.zykfy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Define the Comment model
const commentSchema = new mongoose.Schema({
    name: String,
    email: String,
    website: String,
    message: String,
    date: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

// Define the ContactMessage model
const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    subject: String,
    message: String,
    date: { type: Date, default: Date.now }
});
const ContactMessage = mongoose.model('ContactMessage', contactSchema);

async function connectToDatabase() {
    try {
        await mongoose.connect(uri);
        console.log("Connected to MongoDB using Mongoose");
    } catch (error) {
        console.error("Error connecting to MongoDB or managing data:", error);
    }
}

connectToDatabase();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create a WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  // Send a valid JSON message
  ws.send(JSON.stringify({ message: 'Welcome!' }));
});

// Basic authentication middleware
const basicAuth = (req, res, next) => {
  const user = auth(req);

  if (!user || user.name!== 'admin' || user.pass!== 'password') {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required.');
  }

  next();
};

// Protect the /admin.html route with basic authentication
app.get('/admin.html', basicAuth, (req, res) => {
  res.sendFile(__dirname + '/frontend/admin.html');
});

// API Routes

// Comments
app.post('/api/comments', async (req, res) => {
    try {
        const newComment = new Comment(req.body);
        await newComment.save();

        // Send the new comment to all connected WebSocket clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(newComment));
            }
        });

        res.status(201).json(newComment);
    } catch (error) {
        console.error("Error saving comment:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/comments', async (req, res) => {
    try {
        const comments = await Comment.find();
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Contact Messages
app.post('/api/contact', async (req, res) => {
    try {
        const newMessage = new ContactMessage(req.body);
        await newMessage.save();
        res.status(201).json({ message: 'Message sent successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/contact', async (req, res) => {
    try {
        const messages = await ContactMessage.find();
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Hello from the backend!');
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
