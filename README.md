# Align 🎯

<div align="center">

**AI-Powered Resume Tailoring with Truth Verification**

Generate tailored resumes and cover letters for job applications with automated fact-checking and truth scoring.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen.svg)](https://chrome.google.com/webstore)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Technical Details](#technical-details)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)

---

## 🎯 Overview

**Align** is a Chrome extension that helps job seekers create tailored resumes and cover letters for each job application. It uses Google's Gemini AI to:

- **Analyze job postings** and extract key requirements
- **Tailor your resume** to match job descriptions
- **Generate personalized cover letters** with company-specific information
- **Verify factual accuracy** of all claims in the generated resume
- **Score truthfulness** with a 0-100 truth score system
- **Flag potential issues** with suggested fixes

The system ensures that every bullet point in your tailored resume is fact-checked against your original resume, preventing exaggeration or false claims.

---

## ✨ Features

### 🎨 Modern User Interface
- **Beautiful gradient design** with purple/blue theme
- **Animated title** with typing effect
- **Intuitive popup interface** for quick resume generation
- **History page** to view all previous generations
- **Expandable flags** to see verification details

### 🤖 AI-Powered Generation
- **Gemini AI integration** for intelligent resume tailoring
- **Automatic keyword matching** from job descriptions
- **Company name extraction** for personalized cover letters
- **Structured JSON output** with Zod schema validation

### ✅ Truth Verification System
- **Three-tier verification**: SUPPORTED, STRETCH, UNSUPPORTED
- **Truth score calculation** (0-100 scale)
- **Evidence-based flagging** with original resume quotes
- **Suggested fixes** for flagged content

### 📄 PDF Generation
- **Professional PDF templates** with clean typography
- **Letter format optimization** for ATS systems
- **Cover letter generation** with proper formatting
- **Download management** with persistent popup

### 💾 Data Persistence
- **MongoDB Atlas integration** for generation history
- **Local storage** for resume text and settings
- **Version history** tracking for all generations

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Chrome Browser │         │   Express Server │         │   MongoDB Atlas │
│   (Extension)   │◄───────►│   (Node.js)      │◄───────►│   (Database)    │
│                 │         │                  │         │                 │
│  - Popup UI     │         │  - API Endpoints │         │  - Generations  │
│  - History Page │         │  - PDF Generator │         │  - Metadata     │
│  - Options Page │         │  - Gemini Client │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │  Google Gemini   │
                            │      API         │
                            │                  │
                            │  - Generation    │
                            │  - Verification  │
                            └──────────────────┘
```

### Technology Stack

**Frontend (Extension)**
- **Manifest V3** Chrome Extension API
- **Vanilla JavaScript** (ES6+)
- **HTML5/CSS3** with modern gradients and animations
- **Chrome Storage API** for local data persistence

**Backend (Server)**
- **Node.js** with Express.js framework
- **Google Gemini AI** (`@google/genai`) for LLM integration
- **Playwright** for PDF generation
- **MongoDB** driver for database operations
- **Zod** for schema validation
- **dotenv** for environment configuration

**Data Layer**
- **MongoDB Atlas** for cloud database storage
- **Local file system** for PDF storage (`server/storage/`)

### Request Flow

1. **User clicks "Generate"** in extension popup
2. **Extension captures** job description from current webpage
3. **Extension sends** request to Express server (`POST /api/generate`)
4. **Server calls Gemini AI** to generate tailored resume
5. **Server calls Gemini AI** again to verify all claims
6. **Server calculates** truth score and generates flags
7. **Server generates PDFs** using Playwright
8. **Server saves** generation to MongoDB
9. **Server returns** response with PDF URLs and metadata
10. **Extension displays** results with download buttons

---

## 🚀 Installation

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Google Chrome** browser
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))
- **MongoDB Atlas Account** ([Sign up free](https://www.mongodb.com/cloud/atlas/register))

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/custom-resume-extension.git
cd custom-resume-extension/proofresume
```

### Step 2: Install Server Dependencies

```bash
cd server
npm install
```

This will install all required packages:
- `express` - Web framework
- `@google/genai` - Google Gemini AI SDK
- `mongodb` - MongoDB driver
- `playwright` - PDF generation
- `zod` - Schema validation
- `dotenv` - Environment variables
- `cors` - CORS middleware
- `nodemon` - Development server (dev dependency)

### Step 3: Set Up Environment Variables

Create a `.env` file in the `server/` directory:

```bash
cd server
touch .env
```

Add the following environment variables to `.env`:

```env
# Google Gemini API Key (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB Atlas Connection String (Required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB=proofresume

# Server Configuration (Optional - defaults shown)
PORT=3000
BASE_URL=http://localhost:3000
```

**Important Notes:**
- **GEMINI_API_KEY**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey). Enable billing for production use.
- **MONGODB_URI**: Get your connection string from MongoDB Atlas dashboard. Replace `username`, `password`, and `cluster` with your credentials.
- **MONGODB_DB**: Database name (default: `proofresume`)
- **PORT**: Server port (default: `3000`)
- **BASE_URL**: Full URL for PDF downloads (default: `http://localhost:3000`)

### Step 4: Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

### Step 5: Load the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right corner)
3. Click **Load unpacked**
4. Select the `proofresume/extension` folder
5. The extension icon should appear in your Chrome toolbar

### Step 6: Configure Extension Settings

1. Click the **Align** extension icon in your Chrome toolbar
2. Click **Open Settings**
3. In the settings page:
   - **Paste your resume text** or upload a `.txt` file
   - **Configure backend URL** (if you changed the PORT, update this to match)
   - Click **Save Resume** and **Save Backend URL**

**Backend URL Configuration:**
- Default: `http://localhost:3000`
- If you changed the PORT in `.env`, update the backend URL accordingly
- Example: If PORT=8787, use `http://localhost:8787`

---

## ⚙️ Configuration

### Server Configuration

All server configuration is done through environment variables in `server/.env`:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | - | Google Gemini API key |
| `MONGODB_URI` | ✅ Yes | - | MongoDB Atlas connection string |
| `MONGODB_DB` | No | `proofresume` | Database name |
| `PORT` | No | `3000` | Server port |
| `BASE_URL` | No | `http://localhost:3000` | Base URL for PDF downloads |

### Extension Configuration

The extension can be configured through the **Settings** page:

1. **Resume Text**: Store your resume text locally in Chrome storage
2. **Backend URL**: Configure the server endpoint (default: `http://localhost:3000`)

To change the backend URL:
- Click the extension icon
- Click **Open Settings**
- Scroll to **Backend Configuration**
- Enter your server URL (e.g., `http://localhost:8787`)
- Click **Save Backend URL**

---

## 📖 Usage

### Basic Workflow

1. **Configure Your Resume**
   - Open extension settings
   - Paste your resume text or upload a `.txt` file
   - Click **Save Resume**

2. **Navigate to Job Posting**
   - Open a job posting page (LinkedIn, Greenhouse, Lever, etc.)
   - The extension will capture the job description automatically

3. **Generate Tailored Resume**
   - Click the **Align** extension icon
   - (Optional) Check **Include cover letter**
   - Click **Generate Tailored Resume**
   - Wait for generation to complete

4. **Review Results**
   - View your **Truth Score** (0-100)
   - Review any **Flags** (click to expand for details)
   - Download your **Resume PDF**
   - Download your **Cover Letter PDF** (if generated)

5. **View History**
   - Click **View History** to see all previous generations
   - Download any previous resume or cover letter
   - View detailed flags for each generation

### Understanding Truth Scores

- **80-100**: Excellent - Most claims are verified
- **60-79**: Good - Some claims may need review
- **0-59**: Needs attention - Review flagged items

### Understanding Flags

Each flag includes:
- **Status**: SUPPORTED, STRETCH, or UNSUPPORTED
- **Reason**: Explanation of why the flag was raised
- **Evidence**: Quote from your original resume (or "none")
- **Suggested Fix**: Improved version using only verified facts

---

## 🔧 Technical Details

### AI Generation Process

**Generator Pass:**
1. Extracts job requirements from job posting text
2. Analyzes original resume text
3. Generates tailored resume with:
   - Reordered and emphasized experiences
   - Keyword optimization
   - Company name extraction for cover letters
   - Evidence mapping for each claim

**Verifier Pass:**
1. Extracts all bullet points from generated resume
2. Verifies each bullet against original resume
3. Classifies as SUPPORTED, STRETCH, or UNSUPPORTED
4. Provides evidence quotes and suggested fixes

### Truth Score Algorithm

```javascript
Start at 100 points
- 0 points deducted for SUPPORTED bullets
- 8 points deducted for STRETCH bullets  
- 20 points deducted for UNSUPPORTED bullets
Final score clamped between 0-100
```

### PDF Generation

- **Playwright** headless browser for HTML-to-PDF conversion
- **Letter format** (8.5" × 11") optimized for ATS systems
- **Modern typography** with consistent spacing
- **Professional styling** with section headers and bullet alignment

### Data Models

**Generation Document (MongoDB):**
```javascript
{
  _id: "generationId",
  userId: "user_id",
  createdAt: Date,
  jobUrl: "https://...",
  jobText: "...",
  resumeTextHash: "sha256_hash",
  includeCoverLetter: Boolean,
  tailoredResumeJson: Object,
  claimMap: Array,
  verifications: Array,
  truthScore: Number,
  flags: Array,
  pdfPath: String,
  coverPdfPath: String
}
```

---

## 📁 Project Structure

```
proofresume/
├── extension/                 # Chrome extension (Manifest V3)
│   ├── manifest.json          # Extension manifest
│   ├── popup.html             # Main popup UI
│   ├── popup.js               # Popup logic
│   ├── options.html           # Settings page
│   ├── options.js             # Settings logic
│   ├── history.html           # Generation history page
│   ├── history.js             # History logic
│   ├── background.js          # Service worker
│   ├── styles.css             # Global styles
│   └── icons/                 # Extension icons
│       ├── icon16.png
│       ├── icon48.png
│       ├── icon128.png
│       └── logo.svg
│
├── server/                    # Express.js backend
│   ├── index.js               # Server entry point
│   ├── package.json           # Dependencies
│   ├── .env                   # Environment variables (create this)
│   │
│   ├── services/              # Business logic
│   │   ├── geminiService.js   # AI generation service
│   │   └── verifierService.js # Truth verification service
│   │
│   ├── utils/                 # Utilities
│   │   ├── pdfGenerator.js    # PDF generation
│   │   └── resumeParser.js    # Resume parsing (future)
│   │
│   ├── schemas.js             # Zod validation schemas
│   ├── db/                    # Database
│   │   └── mongodb.js         # MongoDB connection
│   ├── models/                # Data models
│   │   └── generationModel.js # Generation document model
│   │
│   └── storage/               # Generated PDFs (gitignored)
│       └── gen_*/             # Generation directories
│           ├── resume.pdf
│           └── cover.pdf
│
└── README.md                  # This file
```

---

## 🌐 API Endpoints

### `POST /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "OK"
}
```

### `POST /api/generate`
Generate a tailored resume and cover letter.

**Request:**
```json
{
  "jobText": "Full job posting text...",
  "resumeText": "Your original resume text...",
  "includeCoverLetter": true,
  "userId": "user_id_optional",
  "jobUrl": "https://job-posting-url.com"
}
```

**Response:**
```json
{
  "generationId": "gen_1234567890_abc123",
  "truthScore": 92,
  "flags": [
    {
      "bulletId": "experience_0_1",
      "status": "STRETCH",
      "reason": "...",
      "evidence": "...",
      "suggestedFix": "..."
    }
  ],
  "pdfUrl": "http://localhost:3000/api/generation/gen_.../resume.pdf",
  "coverLetterPdfUrl": "http://localhost:3000/api/generation/gen_.../cover.pdf"
}
```

### `GET /api/generations?userId=...&limit=50`
Get all generations for a user.

**Response:**
```json
{
  "generations": [
    {
      "generationId": "gen_...",
      "createdAt": "2024-01-01T00:00:00Z",
      "jobUrl": "https://...",
      "truthScore": 92,
      "flagsCount": 2,
      "pdfUrl": "...",
      "coverLetterPdfUrl": "..."
    }
  ],
  "total": 10,
  "limit": 50
}
```

### `GET /api/generation/:id`
Get detailed information about a specific generation.

**Response:**
```json
{
  "generationId": "gen_...",
  "userId": "user_id",
  "createdAt": "2024-01-01T00:00:00Z",
  "jobUrl": "https://...",
  "truthScore": 92,
  "flags": [...],
  "pdfUrl": "...",
  "coverLetterPdfUrl": "..."
}
```

### `GET /api/generation/:id/resume.pdf`
Download resume PDF.

### `GET /api/generation/:id/cover.pdf`
Download cover letter PDF.

---

## 🛠️ Development

### Running in Development Mode

```bash
cd server
npm run dev  # Uses nodemon for auto-reload
```

### Testing Gemini API

A test script is included to verify Gemini API connectivity:

```bash
cd server
node utils/testGemini.js
```

### Environment Variables Template

Create `server/.env` with:

```env
GEMINI_API_KEY=your_key_here
MONGODB_URI=mongodb+srv://...
MONGODB_DB=proofresume
PORT=3000
BASE_URL=http://localhost:3000
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Google Gemini AI** for powerful language model capabilities
- **MongoDB Atlas** for cloud database hosting
- **Playwright** for PDF generation
- **Express.js** for the robust web framework

---

<div align="center">

**Made with ❤️ for job seekers**

[Report Bug](https://github.com/yourusername/custom-resume-extension/issues) · [Request Feature](https://github.com/yourusername/custom-resume-extension/issues) · [Documentation](#)

</div>