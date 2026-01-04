const { GoogleGenAI } = require('@google/genai');
const { generatorOutputSchema } = require('../schemas');

require('dotenv').config();

// New SDK automatically gets API key from GEMINI_API_KEY environment variable
const ai = new GoogleGenAI({});

// Model names to try in order (using new SDK model names)
const modelNames = [
  'gemini-2.5-flash',  // Latest model from new SDK
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro'
];

/**
 * Generate tailored resume using Gemini with strict fact-checking rules
 * @param {string} jobText - Job posting text
 * @param {string} resumeText - Original resume text
 * @param {boolean} includeCoverLetter - Whether to generate cover letter
 * @returns {Promise<Object>} Validated generator output
 */
async function generateTailoredResume(jobText, resumeText, includeCoverLetter = false) {
  const prompt = buildGeneratorPrompt(jobText, resumeText, includeCoverLetter);

  let response, text;
  
  // Try models in order until one works
  for (let i = 0; i < modelNames.length; i++) {
    try {
      console.log(`Attempting to use model: ${modelNames[i]}`);
      
      // New SDK API structure
      response = await ai.models.generateContent({
        model: modelNames[i],
        contents: prompt
      });
      
      text = response.text;
      
      if (!text) {
        console.error('Response text is empty or undefined');
        console.error('Response object:', JSON.stringify(response, null, 2));
        throw new Error('Empty response from Gemini API');
      }
      
      console.log(`✓ Successfully using model: ${modelNames[i]}`);
      console.log(`Response text length: ${text.length} characters`);
      break; // Success, exit loop
      
    } catch (modelError) {
      // If this is the last model, throw the error
      if (i === modelNames.length - 1) {
        throw modelError;
      }
      // Otherwise, try next model
      console.log(`Model ${modelNames[i]} failed, trying next...`);
      continue;
    }
  }

  try {

    // Parse JSON from response - handle multiple formats
    let parsedOutput;
    
    // Try to extract JSON from markdown code blocks first
    const jsonCodeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonCodeBlockMatch) {
      try {
        parsedOutput = JSON.parse(jsonCodeBlockMatch[1].trim());
      } catch (e) {
        // Fall through to other methods
      }
    }
    
    // If not found, try to find JSON object in text
    if (!parsedOutput) {
      const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        try {
          parsedOutput = JSON.parse(jsonObjectMatch[0]);
        } catch (e) {
          // Fall through
        }
      }
    }
    
    // Last resort: try parsing the whole text
    if (!parsedOutput) {
      try {
        parsedOutput = JSON.parse(text.trim());
      } catch (parseError) {
        console.error('Failed to parse JSON from Gemini response:', text.substring(0, 500));
        throw new Error(`Failed to parse JSON from Gemini response: ${parseError.message}`);
      }
    }

    // Log parsed output for debugging
    if (!parsedOutput) {
      console.error('ERROR: parsedOutput is null or undefined');
      console.error('Response text (first 1000 chars):', text.substring(0, 1000));
      throw new Error('Failed to parse JSON from Gemini response - parsedOutput is null');
    }
    
    console.log('Parsed output type:', typeof parsedOutput);
    console.log('Parsed output keys:', Object.keys(parsedOutput || {}));
    console.log('Parsed output sample:', JSON.stringify(parsedOutput, null, 2).substring(0, 500));
    
    // Preprocess: convert null to undefined for optional fields
    if (parsedOutput.coverLetterText === null) {
      parsedOutput.coverLetterText = undefined;
    }
    
    // Validate with Zod schema
    try {
      const validatedOutput = generatorOutputSchema.parse(parsedOutput);
      console.log('✓ Schema validation passed');
      
      // Normalize URLs (add https:// if missing)
      normalizeUrls(validatedOutput);
      
      return validatedOutput;
    } catch (zodError) {
      console.error('Schema validation failed');
      console.error('Error name:', zodError?.name);
      console.error('Error message:', zodError?.message);
      console.error('Error object keys:', Object.keys(zodError || {}));
      
      // Check if it's a ZodError with the standard structure
      if (zodError && typeof zodError === 'object') {
        // Try to access errors in different ways
        const errors = zodError.errors || zodError.issues || zodError.details || [];
        
        if (Array.isArray(errors) && errors.length > 0) {
          const errorMessages = errors.map(e => {
            const path = (e && e.path && Array.isArray(e.path)) ? e.path.join('.') : 'unknown';
            const message = (e && e.message) ? e.message : 'validation failed';
            return `${path}: ${message}`;
          });
          throw new Error(`Invalid output structure: ${errorMessages.join(', ')}`);
        }
      }
      
      // Fallback error message
      console.error('Parsed output structure:', JSON.stringify(parsedOutput, null, 2).substring(0, 1000));
      throw new Error(`Schema validation failed: ${zodError?.message || 'Unknown validation error. Check server logs for details.'}`);
    }
  } catch (error) {
    // Log the actual error for debugging
    console.error('Error in generateTailoredResume:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Normalize URLs in the validated output by adding https:// if missing
 */
function normalizeUrls(output) {
  if (output.tailoredResumeJson?.basics?.links) {
    const links = output.tailoredResumeJson.basics.links;
    if (links.linkedIn && !links.linkedIn.startsWith('http')) {
      links.linkedIn = `https://${links.linkedIn}`;
    }
    if (links.github && !links.github.startsWith('http')) {
      links.github = `https://${links.github}`;
    }
    if (links.portfolio && !links.portfolio.startsWith('http')) {
      links.portfolio = `https://${links.portfolio}`;
    }
    if (links.website && !links.website.startsWith('http')) {
      links.website = `https://${links.website}`;
    }
  }
  
  // Normalize project URLs
  if (output.tailoredResumeJson?.projects) {
    for (const project of output.tailoredResumeJson.projects) {
      if (project.url && !project.url.startsWith('http')) {
        project.url = `https://${project.url}`;
      }
    }
  }
}

/**
 * Build the generator prompt with strict rules
 */
function buildGeneratorPrompt(jobText, resumeText, includeCoverLetter) {
  return `You are a resume tailoring assistant. Your task is to create a tailored resume based on the job posting and the user's original resume.

CRITICAL RULES - YOU MUST FOLLOW THESE STRICTLY:

1. FACT ACCURACY:
   - ONLY use facts, metrics, and information that are EXPLICITLY stated in the resumeText
   - DO NOT invent, estimate, or infer any metrics (e.g., "increased revenue by 20%" is only valid if "20%" appears in resumeText)
   - DO NOT add skills, technologies, or experiences that are not mentioned in resumeText
   - If a metric is not present, DO NOT include it - use qualitative descriptions instead

2. JOB REQUIREMENTS:
   - If the job asks for something NOT in the resume, DO NOT claim the user has it
   - Instead, add it to "suggestedAdditions" array with the requirement and reason
   - DO NOT include suggested items in the actual resume JSON

3. EVIDENCE MAPPING:
   - For EVERY bullet point in experience/projects, provide an "evidenceSnippet" that shows where in the original resumeText this claim comes from
   - The evidenceSnippet should be an exact or approximate quote from resumeText
   - Map all claims in the "claimMap" array

4. TAILORING:
   - Reorder and emphasize experiences/skills that match the job
   - Use keywords from the job posting in the tailored resume
   - Note all targeted keywords in "tailoringNotes.keywordsTargeted"
   - Keep all original facts intact, just rephrase for better alignment

5. OUTPUT FORMAT:
   - Return ONLY valid JSON matching this exact structure
   - Do not include markdown formatting, just pure JSON

JOB POSTING:
${jobText}

ORIGINAL RESUME TEXT:
${resumeText}

Generate a tailored resume JSON. ${includeCoverLetter ? 'Also generate a cover letter.' : ''}

Return a JSON object with this structure:
{
  "tailoredResumeJson": {
    "basics": {
      "name": "string",
      "email": "string",
      "phone": "string (optional)",
      "location": "string (optional)",
      "links": {
        "linkedIn": "url (optional)",
        "github": "url (optional)",
        "portfolio": "url (optional)",
        "website": "url (optional)"
      }
    },
    "summary": "string - tailored professional summary",
    "skills": ["array of strings - only skills from resumeText"],
    "experience": [
      {
        "title": "string",
        "company": "string",
        "startDate": "string",
        "endDate": "string or 'Present'",
        "bullets": [
          {
            "text": "string - tailored bullet point",
            "evidenceSnippet": "string - quote from resumeText supporting this"
          }
        ],
        "location": "string (optional)"
      }
    ],
    "projects": [
      {
        "name": "string",
        "description": "string (optional)",
        "technologies": ["array of strings (optional)"],
        "url": "url (optional)",
        "bullets": [
          {
            "text": "string",
            "evidenceSnippet": "string"
          }
        ]
      }
    ],
    "education": [
      {
        "degree": "string",
        "school": "string",
        "graduationDate": "string (optional)",
        "gpa": "string (optional)",
        "honors": ["array of strings (optional)"]
      }
    ],
    "tailoringNotes": {
      "keywordsTargeted": ["array of keywords from job posting"],
      "jobRequirementsMatched": ["array of matched requirements"],
      "jobRequirementsNotMatched": ["array of requirements not in resume"]
    }
  },
  "coverLetterText": "${includeCoverLetter ? 'string - tailored cover letter' : 'null or omit'}",
  "claimMap": [
    {
      "bulletText": "string - exact bullet text",
      "evidenceSnippet": "string - quote from resumeText",
      "section": "experience | projects | education | summary",
      "index": "number (optional)"
    }
  ],
  "suggestedAdditions": [
    {
      "requirement": "string - requirement from job not in resume",
      "reason": "string - why this is relevant",
      "suggestedText": "string (optional) - suggested bullet if user wants to add"
    }
  ]
}

Remember: Only use facts from resumeText. Do not invent anything.`;
}

module.exports = {
  generateTailoredResume,
};

