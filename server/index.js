// Server entry point
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const { generateResumePDF, generateCoverLetterPDF } = require('./utils/pdfGenerator');
const { parseResumeText } = require('./utils/resumeParser');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// In-memory store for generations (will be replaced with MongoDB later)
const generations = new Map();

// Ensure storage directory exists
const STORAGE_DIR = path.join(__dirname, 'storage');
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating storage directory:', error);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.post('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Generate endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { jobText, resumeText, includeCoverLetter } = req.body;

    // Validate input
    if (!jobText || !resumeText) {
      return res.status(400).json({ 
        error: 'Missing required fields: jobText and resumeText are required' 
      });
    }

    // Generate unique ID
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create storage directory for this generation
    const generationDir = path.join(STORAGE_DIR, generationId);
    await fs.mkdir(generationDir, { recursive: true });

    // Parse resume text into structured format
    const resumeData = parseResumeText(resumeText);

    // Generate resume PDF
    const resumePdfPath = path.join(generationDir, 'resume.pdf');
    await generateResumePDF(resumeData, resumePdfPath);

    // Generate cover letter PDF if requested
    let coverLetterPdfPath = null;
    if (includeCoverLetter) {
      coverLetterPdfPath = path.join(generationDir, 'cover.pdf');
      const coverLetterData = {
        date: new Date().toLocaleDateString(),
        recipientName: 'Hiring Manager',
        company: 'Company Name',
        greeting: 'Dear Hiring Manager,',
        body: `I am writing to express my interest in the position. Based on the job description, I believe my skills and experience align well with your requirements.`,
        closing: 'Thank you for considering my application. I look forward to the opportunity to discuss how I can contribute to your team.',
        senderName: resumeData.name,
        senderTitle: 'Software Engineer'
      };
      await generateCoverLetterPDF(coverLetterData, coverLetterPdfPath);
    }

    // Store generation metadata
    const generation = {
      id: generationId,
      jobText,
      resumeText,
      includeCoverLetter: includeCoverLetter || false,
      truthScore: 92, // Dummy value for now
      flags: [], // Empty for now
      createdAt: new Date().toISOString(),
      resumeData
    };

    generations.set(generationId, generation);

    // Response
    res.json({
      generationId,
      truthScore: generation.truthScore,
      flags: generation.flags,
      pdfUrl: `${BASE_URL}/api/generation/${generationId}/resume.pdf`,
      coverLetterPdfUrl: includeCoverLetter 
        ? `${BASE_URL}/api/generation/${generationId}/cover.pdf`
        : null
    });
  } catch (error) {
    console.error('Error in /api/generate:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Serve PDF endpoint
app.get('/api/generation/:id/resume.pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const pdfPath = path.join(STORAGE_DIR, id, 'resume.pdf');

    // Check if file exists
    try {
      await fs.access(pdfPath);
      res.sendFile(path.resolve(pdfPath), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="resume.pdf"`
        }
      });
    } catch {
      res.status(404).json({ error: 'PDF not found' });
    }
  } catch (error) {
    console.error('Error serving PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve cover letter PDF endpoint
app.get('/api/generation/:id/cover.pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const pdfPath = path.join(STORAGE_DIR, id, 'cover.pdf');

    // Check if file exists
    try {
      await fs.access(pdfPath);
      res.sendFile(path.resolve(pdfPath), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="cover.pdf"`
        }
      });
    } catch {
      res.status(404).json({ error: 'Cover letter PDF not found' });
    }
  } catch (error) {
    console.error('Error serving cover letter PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize storage directory and start server
ensureStorageDir().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Base URL: ${BASE_URL}`);
  });
});

