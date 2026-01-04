// Background service worker for Align extension

// Install/update handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('Align extension installed');
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getResume') {
    chrome.storage.local.get(['resumeText'], (result) => {
      sendResponse({ resumeText: result.resumeText || null });
    });
    return true; // Keep channel open for async response
  }
});



