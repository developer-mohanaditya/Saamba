# Saamba

Saamba is a meeting assistant that helps you stay present in a conversation and return to what matters afterward. It brings a meeting's audio, transcript, summary, action items, and personal notes together in a searchable library.

## The experience we're building

Saamba will detect a supported meeting, show a clear recording control, and capture the conversation while displaying a near-live transcript. After the call, you can play the audio, search the transcript, jump to a referenced moment, review decisions and action items, and ask questions grounded in the conversation.

The first target is Google Meet on macOS, followed by Zoom and Microsoft Teams. Online speech-to-text and language models will power transcription and notes through replaceable provider integrations. Long meetings are a core use case: the intended recorder will save audio in chunks and recover from interruptions.

## Current prototype

This repository currently contains the first local slice, **not the full product**:

- Import an audio recording of up to 2 GB and save it in a local meeting library.
- Play the saved audio and seek to timestamped transcript segments.
- Transcribe recordings in bounded segments and generate notes through Groq when credentials are configured.
- Search the transcript and retry processing after a configuration or processing error.

An experimental Chrome-based Google Meet detector and live recorder are included. The detector requires the unpacked extension; recording requires the user to select the meeting tab, enable tab audio, and grant microphone access. Video and mixed audio are saved locally when recording stops; the selected meeting tab and Saamba tab must remain open. Switching to another tab does not change the selected capture source. Live captions arrive in approximately 15-second segments plus network and processing delay. These paths have synthetic tests but have not yet been verified in a real meeting. Chrome extension detection currently recognizes English Google Meet controls only. Desktop Zoom/Teams, automatic recording without permission prompts, cloud sync, editable notes and action items, and meeting-wide questions are not implemented. The 2 GB import limit is a prototype constraint.

## Run locally

Python 3.10 or newer and ffmpeg/ffprobe are required. The prototype uses the Python standard library and binds to localhost.

```sh
set -a
source .env
set +a
python3 server.py
```

Open [http://127.0.0.1:24917](http://127.0.0.1:24917). Without API keys, audio is still saved and playable; configure the keys, restart the server, and retry processing. API keys remain on the server and should not be committed.

Transcription defaults to automatic language detection for each audio segment, including Telugu and English. Detection and recognition can make mistakes, especially when languages are mixed in short segments. Optionally set `SAAMBA_TRANSCRIPTION_LANGUAGE` to a two-letter language code to give Groq a fixed language hint. Restart the server after changing it. The original transcript is kept, and after recording the text is translated into English before an English summary is generated. Translation and summary use additional Groq requests and share the free-tier limits; accuracy is not guaranteed.

`SAAMBA_SUMMARY_MODEL` and `SAAMBA_TRANSCRIPTION_MODEL` optionally select Groq models. `SAAMBA_DATA_DIR` changes the local storage directory. The default `data/` directory contains recordings and the meeting database and is excluded from Git.

Importing audio sends audio segments and transcript text to Groq for processing. Provider charges may apply. This prototype is designed for local single-user use and is not ready for public deployment.

## Direction

1. Build a reliable audio import, storage, transcription, and playback path.
2. Add live audio capture, streaming transcripts, and recovery from interruptions.
3. Detect Google Meet calls and connect the detector to the recorder.
4. Complete the library with editable notes, action items, and grounded meeting questions.
5. Test long meetings and add Zoom and Teams support.

## Local secrets and meeting data

Never put real API keys in source files, commits, issues, or chat. Copy `.env.example` to `.env`, keep the file private, and fill in only the keys you need. To load the file into your current shell before starting the server:

```sh
chmod 600 .env
set -a
source .env
set +a
python3 server.py
```

`.env` and the default `data/` directory are ignored by Git. `.gitignore` does not protect files already tracked or secrets already published; if a credential is exposed, revoke or rotate it. If `SAAMBA_DATA_DIR` points outside this repository, protect that directory and back it up separately. The prototype uses Groq for transcription and summaries. Check that your Groq account remains on the Free plan; the app cannot enforce the account billing tier.

## Try live Google Meet capture (experimental)

1. Start Saamba locally as above. Open Google Chrome and go to `chrome://extensions`. Turn on Developer mode, select **Load unpacked**, and choose the `extension/` folder in this project. Installing the extension is a user action.
2. Join a Google Meet call in Chrome or Comet. The extension recognizes the English “Leave call” control and opens a Saamba tab associated with that meeting. It does not read or transmit meeting text, names, or meeting URLs.
3. In Saamba, choose **Record a meeting**. Select the Google Meet tab and enable **Share tab audio** in Chrome’s picker, then allow microphone access. If the picker provides no audio, Saamba reports the problem rather than silently recording only one side.
4. Keep the extension-opened Saamba tab open while recording. When the Meet ends, Saamba waits about 10 seconds to confirm the call has ended, then stops and starts processing. Closing the Meet tab also signals the recording to stop. You can also click **Stop recording** yourself. Audio chunks are stored locally; background transcription and notes are sent to Groq. During live capture, buffered audio can be lost if the tab or browser closes before the next 15-second chunk is saved. If a session was interrupted after chunks were saved, open the meeting and choose **Finish saved recording**.

After changing the extension, reload it from the browser extensions page before starting a new meeting. Automatic stop requires the extension-opened Saamba tab, and depends on Google Meet’s English controls; if detection fails, use **Stop recording**.

This is an early prototype: the browser mixes microphone and shared tab audio to a mono recording, speaker names are not inferred, recording may be interrupted by system sleep or a closed tab, and transcription is not guaranteed verbatim. It does not support detecting desktop meeting apps. Review recording permissions and notify meeting participants before recording.
