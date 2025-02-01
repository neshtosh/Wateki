const fs = require('fs');
const path = require('path');

function diagnoseExpressSetup() {
    const serverDir = __dirname;
    const projectsPath = path.join(__dirname, '../projects');
    const tikitiPath = path.join(projectsPath, 'tikiti/public');
    
    const results = {
        serverDirectory: serverDir,
        projectsDirectory: projectsPath,
        tikitiPublicPath: tikitiPath,
        paths: {
            serverDirExists: false,
            projectsDirExists: false,
            tikitiDirExists: false,
            indexHtmlExists: false
        },
        structure: {},
        recommendations: []
    };
    
    // Check server directory
    results.paths.serverDirExists = fs.existsSync(serverDir);
    
    // Check projects directory
    results.paths.projectsDirExists = fs.existsSync(projectsPath);
    if (!results.paths.projectsDirExists) {
        results.recommendations.push('Projects directory not found at: ' + projectsPath);
    }
    
    // Check tikiti directory
    results.paths.tikitiDirExists = fs.existsSync(tikitiPath);
    if (!results.paths.tikitiDirExists) {
        results.recommendations.push('Tikiti public directory not found at: ' + tikitiPath);
    }
    
    // Check for index.html
    const indexPath = path.join(tikitiPath, 'index.html');
    results.paths.indexHtmlExists = fs.existsSync(indexPath);
    if (!results.paths.indexHtmlExists) {
        results.recommendations.push('index.html not found at: ' + indexPath);
    }
    
    // Get directory structure if projects directory exists
    if (results.paths.projectsDirExists) {
        try {
            function readDirStructure(dir, depth = 0) {
                if (depth > 2) return '...';
                
                const items = fs.readdirSync(dir);
                const structure = {};
                
                items.forEach(item => {
                    const fullPath = path.join(dir, item);
                    if (fs.statSync(fullPath).isDirectory()) {
                        structure[item] = readDirStructure(fullPath, depth + 1);
                    } else {
                        structure[item] = 'file';
                    }
                });
                
                return structure;
            }
            
            results.structure = readDirStructure(projectsPath);
        } catch (e) {
            results.recommendations.push('Error reading directory structure: ' + e.message);
        }
    }
    
    return results;
}

// Run diagnosis and print results
const results = diagnoseExpressSetup();
console.log('\n=== Express Server Path Diagnosis ===');
console.log('\nPaths checked:');
console.log('Server directory:', results.serverDirectory);
console.log('Projects directory:', results.projectsDirectory);
console.log('Tikiti public path:', results.tikitiPublicPath);

console.log('\nPath existence:');
Object.entries(results.paths).forEach(([key, value]) => {
    console.log(`${key}: ${value ? '✓' : '✗'}`);
});

console.log('\nDirectory structure:');
console.log(JSON.stringify(results.structure, null, 2));

if (results.recommendations.length > 0) {
    console.log('\nRecommendations:');
    results.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
    });
}