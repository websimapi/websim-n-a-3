# Zonos Web UI

This project provides a simple web interface for the [Zyphra Zonos](https://github.com/Zyphra/Zonos) voice cloning toolkit. It's a Node.js application that automatically handles the setup and execution of Zonos, allowing you to perform zero-shot Text-To-Speech (TTS) directly from your browser.

## Features

-   **Automatic Setup**: On first launch, the server automatically clones the Zonos repository, creates a Python virtual environment, and installs all necessary dependencies.
-   **Browser-Based Interface**: No need to use the command line for TTS. Use a simple web form to provide a reference audio, text, and language.
-   **Zero-Shot TTS**: Clone a voice from just 10-30 seconds of sample audio.
-   **Multilingual Support**: Supports English, Japanese, Chinese, French, and German.
-   **Emotion Control**: Fine-tune the emotional output of the generated speech (happiness, anger, sadness, etc.).

## Prerequisites

Before you begin, ensure you have the following installed on your system:

-   **Node.js**: v16 or later.
-   **Git**: Required for cloning the Zonos repository.
-   **Python**: Python 3.9+ is required. The script will check for it, but will not install it automatically. Please install it manually if you don't have it.
-   **System Build Tools**: You may need build tools (like `build-essential` on Debian/Ubuntu, `xcode-select --install` on macOS, or Build Tools for Visual Studio on Windows) for compiling Python dependencies.
-   **(Linux/macOS)**: `sudo` or `brew` is used to attempt automatic installation of `espeak-ng`.

## Hardware Requirements

-   **GPU (Recommended)**: An NVIDIA GPU with at least 6GB of VRAM is highly recommended for reasonable performance. The hybrid model for high-quality audio requires an NVIDIA 3000-series GPU or newer.
-   **CPU Fallback**: Zonos can run on a CPU, but it will be **extremely slow** and is not suitable for interactive use. Generation can take many minutes for a short sentence.

## Installation and Usage

1.  **Clone this repository or download the files.**

2.  **Install Node.js dependencies:**
    Open your terminal in the project directory and run:
    ```bash
    npm install
    ```

3.  **Start the server:**
    ```bash
    node index.js
    ```

### What Happens on First Run?

The first time you run `node index.js`, the server will perform a series of setup steps:

1.  **Check for Dependencies**: Verifies that `python3`, `git`, and `espeak-ng` are installed.
2.  **Clone Zonos**: Clones the official Zonos repository into a `zonos/` subdirectory.
3.  **Create Python Environment**: Sets up a local Python virtual environment inside `zonos/.venv`.
4.  **Install Python Packages**: Installs `uv` and uses it to install all of Zonos's Python dependencies. This step can take a significant amount of time.
5.  **Launch Zonos**: Starts the Zonos Gradio server in the background.

The server will log its progress in the console. Once you see the message `Proxy is ready. Open your browser to http://localhost:3000`, the setup is complete.

4.  **Open the Web UI:**
    Navigate to **`http://localhost:3000`** in your web browser.

5.  **Generate Speech:**
    -   Upload a reference audio file (WAV or MP3, 10-30 seconds long is ideal).
    -   Enter the text you want to synthesize.
    -   Select the language.
    -   Adjust the emotion sliders if desired.
    -   Click "Generate Speech".

## Alternative Setup: Docker

If you prefer to use Docker, you can follow the official instructions in the [Zonos repository](https://github.com/Zyphra/Zonos) to run the Gradio interface in a container. Once it's running on `localhost:7860`, you can still use this web UI to interact with it (after commenting out the `setupZonos()` call in `index.js`).

## Troubleshooting

-   **Python Dependency Errors**: If the `npm install` phase fails on a Python package, ensure you have the necessary build tools installed for your operating system.
-   **Zonos Fails to Start**: Check the console output for errors from the `gradio_interface.py` script. It might be a CUDA/GPU driver issue or a missing dependency.
-   **Slow Performance**: If generation is very slow, you are likely running on the CPU. Ensure you have a compatible NVIDIA GPU and that the necessary drivers (CUDA Toolkit) are installed correctly.

---

*This project is a wrapper and is dependent on the Zonos project. For issues related to the core TTS functionality, please refer to the [Zonos GitHub repository](https://github.com/Zyphra/Zonos).*

