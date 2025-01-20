let mediaRecorder;
let audioChunks = [];

document.getElementById('recordButton').addEventListener('click', startRecording);
document.getElementById('stopButton').addEventListener('click', stopRecording);
document.getElementById('uploadButton').addEventListener('click', uploadRecording);

async function startRecording() {
    audioChunks = [];
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm'
        });

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = await convertToMp3(new Blob(audioChunks, { type: 'audio/webm' }));
            const audioUrl = URL.createObjectURL(audioBlob);
            document.getElementById('audioPreview').src = audioUrl;
        };

        mediaRecorder.start();
        document.getElementById('recordButton').disabled = true;
        document.getElementById('stopButton').disabled = false;
        document.getElementById('uploadButton').disabled = true;
    } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Error accessing microphone. Please ensure you have granted permission.');
    }
}

function stopRecording() {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    document.getElementById('recordButton').disabled = false;
    document.getElementById('stopButton').disabled = true;
    document.getElementById('uploadButton').disabled = false;
}

async function convertToMp3(blob) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const mp3Encoder = new lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128);
    const samples = new Int16Array(audioBuffer.length);
    const channel = audioBuffer.getChannelData(0);

    // Convert Float32Array to Int16Array
    for (let i = 0; i < channel.length; i++) {
        samples[i] = channel[i] * 0x7FFF;
    }

    // Encode to MP3
    const mp3Data = [];
    const blockSize = 1152;
    for (let i = 0; i < samples.length; i += blockSize) {
        const sampleChunk = samples.subarray(i, i + blockSize);
        const mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const mp3buf = mp3Encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
}

async function uploadRecording() {
    try {
        const audioBlob = await convertToMp3(new Blob(audioChunks, { type: 'audio/webm' }));
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.mp3');

        const response = await fetch('/upload-audio', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            alert('Recording uploaded successfully!');
            document.getElementById('uploadButton').disabled = true;
        } else {
            alert('Error uploading recording: ' + result.error);
        }
    } catch (err) {
        console.error('Error uploading recording:', err);
        alert('Error uploading recording. Please try again.');
    }
}