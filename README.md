# 🎙️ Whisper Lab — Speech-to-Text & Audio Intelligence

An in-browser audio transcription studio powered by Groq's hardware-accelerated `whisper-large-v3-turbo` model and LLM post-processing.

## Features
- **In-Browser Voice Recording**: Record microphone audio in real time with an animated Web Audio API frequency visualizer.
- **Audio File Upload**: Drag-and-drop or upload common audio files (`.mp3`, `.wav`, `.m4a`, `.webm`, `.ogg`) up to 25MB.
- **Sub-Second Whisper Turbo Transcriptions**: Accurate, multilingual speech-to-text with timestamped segment chips.
- **AI Audio Intelligence**:
  - 📋 **Executive Summary**: 3-4 high-impact key takeaway bullet points.
  - ✅ **Action Items & Next Steps**: Automatically extracts decisions and to-do lists.
- **Multi-Format Export**: One-click copy, download as Plain Text (`.txt`), or export SubRip subtitles (`.srt`).

## Getting Started
1. Open `index.html` in your web browser.
2. Click **Settings** and enter your Groq API Key (stored in browser `localStorage`).
3. Record microphone audio or upload a voice file.
4. View your transcript and run AI insights!
