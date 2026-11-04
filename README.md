# Saamba

Saamba is a meeting assistant that helps you stay present in a conversation and return to what matters afterward. It brings a meeting's audio, transcript, summary, action items, and personal notes together in a searchable library.

## The experience we're building

Saamba will detect a supported meeting, show a clear recording control, and capture the conversation while displaying a near-live transcript. After the call, you can play the audio, search the transcript, jump to a referenced moment, review decisions and action items, and ask questions grounded in the conversation.

The first target is Google Meet on macOS, followed by Zoom and Microsoft Teams. Online speech-to-text and language models will power transcription and notes through replaceable provider integrations. Long meetings are a core use case: the intended recorder will save audio in chunks and recover from interruptions.

## Current prototype

This repository currently contains the first local slice, **not the full product**:

- Import an audio recording of up to 100 MB and save it in a local meeting library.
- Play the saved audio and seek to timestamped transcript segments.
- Transcribe recordings through Deepgram and generate notes through the OpenAI Responses API when credentials are configured.
- Search the transcript and retry processing after a configuration or processing error.

Live recording and transcription, automatic meeting detection, cloud sync, editable notes and action items, and meeting-wide questions are planned and are not implemented yet. The 100 MB limit and batch upload are prototype constraints, not the intended long-meeting design.

## Run locally

Python 3.10 or newer is required. The prototype uses the Python standard library and binds to localhost.

```sh
export DEEPGRAM_API_KEY='your-key'
export OPENAI_API_KEY='your-key'
python3 server.py
```

Open [http://127.0.0.1:8765](http://127.0.0.1:8765). Without API keys, audio is still saved and playable; configure the keys, restart the server, and retry processing. API keys remain on the server and should not be committed.

`SAAMBA_SUMMARY_MODEL` optionally selects an OpenAI Responses API model. `SAAMBA_DATA_DIR` changes the local storage directory. The default `data/` directory contains recordings and the meeting database and is excluded from Git.

Importing audio sends the recording to Deepgram for transcription. Generating notes sends transcript text to OpenAI. Provider charges may apply. This prototype is designed for local single-user use and is not ready for public deployment.

## Direction

1. Build a reliable audio import, storage, transcription, and playback path.
2. Add live audio capture, streaming transcripts, and recovery from interruptions.
3. Detect Google Meet calls and connect the detector to the recorder.
4. Complete the library with editable notes, action items, and grounded meeting questions.
5. Test long meetings and add Zoom and Teams support.
