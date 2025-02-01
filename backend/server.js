const express = require('express');
const path = require('path');
const app = express();

const projects = {
    tikiti: path.join(__dirname, '../projects/tikiti/public'), // Path to the Tikiti project's public folder
};



// Serve static files for the Tikiti project
app.use('/preview/tikiti', express.static(projects.tikiti));

// Fallback route for Tikiti index.html
app.get('/preview/tikiti/*', (req, res) => {
    res.sendFile(path.join(projects.tikiti, 'index.html'));
});

// Catch-all fallback for missing projects
app.get('/preview/:project', (req, res) => {
    const projectName = req.params.project;

    if (!projects[projectName]) {
        return res.status(404).send('Project not found');
    }

    // Serve the main index.html file for the project
    res.sendFile(path.join(projects[projectName], 'index.html'));
});

// Start the server
app.listen(8000, () => {
    console.log('Portfolio server running at http://localhost:8000');
});
