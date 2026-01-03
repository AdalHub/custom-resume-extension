const { GoogleGenerativeAI } = require('@google/generative-ai');
const { verifierOutputSchema } = require('../schemas');

require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

/**
 * Verify all bullets in the tailored resume against original resumeText
 * @param {string} resumeText - Original resume text
 * @param {Object} tailoredResumeJson - Generated tailored resume JSON
 * @returns {Promise<Array>} Array of bullet verifications
 */
async function verifyBullets(resumeText, tailoredResumeJson) {
  // Extract all bullets from the tailored resume
  const bullets = extractAllBullets(tailoredResumeJson);
  
  if (bullets.length === 0) {
    return [];
  }

  const prompt = buildVerifierPrompt(resumeText, bullets);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response
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
        console.error('Failed to parse JSON from verifier response:', text.substring(0, 500));
        throw new Error(`Failed to parse JSON from verifier response: ${parseError.message}`);
      }
    }

    // Validate with Zod schema
    const validatedOutput = verifierOutputSchema.parse(parsedOutput);

    // Ensure all bullets have bulletId and match with original bullets
    validatedOutput.verifications = validatedOutput.verifications.map((verification, index) => {
      // Find matching bullet by text (in case order differs)
      const matchingBullet = bullets.find(b => 
        b.bulletText === verification.bulletText || 
        b.bulletText.includes(verification.bulletText) ||
        verification.bulletText.includes(b.bulletText)
      ) || bullets[index];
      
      return {
        ...verification,
        bulletId: verification.bulletId || matchingBullet?.bulletId || `bullet_${index}`
      };
    });

    return validatedOutput.verifications;
  } catch (error) {
    if (error.name === 'ZodError') {
      console.error('Verifier schema validation error:', error.errors);
      throw new Error(`Invalid verifier output structure: ${error.errors.map(e => e.path.join('.')).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Extract all bullets from tailored resume with identifiers
 * @param {Object} tailoredResumeJson - Tailored resume JSON
 * @returns {Array} Array of bullets with IDs
 */
function extractAllBullets(tailoredResumeJson) {
  const bullets = [];

  // Extract from summary (treat as single bullet)
  if (tailoredResumeJson.summary) {
    bullets.push({
      bulletText: tailoredResumeJson.summary,
      section: 'summary',
      sectionIndex: 0,
      bulletIndex: 0,
      bulletId: 'summary_0'
    });
  }

  // Extract from experience
  if (tailoredResumeJson.experience) {
    tailoredResumeJson.experience.forEach((exp, expIndex) => {
      if (exp.bullets) {
        exp.bullets.forEach((bullet, bulletIndex) => {
          bullets.push({
            bulletText: bullet.text,
            section: 'experience',
            sectionIndex: expIndex,
            bulletIndex: bulletIndex,
            bulletId: `experience_${expIndex}_${bulletIndex}`,
            roleTitle: exp.title,
            company: exp.company
          });
        });
      }
    });
  }

  // Extract from projects
  if (tailoredResumeJson.projects) {
    tailoredResumeJson.projects.forEach((project, projIndex) => {
      if (project.bullets) {
        project.bullets.forEach((bullet, bulletIndex) => {
          bullets.push({
            bulletText: bullet.text,
            section: 'projects',
            sectionIndex: projIndex,
            bulletIndex: bulletIndex,
            bulletId: `projects_${projIndex}_${bulletIndex}`,
            projectName: project.name
          });
        });
      }
    });
  }

  return bullets;
}

/**
 * Build verifier prompt
 */
function buildVerifierPrompt(resumeText, bullets) {
  const bulletsList = bullets.map((bullet, index) => {
    let context = `Bullet ${index + 1}: "${bullet.bulletText}"`;
    if (bullet.roleTitle) {
      context += `\n  Role: ${bullet.roleTitle} at ${bullet.company}`;
    }
    if (bullet.projectName) {
      context += `\n  Project: ${bullet.projectName}`;
    }
    return context;
  }).join('\n\n');

  return `You are a resume fact-checker. Your task is to verify each bullet point in a tailored resume against the original resume text.

CRITICAL RULES:

1. SUPPORTED: The bullet point is directly supported by facts in the original resumeText.
   - The claim, metrics, and facts can be found explicitly or very clearly implied in resumeText
   - Example: If resumeText says "increased sales by 20%", then "increased sales by 20%" is SUPPORTED

2. STRETCH: The bullet point makes reasonable inferences but may slightly exaggerate or infer details not explicitly stated.
   - The core claim is plausible based on resumeText but some details are inferred
   - Example: If resumeText says "worked on web application", then "developed web application features" might be STRETCH (if "developed" wasn't explicitly stated)

3. UNSUPPORTED: The bullet point makes claims that cannot be found in or reasonably inferred from resumeText.
   - The claim includes facts, metrics, or skills not mentioned in resumeText
   - Example: If resumeText never mentions "Python" but bullet says "used Python", it's UNSUPPORTED

4. EVIDENCE: For each bullet, provide an exact quote from resumeText that supports it (or "none" if UNSUPPORTED).
   - Use the exact wording from resumeText when possible
   - For STRETCH, provide the closest related quote

5. SUGGESTED FIX: For STRETCH or UNSUPPORTED bullets, rewrite them using ONLY facts from resumeText.
   - Remove unsupported claims
   - Use only what can be directly supported
   - Keep the bullet professional and relevant

ORIGINAL RESUME TEXT:
${resumeText}

BULLETS TO VERIFY:
${bulletsList}

For each bullet, return a JSON object with this structure:
{
  "verifications": [
    {
      "bulletText": "exact bullet text from above",
      "status": "SUPPORTED | STRETCH | UNSUPPORTED",
      "reason": "brief explanation of why this status",
      "evidence": "exact quote from resumeText or 'none'",
      "suggestedFix": "rewritten bullet using only supported facts (required for STRETCH/UNSUPPORTED, optional for SUPPORTED)",
      "bulletId": "bullet identifier (e.g., experience_0_1)"
    }
  ]
}

Return ONLY valid JSON. Verify all ${bullets.length} bullets.`;
}

/**
 * Calculate truth score from verifications
 * @param {Array} verifications - Array of bullet verifications
 * @returns {number} Truth score (0-100)
 */
function calculateTruthScore(verifications) {
  if (!verifications || verifications.length === 0) {
    return 0;
  }

  let score = 100;

  verifications.forEach(verification => {
    switch (verification.status) {
      case 'SUPPORTED':
        // No penalty
        break;
      case 'STRETCH':
        score -= 8;
        break;
      case 'UNSUPPORTED':
        score -= 20;
        break;
    }
  });

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate flags from verifications
 * @param {Array} verifications - Array of bullet verifications
 * @returns {Array} Array of flag objects
 */
function generateFlags(verifications) {
  const flags = [];

  verifications.forEach(verification => {
    if (verification.status === 'STRETCH' || verification.status === 'UNSUPPORTED') {
      flags.push({
        bulletId: verification.bulletId,
        bulletText: verification.bulletText,
        status: verification.status,
        reason: verification.reason,
        evidence: verification.evidence,
        suggestedFix: verification.suggestedFix,
        section: verification.bulletId.split('_')[0] // Extract section from bulletId
      });
    }
  });

  return flags;
}

module.exports = {
  verifyBullets,
  calculateTruthScore,
  generateFlags,
  extractAllBullets,
};

