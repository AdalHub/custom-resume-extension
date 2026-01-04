# Align Extension

Chrome extension for generating tailored resumes with truth verification.

## Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `proofresume/extension` folder

## Usage

1. Click the extension icon in Chrome toolbar
2. Click "Open Settings" to configure your resume
3. In settings, either:
   - Paste your resume text in the text area, OR
   - Upload a .txt file containing your resume
4. Click "Save Resume" to store it locally
5. The resume will be saved in Chrome's local storage and ready for generation

## Features

- **Text Paste**: Directly paste resume text into the settings page
- **File Upload**: Upload a .txt file with your resume content
- **Local Storage**: Resume is saved using `chrome.storage.local`
- **Preview**: View saved resume preview in settings

## Icon Placeholders

The extension references icon files that need to be created:
- `icons/icon16.png` (16x16)
- `icons/icon48.png` (48x48)
- `icons/icon128.png` (128x128)

You can create simple placeholder icons or use an icon generator tool.



