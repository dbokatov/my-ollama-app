# Text Polish

Text Polish helps you improve a sentence or message before you send it. Paste in what you want to say, and a local language model rewrites it in a friendly, natural style while preserving your meaning. The app streams the revised text back and explains the changes.

Your draft is processed by Ollama running on your own computer. By default, it is sent to the local Ollama server—not to a cloud LLM—and the app does not save your draft or response. Flask serves the browser interface, and the OpenAI Python client connects to Ollama's compatible local API. The default model is `llama3.1:8b`.

## Features

- Live, streamed text improvements
- Friendly, natural wording while preserving the original meaning and language
- A brief explanation of meaningful edits
- Copy button, character counter, and stop control
- Local-only web server by default (`127.0.0.1`)
- No draft or response history is saved by the app

## Requirements

- Python 3.10 or newer
- [Ollama](https://ollama.com/download) installed and running
- The `llama3.1:8b` model downloaded in Ollama

Ollama runs the model locally. The app sends prompts to the local Ollama server at `http://localhost:11434`; it does not require an OpenAI account or a real API key. The OpenAI client uses the placeholder key `ollama`, which the local server ignores.

## Install

Clone this repository. Replace `OWNER` with the GitHub username or organization that owns the public repository:

```bash
git clone https://github.com/OWNER/my-ollama-app.git
cd my-ollama-app
```

Create and activate a project-specific virtual environment, then install the Python dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Download the model and create your local configuration file:

```bash
ollama pull llama3.1:8b
cp .env.example .env
```

The `.venv/` directory contains this project's Python packages, and `.env` contains local configuration. Both are excluded from Git; do not commit either directory or file.

## Run

From the project directory, activate the environment and start the Flask app:

```bash
source .venv/bin/activate
python app.py
```

Open <http://127.0.0.1:5000> in your browser. Keep the terminal window open while using the app. Stop the server with `Ctrl+C`; run `deactivate` when you are done with the virtual environment.

On macOS, the Ollama app usually starts its local server automatically. To check Ollama and confirm the model is installed, run:

```bash
ollama list
curl http://localhost:11434/api/tags
```

If `ollama serve` reports `address already in use`, an Ollama server is already listening. Leave it running and start Flask in another terminal window.

## Configuration

The `.env` file can override the default model and Ollama endpoint. For example:

```dotenv
OLLAMA_MODEL=llama3.1:8b
OLLAMA_BASE_URL=http://localhost:11434/v1
```

The Flask server binds to `127.0.0.1` by default, so other devices cannot access it unless you change the host configuration.
