const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const auth = require('basic-auth');
require('dotenv').config(); // Load environment variables

const app = express();
const port = 3000;

// Enable CORS for wateki.org
app.use(cors({ origin: 'https://www.wateki.org' }));

// MongoDB Connection
const uri = process.env.MONGODB_URI || "mongodb+srv://alexwateki:Homecoming@cluster0.zykfy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("✅ Connected to MongoDB using Mongoose");
    } catch (error) {
        console.error("❌ Error connecting to MongoDB:", error);
        process.exit(1); // Stop the server if DB connection fails
    }
}

connectToDatabase();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
    console.log('🟢 New WebSocket client connected');

    ws.on('message', function incoming(message) {
        console.log('📩 Received:', message);
    });

    ws.send(JSON.stringify({ message: 'Welcome!' }));
});

// Basic authentication middleware
const basicAuth = (req, res, next) => {
    const user = auth(req);
    const ADMIN_USER = process.env.ADMIN_USER || 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASS || 'password';

    if (!user || user.name !== ADMIN_USER || user.pass !== ADMIN_PASS) {
        res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
        return res.status(401).send('Authentication required.');
    }

    next();
};

// Admin panel route
app.get('/admin.html', basicAuth, (req, res) => {
    res.sendFile(__dirname + '/frontend/admin.html');
});

// API Routes

// Comments API
app.post('/api/comments', async (req, res) => {
    try {
        const newComment = new Comment(req.body);
        await newComment.save();

        // Send the new comment to all WebSocket clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(newComment));
            }
        });

        res.status(201).json(newComment);
    } catch (error) {
        console.error("❌ Error saving comment:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/comments', async (req, res) => {
    try {
        const comments = await Comment.find().sort({ date: -1 });
        res.json(comments);
    } catch (error) {
        console.error("❌ Error fetching comments:", error);
        res.status(500).json({ error: error.message });
    }
});

// Contact Messages API
app.post('/api/contact', async (req, res) => {
    try {
        const newMessage = new ContactMessage(req.body);
        await newMessage.save();
        res.status(201).json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error("❌ Error saving contact message:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/contact', async (req, res) => {
    try {
        const messages = await ContactMessage.find().sort({ date: -1 });
        res.json(messages);
    } catch (error) {
        console.error("❌ Error fetching contact messages:", error);
        res.status(500).json({ error: error.message });
    }
});

// Root route
app.get('/', (req, res) => {
    res.send('🚀 Wateki Backend is running!');
});

// Start the server
app.listen(port, () => {
    console.log(`✅ Server listening at http://localhost:${port}`);
});
