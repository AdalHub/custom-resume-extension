const crypto = require('crypto');

/**
 * Create a hash of resume text for storage
 * @param {string} resumeText - Original resume text
 * @returns {string} SHA256 hash
 */
function hashResumeText(resumeText) {
  return crypto.createHash('sha256').update(resumeText).digest('hex');
}

/**
 * Create a generation document for MongoDB
 * @param {Object} data - Generation data
 * @returns {Object} Generation document
 */
function createGenerationDocument(data) {
  const {
    generationId,
    userId,
    jobText,
    jobUrl,
    resumeText,
    includeCoverLetter,
    tailoredResumeJson,
    claimMap,
    suggestedAdditions,
    verifications,
    truthScore,
    flags,
    pdfPath,
    coverPdfPath
  } = data;

  return {
    _id: generationId,
    userId: userId || 'anonymous',
    createdAt: new Date(),
    jobUrl: jobUrl || null,
    jobText: jobText || '',
    resumeTextHash: hashResumeText(resumeText || ''),
    includeCoverLetter: includeCoverLetter || false,
    tailoredResumeJson: tailoredResumeJson || null,
    claimMap: claimMap || [],
    suggestedAdditions: suggestedAdditions || [],
    verifications: verifications || [],
    truthScore: truthScore || 0,
    flags: flags || [],
    pdfPath: pdfPath || null,
    coverPdfPath: coverPdfPath || null,
  };
}

/**
 * Format generation document for API response
 * @param {Object} doc - MongoDB document
 * @returns {Object} Formatted generation object
 */
function formatGenerationForResponse(doc) {
  if (!doc) return null;

  return {
    generationId: doc._id,
    userId: doc.userId,
    createdAt: doc.createdAt,
    jobUrl: doc.jobUrl,
    jobText: doc.jobText,
    includeCoverLetter: doc.includeCoverLetter,
    tailoredResumeJson: doc.tailoredResumeJson,
    claimMap: doc.claimMap,
    suggestedAdditions: doc.suggestedAdditions,
    verifications: doc.verifications,
    truthScore: doc.truthScore,
    flags: doc.flags,
    pdfUrl: doc.pdfPath ? `/api/generation/${doc._id}/resume.pdf` : null,
    coverLetterPdfUrl: doc.coverPdfPath ? `/api/generation/${doc._id}/cover.pdf` : null,
  };
}

module.exports = {
  hashResumeText,
  createGenerationDocument,
  formatGenerationForResponse,
};



