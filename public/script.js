document.addEventListener('DOMContentLoaded', () => {
    const ttsForm = document.getElementById('tts-form');
    const generateBtn = document.getElementById('generate-btn');
    const resultContainer = document.getElementById('result-container');
    const audioPlayer = document.getElementById('audio-player');
    const statusMessage = document.getElementById('status-message');

    // Update slider value display
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
        const valueSpan = slider.nextElementSibling;
        valueSpan.textContent = slider.value;
        slider.addEventListener('input', () => {
            valueSpan.textContent = slider.value;
        });
    });

    ttsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        statusMessage.textContent = 'Submitting request to the Zonos server. This may take a while, especially on the first run...';
        statusMessage.className = 'status-info';
        resultContainer.classList.remove('hidden');
        audioPlayer.src = '';

        const formData = new FormData(ttsForm);
        
        try {
            const response = await fetch('/tts', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server responded with status: ${response.status}`);
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl;
            
            statusMessage.textContent = 'Speech generated successfully!';
            statusMessage.className = 'status-success';
            audioPlayer.play();

        } catch (error) {
            console.error('Error generating speech:', error);
            statusMessage.textContent = `Error: ${error.message}`;
            statusMessage.className = 'status-error';
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Speech';
        }
    });
});

