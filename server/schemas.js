const { z } = require('zod');

// Basics schema
const basicsSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.object({
    linkedIn: z.string().url().optional(),
    github: z.string().url().optional(),
    portfolio: z.string().url().optional(),
    website: z.string().url().optional(),
  }).optional(),
});

// Skill schema
const skillSchema = z.string().min(1);

// Experience bullet point schema
const experienceBulletSchema = z.object({
  text: z.string().min(1),
  evidenceSnippet: z.string().optional(), // Snippet from original resumeText that supports this claim
});

// Experience role schema
const experienceRoleSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().or(z.literal('Present')),
  bullets: z.array(experienceBulletSchema).min(1),
  location: z.string().optional(),
});

// Project schema
const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  url: z.string().url().optional(),
  bullets: z.array(experienceBulletSchema).optional(),
});

// Education schema
const educationSchema = z.object({
  degree: z.string().min(1),
  school: z.string().min(1),
  graduationDate: z.string().optional(),
  gpa: z.string().optional(),
  honors: z.array(z.string()).optional(),
});

// Tailoring notes schema
const tailoringNotesSchema = z.object({
  keywordsTargeted: z.array(z.string()),
  jobRequirementsMatched: z.array(z.string()).optional(),
  jobRequirementsNotMatched: z.array(z.string()).optional(), // Things asked for but not in resume
});

// Claim map entry schema - maps each bullet to evidence
const claimMapEntrySchema = z.object({
  bulletText: z.string(),
  evidenceSnippet: z.string(), // Exact or approximate snippet from resumeText
  section: z.enum(['experience', 'projects', 'education', 'summary']),
  index: z.number().optional(), // Index within the section
});

// Main tailored resume schema
const tailoredResumeSchema = z.object({
  basics: basicsSchema,
  summary: z.string().min(1),
  skills: z.array(skillSchema),
  experience: z.array(experienceRoleSchema),
  projects: z.array(projectSchema).optional(),
  education: z.array(educationSchema).optional(),
  tailoringNotes: tailoringNotesSchema,
});

// Generator output schema
const generatorOutputSchema = z.object({
  tailoredResumeJson: tailoredResumeSchema,
  coverLetterText: z.string().optional(),
  claimMap: z.array(claimMapEntrySchema),
  suggestedAdditions: z.array(z.object({
    requirement: z.string(),
    reason: z.string(),
    suggestedText: z.string().optional(),
  })).optional(), // Things job asks for but not in resume
});

// Verifier output schema for a single bullet
const bulletVerificationSchema = z.object({
  bulletText: z.string(),
  status: z.enum(['SUPPORTED', 'STRETCH', 'UNSUPPORTED']),
  reason: z.string(),
  evidence: z.string(), // Quote from resumeText or "none"
  suggestedFix: z.string().optional(), // Rewritten bullet using only supported claims
  bulletId: z.string().optional(), // Identifier for the bullet (section_index_bulletIndex)
});

// Verifier output schema
const verifierOutputSchema = z.object({
  verifications: z.array(bulletVerificationSchema),
});

// Input validation schema
const generateInputSchema = z.object({
  jobText: z.string().min(1),
  resumeText: z.string().min(1),
  includeCoverLetter: z.boolean().optional().default(false),
  userId: z.string().optional(),
  jobUrl: z.string().url().optional().or(z.literal('')),
});

module.exports = {
  basicsSchema,
  skillSchema,
  experienceBulletSchema,
  experienceRoleSchema,
  projectSchema,
  educationSchema,
  tailoringNotesSchema,
  claimMapEntrySchema,
  tailoredResumeSchema,
  generatorOutputSchema,
  generateInputSchema,
  bulletVerificationSchema,
  verifierOutputSchema,
};

