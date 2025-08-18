const express = require('express');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const os = require('os');

const app = express();
const port = 3000;
const zonosPort = 7860;
const zonosUrl = `http://localhost:${zonosPort}`;
const zonosRepo = 'https://github.com/Zyphra/Zonos.git';
const zonosDir = path.join(__dirname, 'zonos');

const upload = multer({ storage: multer.memoryStorage() });

// --- Helper Functions ---

const log = (message) => console.log(`[Zonos-Web-UI] ${message}`);

const runCommand = (command, args, options = {}) => {
    return new Promise((resolve, reject) => {
        log(`Running command: ${command} ${args.join(' ')}`);
        const child = spawn(command, args, { stdio: 'inherit', shell: true, ...options });
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed with code ${code}: ${command} ${args.join(' ')}`));
            } else {
                resolve();
            }
        });
        child.on('error', (err) => {
            reject(err);
        });
    });
};

const checkCommand = (command) => {
    try {
        execSync(`${os.platform() === 'win32' ? 'where' : 'which'} ${command}`, { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
};

// --- Setup Zonos ---

async function setupZonos() {
    log('Starting Zonos setup...');

    // 1. Check for Python
    if (!checkCommand('python3')) {
        log('Python 3 is not installed.');
        // Installation instructions are complex and platform-specific.
        // Forcing an install is risky. Best to guide the user.
        log('Please install Python 3.9+ and add it to your PATH.');
        log(' - Windows: from python.org or "winget install Python.Python.3.9"');
        log(' - macOS: "brew install python"');
        log(' - Linux: "sudo apt update && sudo apt install python3 python3-pip python3-venv"');
        process.exit(1);
    }
    log('Python 3 found.');

    // 2. Check for Git
    if (!checkCommand('git')) {
        log('Git is not installed. Please install it from https://git-scm.com/downloads');
        process.exit(1);
    }
    log('Git found.');

    // 3. Clone Zonos repo
    if (!fs.existsSync(zonosDir)) {
        log(`Cloning Zonos repository from ${zonosRepo}...`);
        await runCommand('git', ['clone', zonosRepo, 'zonos']);
    } else {
        log('Zonos directory already exists.');
    }

    // 4. Check for system dependencies (espeak-ng)
    if (!checkCommand('espeak-ng')) {
        log('espeak-ng not found. Attempting to install...');
        try {
            switch (os.platform()) {
                case 'linux':
                    await runCommand('sudo', ['apt-get', 'install', '-y', 'espeak-ng']);
                    break;
                case 'darwin':
                    await runCommand('brew', ['install', 'espeak-ng']);
                    break;
                default:
                    log('Please install espeak-ng manually for your system.');
            }
        } catch (error) {
            log('Failed to install espeak-ng automatically. Please install it manually.');
        }
    } else {
        log('espeak-ng found.');
    }

    const venvDir = path.join(zonosDir, '.venv');
    const pythonExecutable = os.platform() === 'win32' ? path.join(venvDir, 'Scripts', 'python.exe') : path.join(venvDir, 'bin', 'python');
    
    // 5. Create Python virtual environment
    if (!fs.existsSync(venvDir)) {
        log('Creating Python virtual environment...');
        await runCommand('python3', ['-m', 'venv', '.venv'], { cwd: zonosDir });
    } else {
        log('Virtual environment already exists.');
    }

    // 6. Install Python dependencies with uv
    log('Installing/updating Python dependencies with uv...');
    try {
        await runCommand(pythonExecutable, ['-m', 'pip', 'install', 'uv']);
        const uvExecutable = os.platform() === 'win32' ? path.join(venvDir, 'Scripts', 'uv.exe') : path.join(venvDir, 'bin', 'uv');
        await runCommand(uvExecutable, ['sync'], { cwd: zonosDir });
        await runCommand(uvExecutable, ['pip', 'install', '-e', '.'], { cwd: zonosDir });
        await runCommand(uvExecutable, ['pip', 'install', '-e', '.[compile]'], { cwd: zonosDir });
        log('Python dependencies installed successfully.');
    } catch (error) {
        log('Error installing Python dependencies. Please check the logs.');
        process.exit(1);
    }

    // 7. Launch Zonos
    log(`Launching Zonos Gradio interface on port ${zonosPort}...`);
    const zonosProcess = spawn(pythonExecutable, ['gradio_interface.py', '--port', zonosPort.toString()], {
        cwd: zonosDir,
        stdio: 'inherit'
    });
    zonosProcess.on('error', (err) => {
        log(`Failed to start Zonos: ${err}`);
        process.exit(1);
    });

    log('Waiting for Zonos server to be ready...');
    await new Promise(resolve => setTimeout(resolve, 20000)); // Wait for Gradio to start

    let retries = 5;
    while(retries > 0) {
        try {
            await axios.get(zonosUrl);
            log(`Zonos is ready at ${zonosUrl}`);
            return;
        } catch (e) {
            log(`Zonos not ready yet, retrying... (${retries})`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    log("Zonos server failed to start. Please check the console output from the gradio_interface.py script.");
    process.exit(1);
}

// --- Express Server ---

app.use(express.static('public'));
app.use(express.json());

app.get('/health', async (req, res) => {
    try {
        const response = await axios.get(`${zonosUrl}/`, { timeout: 2000 });
        if (response.status === 200) {
            res.json({ status: 'ok', message: 'Zonos server is running.' });
        } else {
            res.status(503).json({ status: 'error', message: 'Zonos server is not responding correctly.' });
        }
    } catch (error) {
        res.status(503).json({ status: 'error', message: 'Zonos server is unreachable.' });
    }
});

app.post('/tts', upload.single('audioReference'), async (req, res) => {
    try {
        log('Received /tts request.');
        const { text, language, happiness, anger, sadness, surprise, disgust, fear } = req.body;
        const audioFile = req.file;

        if (!text || !audioFile) {
            return res.status(400).json({ error: 'Text and audio reference file are required.' });
        }

        const audioBase64 = `data:${audioFile.mimetype};base64,${audioFile.buffer.toString('base64')}`;
        
        // This payload structure is an assumption based on typical Gradio APIs.
        // It corresponds to the order of components in `gradio_interface.py`.
        const payload = {
            "fn_index": 0, // Assuming the TTS function is the first one exposed.
            "data": [
                text,
                language,
                null, // prefix audio path, not used here
                audioBase64, // reference audio
                happiness,
                anger,
                sadness,
                surprise,
                disgust,
                fear
            ]
        };

        log('Forwarding request to Zonos Gradio API...');
        const response = await axios.post(`${zonosUrl}/run/predict`, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        const audioData = response.data.data[0];
        if (!audioData) {
            throw new Error('No audio data received from Zonos.');
        }

        // The response contains a base64 encoded wav file
        const base64Data = audioData.replace(/^data:audio\/wav;base64,/, "");
        const audioBuffer = Buffer.from(base64Data, 'base64');
        
        res.set('Content-Type', 'audio/wav');
        res.send(audioBuffer);
        log('Successfully sent TTS audio to client.');

    } catch (error) {
        log(`Error in /tts: ${error.message}`);
        if (error.response) {
            log(`Zonos API Error: ${JSON.stringify(error.response.data)}`);
        }
        res.status(500).json({ error: 'Failed to generate speech.' });
    }
});

app.listen(port, async () => {
    log(`Zonos Web UI server starting on http://localhost:${port}`);
    try {
        await setupZonos();
        log('Proxy is ready. Open your browser to http://localhost:3000');
    } catch (error) {
        log(`Setup failed: ${error.message}`);
        process.exit(1);
    }
});

