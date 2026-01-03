const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generatorOutputSchema } = require('../schemas');

require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

/**
 * Generate tailored resume using Gemini with strict fact-checking rules
 * @param {string} jobText - Job posting text
 * @param {string} resumeText - Original resume text
 * @param {boolean} includeCoverLetter - Whether to generate cover letter
 * @returns {Promise<Object>} Validated generator output
 */
async function generateTailoredResume(jobText, resumeText, includeCoverLetter = false) {
  const prompt = buildGeneratorPrompt(jobText, resumeText, includeCoverLetter);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

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

    // Validate with Zod schema
    const validatedOutput = generatorOutputSchema.parse(parsedOutput);

    return validatedOutput;
  } catch (error) {
    if (error.name === 'ZodError') {
      console.error('Schema validation error:', error.errors);
      throw new Error(`Invalid output structure: ${error.errors.map(e => e.path.join('.')).join(', ')}`);
    }
    throw error;
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

