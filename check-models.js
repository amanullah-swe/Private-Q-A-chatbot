const fs = require('fs');
const https = require('https');

function getEnvVar(name) {
    try {
        const content = fs.readFileSync('.env', 'utf-8');
        const match = content.match(new RegExp(`^${name}=(.*)$`, 'm'));
        return match ? match[1].trim() : null;
    } catch (e) {
        return null;
    }
}

async function listModels() {
    const apiKey = getEnvVar('GOOGLE_API_KEY');
    if (!apiKey) {
        fs.writeFileSync('all_models.txt', "No GOOGLE_API_KEY found in .env");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.error) {
                    fs.writeFileSync('all_models.txt', `API Error: ${JSON.stringify(json.error, null, 2)}`);
                } else if (json.models) {
                    const output = json.models.map(m => m.name).join('\n');
                    fs.writeFileSync('all_models.txt', output);
                    console.log("Wrote models to all_models.txt");
                } else {
                    fs.writeFileSync('all_models.txt', `No models found. Response: ${JSON.stringify(json)}`);
                }
            } catch (e) {
                fs.writeFileSync('all_models.txt', `Error parsing JSON: ${e.message}\nRaw: ${data}`);
            }
        });
    }).on('error', (e) => {
        fs.writeFileSync('all_models.txt', `Request error: ${e.message}`);
    });
}

listModels();
