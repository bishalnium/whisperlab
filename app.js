document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // DOM Elements
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const apiKeyInput = document.getElementById('apiKey');

    const recordBtn = document.getElementById('recordBtn');
    const visualizer = document.getElementById('visualizer');
    const recordingTimer = document.getElementById('recordingTimer');
    
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    
    const audioPreviewContainer = document.getElementById('audioPreviewContainer');
    const audioPlayer = document.getElementById('audioPlayer');
    const transcribeBtn = document.getElementById('transcribeBtn');
    const clearAudioBtn = document.getElementById('clearAudioBtn');
    
    const statusMessage = document.getElementById('statusMessage');
    const languageSelect = document.getElementById('language');
    
    const transcriptContent = document.getElementById('transcriptContent');
    const exportActions = document.getElementById('exportActions');
    const clearTranscriptBtn = document.getElementById('clearTranscriptBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadTxtBtn = document.getElementById('downloadTxtBtn');
    const downloadSrtBtn = document.getElementById('downloadSrtBtn');
    
    const aiSection = document.getElementById('aiSection');
    const summaryBtn = document.getElementById('summaryBtn');
    const actionItemsBtn = document.getElementById('actionItemsBtn');
    const aiOutput = document.getElementById('aiOutput');

    // State
    let audioFile = null;
    let transcriptData = null; // Full JSON response
    let fullTranscriptText = ""; // Compiled text
    
    // Recording state
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let audioContext = null;
    let analyser = null;
    let animationFrameId = null;
    let timerInterval = null;
    let recordStartTime = null;

    const DEFAULT_GROQ_KEY = '';

    // Load API Key
    const savedKey = localStorage.getItem('groq_api_key') || DEFAULT_GROQ_KEY;
    apiKeyInput.value = savedKey;

    // Settings Modal
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
    });
    
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });
    
    saveSettingsBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('groq_api_key', key);
            settingsModal.classList.add('hidden');
            showStatus('API Key saved successfully.', 'info');
        } else {
            showStatus('Please enter a valid API Key.', 'error');
        }
    });

    // Helper: Show Status
    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.className = 'status-message';
        }, 5000);
    }

    function getApiKey() {
        return localStorage.getItem('groq_api_key') || DEFAULT_GROQ_KEY;
    }

    // --- AUDIO UPLOAD / DROP ---
    browseBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleAudioFile(e.target.files[0]);
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleAudioFile(e.dataTransfer.files[0]);
        }
    });

    function handleAudioFile(file) {
        // Check size (25MB)
        if (file.size > 25 * 1024 * 1024) {
            showStatus('File exceeds 25MB limit.', 'error');
            return;
        }
        
        audioFile = file;
        const url = URL.createObjectURL(file);
        audioPlayer.src = url;
        audioPreviewContainer.classList.remove('hidden');
        showStatus('Audio loaded ready for transcription.', 'info');
    }

    clearAudioBtn.addEventListener('click', () => {
        audioFile = null;
        audioPlayer.src = '';
        audioPreviewContainer.classList.add('hidden');
        fileInput.value = '';
    });

    // --- RECORDING ---
    recordBtn.addEventListener('click', toggleRecording);

    async function toggleRecording() {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    }

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
                handleAudioFile(file);
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };
            
            setupVisualizer(stream);
            
            mediaRecorder.start();
            isRecording = true;
            recordBtn.innerHTML = '<i data-lucide="square"></i> Stop Recording';
            recordBtn.classList.replace('primary-btn', 'danger-btn');
            recordBtn.classList.add('recording-pulse');
            lucide.createIcons();
            
            recordStartTime = Date.now();
            timerInterval = setInterval(updateTimer, 1000);
            
        } catch (err) {
            console.error(err);
            showStatus('Could not access microphone.', 'error');
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        recordBtn.innerHTML = '<i data-lucide="mic"></i> Start Recording';
        recordBtn.classList.replace('danger-btn', 'primary-btn');
        recordBtn.classList.remove('recording-pulse');
        lucide.createIcons();
        
        clearInterval(timerInterval);
        recordingTimer.textContent = '00:00';
        
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        
        // Clear canvas
        const canvasCtx = visualizer.getContext('2d');
        canvasCtx.clearRect(0, 0, visualizer.width, visualizer.height);
    }

    function updateTimer() {
        const diff = Math.floor((Date.now() - recordStartTime) / 1000);
        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');
        recordingTimer.textContent = `${mins}:${secs}`;
    }

    function setupVisualizer(stream) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const canvasCtx = visualizer.getContext('2d');
        const WIDTH = visualizer.width;
        const HEIGHT = visualizer.height;
        
        function draw() {
            animationFrameId = requestAnimationFrame(draw);
            
            analyser.getByteFrequencyData(dataArray);
            
            canvasCtx.fillStyle = '#0f172a';
            canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
            
            const barWidth = (WIDTH / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for(let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                
                canvasCtx.fillStyle = '#3b82f6';
                canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        }
        
        draw();
    }

    // --- TRANSCRIPTION ---
    transcribeBtn.addEventListener('click', async () => {
        if (!audioFile) return;
        const apiKey = getApiKey();
        if (!apiKey) return;

        transcribeBtn.disabled = true;
        transcribeBtn.innerHTML = '<i data-lucide="loader"></i> Transcribing...';
        lucide.createIcons();
        
        transcriptContent.innerHTML = '<p class="placeholder-text">Processing audio...</p>';
        exportActions.classList.add('hidden');
        aiSection.classList.add('hidden');

        try {
            const formData = new FormData();
            formData.append('file', audioFile);
            formData.append('model', 'whisper-large-v3-turbo');
            formData.append('response_format', 'verbose_json');
            formData.append('temperature', '0');
            
            const lang = languageSelect.value;
            if (lang) {
                formData.append('language', lang);
            }

            const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Transcription failed');
            }

            transcriptData = await response.json();
            renderTranscript(transcriptData);
            showStatus('Transcription complete.', 'info');
            
        } catch (err) {
            console.error(err);
            showStatus(`Error: ${err.message}`, 'error');
            transcriptContent.innerHTML = '<p class="placeholder-text">Transcription failed.</p>';
        } finally {
            transcribeBtn.disabled = false;
            transcribeBtn.innerHTML = '<i data-lucide="zap"></i> Transcribe Audio';
            lucide.createIcons();
        }
    });

    function renderTranscript(data) {
        if (!data || !data.segments || data.segments.length === 0) {
            transcriptContent.innerHTML = '<p class="placeholder-text">No speech detected.</p>';
            return;
        }

        transcriptContent.innerHTML = '';
        fullTranscriptText = data.text;

        data.segments.forEach(seg => {
            const div = document.createElement('div');
            div.className = 'transcript-segment';
            
            const timeSpan = document.createElement('span');
            timeSpan.className = 'segment-time';
            timeSpan.textContent = `[${formatTime(seg.start)} - ${formatTime(seg.end)}]`;
            
            const textSpan = document.createElement('span');
            textSpan.className = 'segment-text';
            textSpan.textContent = seg.text;
            
            div.appendChild(timeSpan);
            div.appendChild(textSpan);
            transcriptContent.appendChild(div);
        });

        exportActions.classList.remove('hidden');
        aiSection.classList.remove('hidden');
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    clearTranscriptBtn.addEventListener('click', () => {
        transcriptData = null;
        fullTranscriptText = '';
        transcriptContent.innerHTML = '<p class="placeholder-text">Transcript will appear here...</p>';
        exportActions.classList.add('hidden');
        aiSection.classList.add('hidden');
        aiOutput.classList.add('hidden');
    });

    // --- EXPORT ---
    copyBtn.addEventListener('click', () => {
        if (!fullTranscriptText) return;
        navigator.clipboard.writeText(fullTranscriptText).then(() => {
            showStatus('Transcript copied to clipboard.', 'info');
        });
    });

    downloadTxtBtn.addEventListener('click', () => {
        if (!fullTranscriptText) return;
        downloadFile(fullTranscriptText, 'transcript.txt', 'text/plain');
    });

    downloadSrtBtn.addEventListener('click', () => {
        if (!transcriptData || !transcriptData.segments) return;
        let srt = '';
        transcriptData.segments.forEach((seg, i) => {
            srt += `${i + 1}\n`;
            srt += `${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n`;
            srt += `${seg.text.trim()}\n\n`;
        });
        downloadFile(srt, 'transcript.srt', 'text/plain');
    });

    function formatSrtTime(seconds) {
        const pad = (num, size) => ('000' + num).slice(size * -1);
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
        return `${pad(hrs, 2)}:${pad(mins, 2)}:${pad(secs, 2)},${pad(ms, 3)}`;
    }

    function downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }

    // --- AI POST-PROCESSING ---
    summaryBtn.addEventListener('click', () => runAIPrompt("Provide an executive summary in 3-4 bullet points for the following transcript:\n\n"));
    actionItemsBtn.addEventListener('click', () => runAIPrompt("Extract action items and next steps from the following transcript:\n\n"));

    async function runAIPrompt(promptPrefix) {
        if (!fullTranscriptText) return;
        const apiKey = getApiKey();
        if (!apiKey) return;

        aiOutput.classList.remove('hidden');
        aiOutput.innerHTML = '<p><i data-lucide="loader"></i> Processing AI request...</p>';
        lucide.createIcons();
        
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'qwen/qwen3.8-27b', // as requested
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant.' },
                        { role: 'user', content: promptPrefix + fullTranscriptText }
                    ],
                    temperature: 0.5
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'AI request failed');
            }

            const data = await response.json();
            const aiText = data.choices[0].message.content;
            
            // Parse Markdown
            aiOutput.innerHTML = marked.parse(aiText);
            
        } catch (err) {
            console.error(err);
            aiOutput.innerHTML = `<p style="color: var(--danger)">Error: ${err.message}</p>`;
            // Fallback note about model name if qwen/qwen3.8-27b fails
            if (err.message.includes('model')) {
                aiOutput.innerHTML += `<p class="help-text">Note: The model 'qwen/qwen3.8-27b' might not be available or may be named differently in the GROQ API (e.g., 'qwen-2.5-32b-it' or 'llama3-8b-8192'). You can edit app.js to update the model name.</p>`;
            }
        }
    }
});
