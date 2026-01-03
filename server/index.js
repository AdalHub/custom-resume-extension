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
const { connectToMongoDB, getCollections, createIndexes } = require('./db/mongodb');
const { createGenerationDocument, formatGenerationForResponse } = require('./models/generationModel');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

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
    const { jobText, resumeText, includeCoverLetter, userId, jobUrl } = validatedInput;

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

    // Save to MongoDB
    const { generations: generationsCollection } = await getCollections();
    const generationDoc = createGenerationDocument({
      generationId,
      userId: userId || 'anonymous',
      jobText,
      jobUrl: jobUrl || null,
      resumeText,
      includeCoverLetter: includeCoverLetter || false,
      tailoredResumeJson,
      claimMap,
      suggestedAdditions,
      verifications,
      truthScore,
      flags,
      pdfPath: resumePdfPath,
      coverPdfPath: coverLetterPdfPath
    });

    await generationsCollection.insertOne(generationDoc);

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

// GET /api/generations - List generations for a user
app.get('/api/generations', async (req, res) => {
  try {
    const userId = req.query.userId || 'anonymous';
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const { generations: generationsCollection } = await getCollections();
    
    const generations = await generationsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    const formattedGenerations = generations.map(doc => ({
      generationId: doc._id,
      createdAt: doc.createdAt,
      jobUrl: doc.jobUrl,
      truthScore: doc.truthScore,
      flagsCount: doc.flags?.length || 0,
      pdfUrl: doc.pdfPath ? `${BASE_URL}/api/generation/${doc._id}/resume.pdf` : null,
      coverLetterPdfUrl: doc.coverPdfPath ? `${BASE_URL}/api/generation/${doc._id}/cover.pdf` : null,
    }));

    res.json({
      generations: formattedGenerations,
      total: formattedGenerations.length,
      limit,
      skip
    });
  } catch (error) {
    console.error('Error fetching generations:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/generation/:id - Get generation details
app.get('/api/generation/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { generations: generationsCollection } = await getCollections();
    const generation = await generationsCollection.findOne({ _id: id });

    if (!generation) {
      return res.status(404).json({ error: 'Generation not found' });
    }

    const formattedGeneration = formatGenerationForResponse(generation);
    
    // Add full URLs
    formattedGeneration.pdfUrl = formattedGeneration.pdfUrl 
      ? `${BASE_URL}${formattedGeneration.pdfUrl}` 
      : null;
    formattedGeneration.coverLetterPdfUrl = formattedGeneration.coverLetterPdfUrl
      ? `${BASE_URL}${formattedGeneration.coverLetterPdfUrl}`
      : null;

    res.json(formattedGeneration);
  } catch (error) {
    console.error('Error fetching generation:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Initialize storage directory, connect to MongoDB, and start server
async function startServer() {
  try {
    // Ensure storage directory exists
    await ensureStorageDir();
    
    // Connect to MongoDB
    await connectToMongoDB();
    await createIndexes();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Base URL: ${BASE_URL}`);
      console.log('MongoDB connected and ready');
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();

