// Popup JavaScript

const STORAGE_KEY = 'resumeText';

document.addEventListener('DOMContentLoaded', async () => {
  const statusIndicator = document.getElementById('statusIndicator');
  const generateBtn = document.getElementById('generateBtn');
  const openSettingsBtn = document.getElementById('openSettings');

  // Check if resume is saved
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  const hasResume = result[STORAGE_KEY] && result[STORAGE_KEY].trim().length > 0;

  if (hasResume) {
    statusIndicator.textContent = 'Resume ready';
    statusIndicator.className = 'status-indicator ready';
    generateBtn.disabled = false;
  } else {
    statusIndicator.textContent = 'No resume configured';
    statusIndicator.className = 'status-indicator not-ready';
    generateBtn.disabled = true;
  }

  // Open settings
  openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Generate button (will be implemented later)
  generateBtn.addEventListener('click', () => {
    // TODO: Implement generation flow
    alert('Generation feature coming soon!');
  });
});

