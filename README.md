# Lexi – A Maker’s AI Entity

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Typescript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Gemini](https://img.shields.io/badge/Gemini%202.5-Native%20Audio-4285F4?logo=google)

> **"Lexi is an AI entity that thinks with you and builds in front of you — using real tools, in real time, with nothing hidden."**

Lexi is a voice-first AI assistant built for people who build things. She is not a chatbot; she is a persistent entity that lives in your workspace, understands your projects, and operates your tools.

[📄 Read our Vision](VISION.md)

---

## 👁️ Core Principles

### 1. Lexi is an Entity
She maintains continuity across sessions and understands the context of your work. She doesn't reset after every prompt.

### 2. Projects Over Conversations
Conversations are ephemeral; projects are durable. Lexi anchors her work in structured projects (files, designs, code), using conversation only as a means to intent.

### 3. Real-Time Preview
**Nothing happens behind the scenes.**
- When Lexi browses the web, you see the browser.
- When she generates CAD, you see the 3D model appear instantly.
- When she controls your home, you see the state change.

### 4. Voice-First, Never Voice-Only
Voice drives the interaction, but the workspace confirms reality with transcripts, previews, and artifacts.

---

## ⚡ Capabilities

### 🗣️ Native Voice Interaction
Built on **Gemini 2.5 Native Audio**, Lexi communicates with low-latency, natural voice. She handles interruptions and understands nuance.

### 🧊 Generative CAD
"Text-to-CAD" via `build123d`.
- **Describe it:** "Create a mounting bracket for a NEMA 17 motor."
- **Iterate it:** "Make the walls thicker."
- **Export it:** Automatic STL generation and slicing.

### 🖨️ 3D Printing Control
Full integration with your fabrication workflow.
- **Discovery:** Auto-detects OctoPrint/Moonraker/PrusaLink printers.
- **Slicing:** Integrated OrcaSlicer profiles.
- **Printing:** Send directly to the printer and monitor status.

### 🌐 Autonomous Web Agent
A visible, headless browser (Playwright) that can research datasheets, find components, or look up documentation while you work.

### 📂 File & Project Management
**[NEW]** Lexi can now handle file uploads and organize assets within project structures. 
- Upload reference images, logs, or existing code.
- Lexi organizes them into the active project context.

### 🏠 Local Smart Control
Native integration with TP-Link Kasa devices to control your lab environment (lights, soldering irons, 3D printer power).

---

## 🛠️ Architecture

Lexi runs as a hybrid Local-First system:
- **Frontend:** React 19 + TypeScript + Tauri/Electron (Visual Workspace)
- **Backend:** Python 3.11 + FastAPI + Socket.IO (Intelligence)
- **AI:** Google Gemini 2.5 (Thinking & Voice)

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.11**
- **Node.js 18+**
- **Gemini API Key**

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-username/lexi_v2.git
   cd lexi_v2
   ```

2. **Backend Setup**
   ```bash
   # Create environment
   conda create -n lexi_v2 python=3.11 -y
   conda activate lexi_v2
   
   # Install dependencies
   pip install -r requirements.txt
   playwright install chromium
   ```

3. **Frontend Setup**
   ```bash
   npm install
   ```

4. **Secrets**
   Create `.env` in the root:
   ```
   GEMINI_API_KEY=your_key_here
   ```

5. **Launch**
   ```bash
   # Terminal 1: Backend
   # (Will auto-reload on changes)
   npm run dev:backend 
   
   # Terminal 2: Frontend
   npm run dev
   ```

---

