// Popup JavaScript

const STORAGE_KEY = 'resumeText';
const BACKEND_URL_KEY = 'backendUrl';

let currentGeneration = null;

document.addEventListener('DOMContentLoaded', async () => {
  const statusIndicator = document.getElementById('statusIndicator');
  const generateBtn = document.getElementById('generateBtn');
  const openSettingsBtn = document.getElementById('openSettings');
  const includeCoverLetterCheckbox = document.getElementById('includeCoverLetter');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const statusArea = document.getElementById('statusArea');
  const errorMessage = document.getElementById('errorMessage');
  const closeBtn = document.getElementById('closeBtn');

  // Check if resume is saved
  const result = await chrome.storage.local.get([STORAGE_KEY, BACKEND_URL_KEY]);
  const hasResume = result[STORAGE_KEY] && result[STORAGE_KEY].trim().length > 0;
  const backendUrl = result[BACKEND_URL_KEY] || 'http://localhost:8787';

  if (hasResume) {
    statusIndicator.textContent = 'Resume ready';
    statusIndicator.className = 'status-indicator ready';
    generateBtn.disabled = false;
  } else {
    statusIndicator.textContent = 'No resume configured';
    statusIndicator.className = 'status-indicator not-ready';
    generateBtn.disabled = true;
  }

  // Close button - closes the popup
  closeBtn.addEventListener('click', () => {
    window.close();
  });

  // Open settings
  openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Generate button
  generateBtn.addEventListener('click', async () => {
    // Get fresh backend URL from storage
    const result = await chrome.storage.local.get([BACKEND_URL_KEY]);
    const currentBackendUrl = result[BACKEND_URL_KEY] || 'http://localhost:8787';
    await generateResume(currentBackendUrl, includeCoverLetterCheckbox.checked);
  });
});

async function generateResume(backendUrl, includeCoverLetter) {
  const generateBtn = document.getElementById('generateBtn');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const statusArea = document.getElementById('statusArea');
  const errorMessage = document.getElementById('errorMessage');
  const statusIndicator = document.getElementById('statusIndicator');

  // Reset UI
  errorMessage.classList.remove('visible');
  statusArea.classList.remove('visible');
  generateBtn.disabled = true;
  loadingSpinner.classList.add('visible');

  try {
    // Get resume text from storage
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const resumeText = result[STORAGE_KEY];

    if (!resumeText || !resumeText.trim()) {
      throw new Error('No resume text found. Please configure your resume in settings.');
    }

    // Capture job description from current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const jobData = await captureJobDescription(tab.id);
    
    // Get userId (could be from storage or generate anonymous)
    const userId = 'anonymous'; // TODO: Get from storage or generate

    // Call backend API
    const response = await fetch(`${backendUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobText: jobData.jobText,
        resumeText: resumeText,
        includeCoverLetter: includeCoverLetter,
        userId: userId,
        jobUrl: jobData.jobUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    currentGeneration = data;

    // Display results
    displayResults(data);

  } catch (error) {
    console.error('Error generating resume:', error);
    errorMessage.textContent = error.message || 'An error occurred while generating the resume.';
    errorMessage.classList.add('visible');
  } finally {
    loadingSpinner.classList.remove('visible');
    generateBtn.disabled = false;
  }
}

async function captureJobDescription(tabId) {
  try {
    // Inject content script to capture page text
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // Capture visible text from page
        const bodyText = document.body.innerText || document.body.textContent || '';
        
        // Truncate to ~12k chars to keep request small
        const maxChars = 12000;
        const truncatedText = bodyText.length > maxChars 
          ? bodyText.substring(0, maxChars) + '...'
          : bodyText;
        
        return {
          jobText: truncatedText,
          jobUrl: window.location.href,
        };
      },
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }

    throw new Error('Failed to capture job description from page');
  } catch (error) {
    console.error('Error capturing job description:', error);
    // Fallback: return empty job text
    return {
      jobText: '',
      jobUrl: '',
    };
  }
}

function displayResults(data) {
  const statusArea = document.getElementById('statusArea');
  const truthScoreValue = document.getElementById('truthScoreValue');
  const truthScoreFill = document.getElementById('truthScoreFill');
  const flagsSection = document.getElementById('flagsSection');
  const flagsList = document.getElementById('flagsList');
  const downloadResumeBtn = document.getElementById('downloadResumeBtn');
  const downloadCoverBtn = document.getElementById('downloadCoverBtn');
  const downloadBothBtn = document.getElementById('downloadBothBtn');

  // Show status area
  statusArea.classList.add('visible');

  // Display truth score
  const score = data.truthScore || 0;
  truthScoreValue.textContent = score;
  truthScoreFill.style.width = `${score}%`;

  // Update score color based on value
  if (score >= 80) {
    truthScoreValue.style.color = '#10b981';
    truthScoreFill.style.background = '#10b981';
  } else if (score >= 60) {
    truthScoreValue.style.color = '#f59e0b';
    truthScoreFill.style.background = '#f59e0b';
  } else {
    truthScoreValue.style.color = '#ef4444';
    truthScoreFill.style.background = '#ef4444';
  }

  // Display flags
  if (data.flags && data.flags.length > 0) {
    flagsSection.style.display = 'block';
    flagsList.innerHTML = '';

    data.flags.forEach(flag => {
      const flagItem = document.createElement('div');
      flagItem.className = 'flag-item';
      
      let flagHTML = `<div class="flag-status">${flag.status || 'FLAG'}</div>`;
      if (flag.reason) {
        flagHTML += `<div class="flag-reason">${escapeHtml(flag.reason)}</div>`;
      }
      if (flag.suggestedFix) {
        flagHTML += `<div class="flag-suggested">Suggested: ${escapeHtml(flag.suggestedFix)}</div>`;
      }
      
      flagItem.innerHTML = flagHTML;
      flagsList.appendChild(flagItem);
    });
  } else {
    flagsSection.style.display = 'none';
  }

  // Display download buttons
  const hasResume = data.pdfUrl;
  const hasCover = data.coverLetterPdfUrl;

  // Show "Download Both" button if both files are available
  if (hasResume && hasCover) {
    downloadBothBtn.style.display = 'block';
    downloadBothBtn.onclick = () => downloadBothFiles(data.pdfUrl, data.coverLetterPdfUrl);
    // Still show individual buttons below
    downloadResumeBtn.style.display = 'inline-block';
    downloadResumeBtn.onclick = () => downloadFile(data.pdfUrl, 'resume.pdf');
    downloadCoverBtn.style.display = 'inline-block';
    downloadCoverBtn.onclick = () => downloadFile(data.coverLetterPdfUrl, 'cover-letter.pdf');
  } else {
    downloadBothBtn.style.display = 'none';
    if (hasResume) {
      downloadResumeBtn.style.display = 'inline-block';
      downloadResumeBtn.onclick = () => downloadFile(data.pdfUrl, 'resume.pdf');
    } else {
      downloadResumeBtn.style.display = 'none';
    }
    if (hasCover) {
      downloadCoverBtn.style.display = 'inline-block';
      downloadCoverBtn.onclick = () => downloadFile(data.coverLetterPdfUrl, 'cover-letter.pdf');
    } else {
      downloadCoverBtn.style.display = 'none';
    }
  }
}

// Programmatic download function that doesn't close the popup
async function downloadFile(url, filename) {
  try {
    // Get backend URL to construct full URL if needed
    const result = await chrome.storage.local.get([BACKEND_URL_KEY]);
    const backendUrl = result[BACKEND_URL_KEY] || 'http://localhost:8787';
    
    // Construct full URL if it's a relative path
    const fullUrl = url.startsWith('http') ? url : `${backendUrl}${url}`;
    
    // Fetch the file
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    // Create a temporary anchor element and trigger download
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the blob URL after a short delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.error('Error downloading file:', error);
    alert(`Failed to download ${filename}: ${error.message}`);
  }
}

// Download both files simultaneously
async function downloadBothFiles(resumeUrl, coverUrl) {
  // Download both files with a small delay between them
  await downloadFile(resumeUrl, 'resume.pdf');
  // Small delay to ensure first download starts
  await new Promise(resolve => setTimeout(resolve, 300));
  await downloadFile(coverUrl, 'cover-letter.pdf');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
