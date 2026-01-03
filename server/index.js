// Server entry point
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const { generateResumePDF, generateCoverLetterPDF } = require('./utils/pdfGenerator');
const { generateTailoredResume } = require('./services/geminiService');
const { verifyBullets, calculateTruthScore, generateFlags } = require('./services/verifierService');
const { generateInputSchema } = require('./schemas');

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
    // Validate input with Zod
    const validatedInput = generateInputSchema.parse(req.body);
    const { jobText, resumeText, includeCoverLetter } = validatedInput;

    // Generate unique ID
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create storage directory for this generation
    const generationDir = path.join(STORAGE_DIR, generationId);
    await fs.mkdir(generationDir, { recursive: true });

    // Call Gemini to generate tailored resume
    console.log('Calling Gemini API for generation...');
    const geminiOutput = await generateTailoredResume(jobText, resumeText, includeCoverLetter);
    
    const { tailoredResumeJson, coverLetterText, claimMap, suggestedAdditions } = geminiOutput;

    // Verify all bullets against original resumeText
    console.log('Calling Gemini API for verification...');
    const verifications = await verifyBullets(resumeText, tailoredResumeJson);

    // Calculate truth score using verifier algorithm
    // Start at 100, -0 for SUPPORTED, -8 for STRETCH, -20 for UNSUPPORTED
    const truthScore = calculateTruthScore(verifications);

    // Generate flags from verifications (STRETCH and UNSUPPORTED bullets)
    const verificationFlags = generateFlags(verifications);

    // Generate flags from suggestedAdditions (things job wants but resume doesn't have)
    const missingRequirementFlags = (suggestedAdditions || []).map(suggestion => ({
      bulletId: null,
      bulletText: null,
      status: 'MISSING_REQUIREMENT',
      reason: suggestion.reason,
      evidence: 'none',
      suggestedFix: suggestion.suggestedText,
      section: 'requirements',
      type: 'missing_requirement',
      requirement: suggestion.requirement
    }));

    // Combine all flags
    const flags = [...verificationFlags, ...missingRequirementFlags];

    // Generate resume PDF from tailored resume JSON
    const resumePdfPath = path.join(generationDir, 'resume.pdf');
    await generateResumePDF(tailoredResumeJson, resumePdfPath);

    // Generate cover letter PDF if requested
    let coverLetterPdfPath = null;
    if (includeCoverLetter && coverLetterText) {
      coverLetterPdfPath = path.join(generationDir, 'cover.pdf');
      const coverLetterData = {
        date: new Date().toLocaleDateString(),
        recipientName: 'Hiring Manager',
        company: 'Company Name',
        greeting: 'Dear Hiring Manager,',
        body: coverLetterText,
        closing: 'Thank you for considering my application. I look forward to the opportunity to discuss how I can contribute to your team.',
        senderName: tailoredResumeJson.basics.name,
        senderTitle: tailoredResumeJson.experience[0]?.title || 'Professional'
      };
      await generateCoverLetterPDF(coverLetterData, coverLetterPdfPath);
    }

    // Store generation metadata
    const generation = {
      id: generationId,
      jobText,
      resumeText,
      includeCoverLetter: includeCoverLetter || false,
      tailoredResumeJson,
      claimMap,
      suggestedAdditions,
      verifications,
      truthScore,
      flags,
      createdAt: new Date().toISOString()
    };

    generations.set(generationId, generation);

    // Response
    res.json({
      generationId,
      truthScore,
      flags,
      claimMap,
      verifications, // Include full verification results
      suggestedAdditions: suggestedAdditions || [],
      pdfUrl: `${BASE_URL}/api/generation/${generationId}/resume.pdf`,
      coverLetterPdfUrl: includeCoverLetter && coverLetterPdfPath
        ? `${BASE_URL}/api/generation/${generationId}/cover.pdf`
        : null
    });
  } catch (error) {
    console.error('Error in /api/generate:', error);
    
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }
    
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

