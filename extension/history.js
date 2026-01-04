// History page JavaScript
const BACKEND_URL_KEY = 'backendUrl';
const USER_ID = 'anonymous'; // TODO: Get from storage or generate

let generations = [];

document.addEventListener('DOMContentLoaded', async () => {
  const refreshBtn = document.getElementById('refreshBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const emptyState = document.getElementById('emptyState');
  const generationsList = document.getElementById('generationsList');
  const errorMessage = document.getElementById('errorMessage');

  // Load generations on page load
  await loadGenerations();

  // Refresh button
  refreshBtn.addEventListener('click', async () => {
    await loadGenerations();
  });

  async function loadGenerations() {
    try {
      // Show loading, hide other states
      loadingIndicator.style.display = 'block';
      emptyState.style.display = 'none';
      generationsList.style.display = 'none';
      errorMessage.style.display = 'none';

      // Get backend URL from storage
      const result = await chrome.storage.local.get([BACKEND_URL_KEY]);
      const backendUrl = result[BACKEND_URL_KEY] || 'http://localhost:8787';

      // Fetch generations from API
      const response = await fetch(`${backendUrl}/api/generations?userId=${USER_ID}&limit=100`);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      generations = data.generations || [];

      // Hide loading
      loadingIndicator.style.display = 'none';

      // Display results
      if (generations.length === 0) {
        emptyState.style.display = 'block';
      } else {
        displayGenerations(generations);
        generationsList.style.display = 'grid';
      }
    } catch (error) {
      console.error('Error loading generations:', error);
      loadingIndicator.style.display = 'none';
      errorMessage.textContent = `Error loading generations: ${error.message}`;
      errorMessage.style.display = 'block';
    }
  }

  function displayGenerations(gens) {
    const listElement = document.getElementById('generationsList');
    listElement.innerHTML = '';

    gens.forEach(generation => {
      const card = createGenerationCard(generation);
      listElement.appendChild(card);
    });
  }

  function createGenerationCard(generation) {
    const card = document.createElement('div');
    card.className = 'generation-card';

    // Format date
    const date = new Date(generation.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Format job URL (title)
    const jobUrlDisplay = generation.jobUrl 
      ? `<a href="${escapeHtml(generation.jobUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(generation.jobUrl)}</a>`
      : '<span class="no-url">No job URL available</span>';

    // Truth score color class
    const truthScore = generation.truthScore || 0;
    let scoreClass = '';
    if (truthScore >= 80) {
      scoreClass = '';
    } else if (truthScore >= 60) {
      scoreClass = 'medium';
    } else {
      scoreClass = 'low';
    }

    // Create the card structure
    const header = document.createElement('div');
    header.className = 'generation-header';
    header.innerHTML = `
      <div class="generation-title">
        <h3>${jobUrlDisplay}</h3>
        <div class="generation-meta">Generated on ${formattedDate}</div>
      </div>
      <div class="generation-stats">
        <div class="stat-item">
          <span class="stat-label">Truth Score:</span>
          <span class="stat-value truth-score ${scoreClass}">${truthScore}</span>
        </div>
        ${generation.flagsCount > 0 ? `
        <div class="stat-item">
          <span class="stat-label">Flags:</span>
          <span class="stat-value">${generation.flagsCount}</span>
        </div>
        ` : ''}
      </div>
    `;

    // Create flags section if flags exist
    let flagsSection = null;
    if (generation.flagsCount > 0 && generation.flags && generation.flags.length > 0) {
      flagsSection = document.createElement('div');
      flagsSection.className = 'flags-section';
      
      const flagsToggle = document.createElement('div');
      flagsToggle.className = 'flags-toggle';
      flagsToggle.onclick = () => toggleFlags(generation.generationId);
      flagsToggle.innerHTML = `
        <span class="flags-toggle-text">View Flags (${generation.flagsCount})</span>
        <span class="flags-toggle-icon" id="flags-icon-${generation.generationId}">▼</span>
      `;
      
      const flagsList = document.createElement('div');
      flagsList.className = 'flags-list';
      flagsList.id = `flags-list-${generation.generationId}`;
      flagsList.innerHTML = generateFlagsHTML(generation.flags);
      
      flagsSection.appendChild(flagsToggle);
      flagsSection.appendChild(flagsList);
    }

    // Create actions section
    const actions = document.createElement('div');
    actions.className = 'generation-actions';
    actions.innerHTML = `
      <a href="${generation.pdfUrl || '#'}" 
         class="download-btn ${!generation.pdfUrl ? 'disabled' : ''}" 
         ${generation.pdfUrl ? `download="resume-${generation.generationId}.pdf"` : ''}
         ${generation.pdfUrl ? '' : 'onclick="return false;"'}>
        Download Resume PDF
      </a>
      ${generation.coverLetterPdfUrl ? `
      <a href="${generation.coverLetterPdfUrl}" 
         class="download-btn secondary" 
         download="cover-letter-${generation.generationId}.pdf">
        Download Cover Letter
      </a>
      ` : ''}
    `;

    // Assemble the card
    card.appendChild(header);
    if (flagsSection) {
      card.appendChild(flagsSection);
    }
    card.appendChild(actions);

    return card;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function generateFlagsHTML(flags) {
    if (!flags || flags.length === 0) return '';
    
    return flags.map((flag, index) => {
      const statusClass = flag.status === 'STRETCH' ? 'stretch' : 
                          flag.status === 'MISSING_REQUIREMENT' ? 'missing-requirement' : '';
      const statusDisplay = flag.status === 'MISSING_REQUIREMENT' ? 'MISSING REQUIREMENT' : flag.status;
      
      return `
        <div class="flag-item ${statusClass}">
          <div class="flag-header">
            <span class="flag-status ${flag.status}">${escapeHtml(statusDisplay)}</span>
          </div>
          ${flag.bulletText ? `
          <div class="flag-bullet-text">${escapeHtml(flag.bulletText)}</div>
          ` : ''}
          ${flag.requirement ? `
          <div class="flag-bullet-text">Requirement: ${escapeHtml(flag.requirement)}</div>
          ` : ''}
          ${flag.reason ? `
          <div class="flag-reason">${escapeHtml(flag.reason)}</div>
          ` : ''}
          ${flag.evidence && flag.evidence !== 'none' ? `
          <div class="flag-evidence">Evidence: ${escapeHtml(flag.evidence)}</div>
          ` : ''}
          ${flag.suggestedFix ? `
          <div class="flag-suggested-fix">
            <div class="flag-suggested-fix-label">Suggested Fix:</div>
            <div class="flag-suggested-fix-text">${escapeHtml(flag.suggestedFix)}</div>
          </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // Make toggleFlags available globally
  window.toggleFlags = function(generationId) {
    const flagsList = document.getElementById(`flags-list-${generationId}`);
    const flagsIcon = document.getElementById(`flags-icon-${generationId}`);
    
    if (flagsList && flagsIcon) {
      const isExpanded = flagsList.classList.contains('expanded');
      
      if (isExpanded) {
        flagsList.classList.remove('expanded');
        flagsIcon.classList.remove('expanded');
      } else {
        flagsList.classList.add('expanded');
        flagsIcon.classList.add('expanded');
      }
    }
  };
});
