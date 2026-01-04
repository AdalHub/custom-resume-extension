const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

/**
 * Generate PDF from HTML template using Playwright
 * @param {string} htmlContent - HTML content to convert to PDF
 * @param {string} outputPath - Full path where PDF should be saved
 * @returns {Promise<void>}
 */
async function generatePDF(htmlContent, outputPath) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Set content and wait for any resources to load
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });
    
    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.4in',
        right: '0.5in',
        bottom: '0.4in',
        left: '0.5in'
      },
      preferCSSPageSize: true
    });
  } finally {
    await browser.close();
  }
}

/**
 * Generate resume PDF from structured data
 * @param {Object} resumeData - Structured resume data
 * @param {string} outputPath - Full path where PDF should be saved
 * @returns {Promise<void>}
 */
async function generateResumePDF(resumeData, outputPath) {
  const htmlContent = generateResumeHTML(resumeData);
  await generatePDF(htmlContent, outputPath);
}

/**
 * Generate cover letter PDF
 * @param {Object} coverLetterData - Cover letter data
 * @param {string} outputPath - Full path where PDF should be saved
 * @returns {Promise<void>}
 */
async function generateCoverLetterPDF(coverLetterData, outputPath) {
  const htmlContent = generateCoverLetterHTML(coverLetterData);
  await generatePDF(htmlContent, outputPath);
}

/**
 * Generate HTML for resume from structured data
 * @param {Object} resumeData - Structured resume data
 * @returns {string} HTML content
 */
function generateResumeHTML(resumeData) {
  // resumeData is now the tailoredResumeJson from Gemini
  const basics = resumeData.basics || {};
  const links = basics.links || {};
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume</title>
  <style>
    @page {
      margin: 0.5in;
      size: letter;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      background: white;
    }
    
    .resume-container {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.4in 0.5in;
    }
    
    /* Header Section */
    .header {
      text-align: center;
      margin-bottom: 0.3in;
      padding-bottom: 0.15in;
      border-bottom: 2pt solid #2c3e50;
    }
    
    .header h1 {
      font-size: 24pt;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 0.1in;
      letter-spacing: 0.5pt;
    }
    
    .header .contact-info {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.15in;
      font-size: 9.5pt;
      color: #555;
      font-family: 'Arial', sans-serif;
    }
    
    .header .contact-info span {
      padding: 0 0.08in;
    }
    
    .header .contact-info span:not(:last-child)::after {
      content: "•";
      margin-left: 0.15in;
      color: #999;
    }
    
    /* Section Styling */
    .section {
      margin-bottom: 0.2in;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 12pt;
      font-weight: 700;
      color: #2c3e50;
      text-transform: uppercase;
      letter-spacing: 1pt;
      margin-bottom: 0.1in;
      padding-bottom: 0.03in;
      border-bottom: 1pt solid #bdc3c7;
      font-family: 'Arial', sans-serif;
    }
    
    /* Summary Section */
    .summary {
      font-size: 10.5pt;
      line-height: 1.6;
      text-align: justify;
      margin-bottom: 0.15in;
      color: #333;
    }
    
    /* Experience/Education/Projects Items */
    .experience-item, .education-item, .project-item {
      margin-bottom: 0.15in;
      page-break-inside: avoid;
    }
    
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.05in;
    }
    
    .item-left {
      flex: 1;
    }
    
    .item-title {
      font-weight: 700;
      font-size: 11pt;
      color: #2c3e50;
      margin-bottom: 0.02in;
      font-family: 'Arial', sans-serif;
    }
    
    .item-company, .item-school {
      font-size: 10pt;
      color: #555;
      font-style: italic;
      margin-bottom: 0.02in;
    }
    
    .item-date {
      font-size: 10pt;
      color: #777;
      white-space: nowrap;
      font-family: 'Arial', sans-serif;
      font-weight: 500;
    }
    
    .item-description {
      margin-top: 0.08in;
      padding-left: 0.2in;
    }
    
    .item-description ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .item-description li {
      font-size: 10pt;
      line-height: 1.6;
      margin-bottom: 0.05in;
      position: relative;
      padding-left: 0.15in;
      text-align: justify;
    }
    
    .item-description li:before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #2c3e50;
      font-size: 8pt;
      top: 0.02in;
    }
    
    .item-description li:last-child {
      margin-bottom: 0;
    }
    
    /* Skills Grid */
    .skills-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.08in 0.15in;
      margin-top: 0.05in;
    }
    
    .skill-item {
      font-size: 10pt;
      color: #333;
      padding: 0.03in 0;
      border-bottom: 0.5pt dotted #ddd;
      font-family: 'Arial', sans-serif;
    }
    
    /* Projects specific */
    .project-tech {
      font-size: 9.5pt;
      color: #666;
      font-style: italic;
      margin-top: 0.02in;
    }
    
    /* Education specific */
    .education-honors {
      font-size: 9.5pt;
      color: #555;
      margin-top: 0.02in;
    }
    
    /* Optimize for 1 page */
    @media print {
      .section {
        margin-bottom: 0.15in;
      }
      
      .experience-item, .education-item, .project-item {
        margin-bottom: 0.12in;
      }
      
      .item-description li {
        margin-bottom: 0.04in;
      }
    }
  </style>
</head>
<body>
  <div class="resume-container">
    <!-- Header -->
    <div class="header">
      <h1>${escapeHtml(basics.name || 'Your Name')}</h1>
      <div class="contact-info">
        ${basics.email ? `<span>${escapeHtml(basics.email)}</span>` : ''}
        ${basics.phone ? `<span>${escapeHtml(basics.phone)}</span>` : ''}
        ${basics.location ? `<span>${escapeHtml(basics.location)}</span>` : ''}
        ${links.linkedIn ? `<span>${escapeHtml(links.linkedIn)}</span>` : ''}
        ${links.github ? `<span>${escapeHtml(links.github)}</span>` : ''}
        ${links.portfolio ? `<span>${escapeHtml(links.portfolio)}</span>` : ''}
        ${links.website ? `<span>${escapeHtml(links.website)}</span>` : ''}
      </div>
    </div>
    
    <!-- Professional Summary -->
    ${resumeData.summary ? `
    <div class="section">
      <div class="section-title">Professional Summary</div>
      <div class="summary">${escapeHtml(resumeData.summary)}</div>
    </div>
    ` : ''}
    
    <!-- Experience -->
    ${resumeData.experience && resumeData.experience.length > 0 ? `
    <div class="section">
      <div class="section-title">Professional Experience</div>
      ${resumeData.experience.map(exp => `
        <div class="experience-item">
          <div class="item-header">
            <div class="item-left">
              <div class="item-title">${escapeHtml(exp.title || '')}</div>
              <div class="item-company">${escapeHtml(exp.company || '')}${exp.location ? `, ${escapeHtml(exp.location)}` : ''}</div>
            </div>
            <div class="item-date">${escapeHtml(exp.startDate || '')} - ${escapeHtml(exp.endDate || 'Present')}</div>
          </div>
          ${exp.bullets && exp.bullets.length > 0 ? `
          <div class="item-description">
            <ul>
              ${exp.bullets.map(bullet => `<li>${escapeHtml(bullet.text || '')}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- Projects -->
    ${resumeData.projects && resumeData.projects.length > 0 ? `
    <div class="section">
      <div class="section-title">Projects</div>
      ${resumeData.projects.map(project => `
        <div class="project-item">
          <div class="item-header">
            <div class="item-left">
              <div class="item-title">${escapeHtml(project.name || '')}</div>
              ${project.description ? `<div class="item-company">${escapeHtml(project.description)}</div>` : ''}
              ${project.technologies && project.technologies.length > 0 ? `
                <div class="project-tech">${escapeHtml(project.technologies.join(' • '))}</div>
              ` : ''}
              ${project.url ? `<div class="project-tech">${escapeHtml(project.url)}</div>` : ''}
            </div>
          </div>
          ${project.bullets && project.bullets.length > 0 ? `
          <div class="item-description">
            <ul>
              ${project.bullets.map(bullet => `<li>${escapeHtml(bullet.text || '')}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- Education -->
    ${resumeData.education && resumeData.education.length > 0 ? `
    <div class="section">
      <div class="section-title">Education</div>
      ${resumeData.education.map(edu => `
        <div class="education-item">
          <div class="item-header">
            <div class="item-left">
              <div class="item-title">${escapeHtml(edu.degree || '')}</div>
              <div class="item-school">${escapeHtml(edu.school || '')}</div>
              ${edu.honors && edu.honors.length > 0 ? `
                <div class="education-honors">${escapeHtml(edu.honors.join(', '))}</div>
              ` : ''}
            </div>
            <div class="item-date">${escapeHtml(edu.graduationDate || '')}${edu.gpa ? ` | GPA: ${escapeHtml(edu.gpa)}` : ''}</div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- Skills -->
    ${resumeData.skills && resumeData.skills.length > 0 ? `
    <div class="section">
      <div class="section-title">Technical Skills</div>
      <div class="skills-grid">
        ${resumeData.skills.map(skill => `<div class="skill-item">${escapeHtml(skill)}</div>`).join('')}
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>
  `;
}

// Helper function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Generate HTML for cover letter
 * @param {Object} coverLetterData - Cover letter data
 * @returns {string} HTML content
 */
function generateCoverLetterHTML(coverLetterData) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cover Letter</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.8;
      color: #333;
      padding: 40px;
    }
    
    .cover-letter {
      max-width: 8.5in;
      margin: 0 auto;
    }
    
    .header {
      margin-bottom: 30px;
    }
    
    .header .date {
      text-align: right;
      color: #666;
      margin-bottom: 20px;
    }
    
    .header .recipient {
      margin-bottom: 20px;
    }
    
    .content {
      margin-bottom: 30px;
    }
    
    .content p {
      margin-bottom: 15px;
      text-align: justify;
    }
    
    .signature {
      margin-top: 40px;
    }
    
    .signature p {
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="cover-letter">
    <div class="header">
      <div class="date">${coverLetterData.date || new Date().toLocaleDateString()}</div>
      <div class="recipient">
        ${coverLetterData.recipientName ? `<p><strong>${coverLetterData.recipientName}</strong></p>` : ''}
        ${coverLetterData.recipientTitle ? `<p>${coverLetterData.recipientTitle}</p>` : ''}
        ${coverLetterData.company ? `<p>${coverLetterData.company}</p>` : ''}
        ${coverLetterData.address ? `<p>${coverLetterData.address}</p>` : ''}
      </div>
    </div>
    
    <div class="content">
      ${coverLetterData.greeting ? `<p>${coverLetterData.greeting}</p>` : '<p>Dear Hiring Manager,</p>'}
      ${coverLetterData.body ? coverLetterData.body.split('\n\n').map(para => `<p>${para}</p>`).join('') : ''}
      ${coverLetterData.closing ? `<p>${coverLetterData.closing}</p>` : '<p>Sincerely,</p>'}
    </div>
    
    <div class="signature">
      <p>${coverLetterData.senderName || 'Your Name'}</p>
      ${coverLetterData.senderTitle ? `<p>${coverLetterData.senderTitle}</p>` : ''}
    </div>
  </div>
</body>
</html>
  `;
}

module.exports = {
  generatePDF,
  generateResumePDF,
  generateCoverLetterPDF
};

