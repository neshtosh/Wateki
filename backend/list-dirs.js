const fs = require('fs');
const path = require('path');

// Get the avo-master directory path
const avoMasterPath = path.join(__dirname, '..');

// Critical paths to check
const criticalPaths = [
    {
        name: 'tikiti project folder',
        path: path.join(avoMasterPath, 'tikiti')
    },
    {
        name: 'tikiti/public folder',
        path: path.join(avoMasterPath, 'tikiti', 'public')
    },
    {
        name: 'tikiti/public/index.html',
        path: path.join(avoMasterPath, 'tikiti', 'public', 'index.html')
    },
    // Also check the path being used in server.js
    {
        name: 'projects/tikiti/public (path from server.js)',
        path: path.join(avoMasterPath, 'projects', 'tikiti', 'public')
    }
];

console.log('Checking critical paths from:', avoMasterPath);
console.log('----------------------------------------');

criticalPaths.forEach(({ name, path: pathToCheck }) => {
    const exists = fs.existsSync(pathToCheck);
    console.log(`${name}:`);
    console.log(`  Path: ${pathToCheck}`);
    console.log(`  Exists: ${exists ? 'Yes' : 'No'}`);
    if (exists) {
        const stats = fs.statSync(pathToCheck);
        console.log(`  Type: ${stats.isDirectory() ? 'Directory' : 'File'}`);
    }
    console.log('');
});