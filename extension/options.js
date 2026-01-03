// Options page JavaScript for resume input management

const STORAGE_KEY = 'resumeText';

// DOM elements
const resumeTextarea = document.getElementById('resumeText');
const charCount = document.getElementById('charCount');
const fileInput = document.getElementById('fileInput');
const fileUploadArea = document.getElementById('fileUploadArea');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFile');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const loadBtn = document.getElementById('loadBtn');
const statusMessage = document.getElementById('statusMessage');
const previewContainer = document.getElementById('previewContainer');
const pasteContainer = document.getElementById('pasteContainer');
const uploadContainer = document.getElementById('uploadContainer');
const inputMethodRadios = document.querySelectorAll('input[name="inputMethod"]');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSavedResume();
  setupEventListeners();
  updateCharCount();
});

// Event listeners
function setupEventListeners() {
  // Text area character count
  resumeTextarea.addEventListener('input', updateCharCount);

  // File input
  fileInput.addEventListener('change', handleFileSelect);
  
  // File upload area click
  fileUploadArea.addEventListener('click', () => {
    if (!fileInfo.classList.contains('hidden')) return;
    fileInput.click();
  });

  // Drag and drop
  fileUploadArea.addEventListener('dragover', handleDragOver);
  fileUploadArea.addEventListener('drop', handleFileDrop);
  fileUploadArea.addEventListener('dragleave', handleDragLeave);

  // Remove file button
  removeFileBtn.addEventListener('click', clearFile);

  // Save button
  saveBtn.addEventListener('click', saveResume);

  // Clear button
  clearBtn.addEventListener('click', clearResume);

  // Load button
  loadBtn.addEventListener('click', loadSavedResume);

  // Input method toggle
  inputMethodRadios.forEach(radio => {
    radio.addEventListener('change', handleInputMethodChange);
  });
}

// Update character count
function updateCharCount() {
  const count = resumeTextarea.value.length;
  charCount.textContent = count.toLocaleString();
}

// Handle input method change
function handleInputMethodChange(e) {
  const method = e.target.value;
  if (method === 'paste') {
    pasteContainer.classList.remove('hidden');
    uploadContainer.classList.add('hidden');
  } else {
    pasteContainer.classList.add('hidden');
    uploadContainer.classList.remove('hidden');
  }
}

// Handle file selection
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      readFile(file);
    } else {
      showStatus('Please select a .txt file', 'error');
    }
  }
}

// Handle drag over
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  fileUploadArea.classList.add('drag-over');
}

// Handle drag leave
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  fileUploadArea.classList.remove('drag-over');
}

// Handle file drop
function handleFileDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  fileUploadArea.classList.remove('drag-over');

  const file = e.dataTransfer.files[0];
  if (file) {
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      fileInput.files = e.dataTransfer.files;
      readFile(file);
    } else {
      showStatus('Please drop a .txt file', 'error');
    }
  }
}

// Read file content
function readFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    resumeTextarea.value = content;
    updateCharCount();
    
    // Show file info
    fileName.textContent = file.name;
    fileInfo.classList.remove('hidden');
    fileUploadArea.querySelector('.upload-placeholder').classList.add('hidden');
    
    showStatus(`File "${file.name}" loaded successfully`, 'success');
  };
  reader.onerror = () => {
    showStatus('Error reading file', 'error');
  };
  reader.readAsText(file);
}

// Clear file selection
function clearFile() {
  fileInput.value = '';
  fileInfo.classList.add('hidden');
  fileUploadArea.querySelector('.upload-placeholder').classList.remove('hidden');
  resumeTextarea.value = '';
  updateCharCount();
}

// Save resume to chrome.storage.local
async function saveResume() {
  const resumeText = resumeTextarea.value.trim();
  
  if (!resumeText) {
    showStatus('Please enter or upload resume text', 'error');
    return;
  }

  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: resumeText });
    showStatus('Resume saved successfully!', 'success');
    updatePreview(resumeText);
  } catch (error) {
    console.error('Error saving resume:', error);
    showStatus('Error saving resume', 'error');
  }
}

// Load saved resume
async function loadSavedResume() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    if (result[STORAGE_KEY]) {
      resumeTextarea.value = result[STORAGE_KEY];
      updateCharCount();
      updatePreview(result[STORAGE_KEY]);
      showStatus('Resume loaded', 'success');
    } else {
      updatePreview(null);
    }
  } catch (error) {
    console.error('Error loading resume:', error);
    showStatus('Error loading resume', 'error');
  }
}

// Clear resume
function clearResume() {
  if (confirm('Are you sure you want to clear the resume text?')) {
    resumeTextarea.value = '';
    updateCharCount();
    clearFile();
    showStatus('Resume cleared', 'info');
  }
}

// Update preview
function updatePreview(resumeText) {
  if (resumeText) {
    const preview = document.createElement('div');
    preview.className = 'preview-content';
    const lines = resumeText.split('\n').slice(0, 10);
    preview.innerHTML = `
      <div class="preview-text">${lines.join('<br>')}${resumeText.split('\n').length > 10 ? '<br>...' : ''}</div>
      <div class="preview-meta">${resumeText.length.toLocaleString()} characters</div>
    `;
    previewContainer.innerHTML = '';
    previewContainer.appendChild(preview);
  } else {
    previewContainer.innerHTML = '<p class="no-data">No resume saved yet</p>';
  }
}

// Show status message
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove('hidden');
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusMessage.classList.add('hidden');
  }, 3000);
}

