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
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
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
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 20px;
    }
    
    .resume-container {
      max-width: 8.5in;
      margin: 0 auto;
      background: white;
    }
    
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 32px;
      color: #1e40af;
      margin-bottom: 10px;
    }
    
    .header .contact-info {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      font-size: 14px;
      color: #666;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 20px;
      color: #2563eb;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
      margin-bottom: 15px;
      font-weight: 600;
    }
    
    .experience-item, .education-item, .project-item {
      margin-bottom: 20px;
    }
    
    .item-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    
    .item-title {
      font-weight: 600;
      font-size: 16px;
      color: #1f2937;
    }
    
    .item-company, .item-school {
      font-size: 14px;
      color: #4b5563;
      font-style: italic;
    }
    
    .item-date {
      font-size: 14px;
      color: #6b7280;
    }
    
    .item-description {
      margin-top: 10px;
      font-size: 14px;
      line-height: 1.8;
    }
    
    .item-description ul {
      list-style: none;
      padding-left: 0;
    }
    
    .item-description li {
      padding-left: 20px;
      position: relative;
      margin-bottom: 5px;
    }
    
    .item-description li:before {
      content: "•";
      position: absolute;
      left: 0;
      color: #2563eb;
      font-weight: bold;
    }
    
    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .skill-tag {
      background: #eff6ff;
      color: #1e40af;
      padding: 5px 12px;
      border-radius: 4px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="resume-container">
    <div class="header">
      <h1>${basics.name || 'Your Name'}</h1>
      <div class="contact-info">
        ${basics.email ? `<span>${basics.email}</span>` : ''}
        ${basics.phone ? `<span>${basics.phone}</span>` : ''}
        ${basics.location ? `<span>${basics.location}</span>` : ''}
        ${links.linkedIn ? `<span>${links.linkedIn}</span>` : ''}
        ${links.github ? `<span>${links.github}</span>` : ''}
        ${links.portfolio ? `<span>${links.portfolio}</span>` : ''}
        ${links.website ? `<span>${links.website}</span>` : ''}
      </div>
    </div>
    
    ${resumeData.summary ? `
    <div class="section">
      <div class="section-title">Professional Summary</div>
      <p>${resumeData.summary}</p>
    </div>
    ` : ''}
    
    ${resumeData.experience && resumeData.experience.length > 0 ? `
    <div class="section">
      <div class="section-title">Experience</div>
      ${resumeData.experience.map(exp => `
        <div class="experience-item">
          <div class="item-header">
            <div>
              <div class="item-title">${exp.title || ''}</div>
              <div class="item-company">${exp.company || ''}${exp.location ? `, ${exp.location}` : ''}</div>
            </div>
            <div class="item-date">${exp.startDate || ''} - ${exp.endDate || 'Present'}</div>
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
    
    ${resumeData.projects && resumeData.projects.length > 0 ? `
    <div class="section">
      <div class="section-title">Projects</div>
      ${resumeData.projects.map(project => `
        <div class="project-item">
          <div class="item-header">
            <div>
              <div class="item-title">${project.name || ''}${project.url ? ` - <a href="${project.url}">${project.url}</a>` : ''}</div>
              ${project.description ? `<div class="item-company">${project.description}</div>` : ''}
              ${project.technologies && project.technologies.length > 0 ? `<div class="item-company">${project.technologies.join(', ')}</div>` : ''}
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
    
    ${resumeData.education && resumeData.education.length > 0 ? `
    <div class="section">
      <div class="section-title">Education</div>
      ${resumeData.education.map(edu => `
        <div class="education-item">
          <div class="item-header">
            <div>
              <div class="item-title">${edu.degree || ''}</div>
              <div class="item-school">${edu.school || ''}</div>
              ${edu.honors && edu.honors.length > 0 ? `<div class="item-company">${edu.honors.join(', ')}</div>` : ''}
            </div>
            <div class="item-date">${edu.graduationDate || ''}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}</div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    ${resumeData.skills && resumeData.skills.length > 0 ? `
    <div class="section">
      <div class="section-title">Skills</div>
      <div class="skills">
        ${resumeData.skills.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
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

