/**
 * Parse resume text into structured format
 * This is a simple parser - will be enhanced later with LLM
 * @param {string} resumeText - Raw resume text
 * @returns {Object} Structured resume data
 */
function parseResumeText(resumeText) {
  // For now, return a basic structure
  // Later this will use LLM to extract structured data
  const lines = resumeText.split('\n').filter(line => line.trim());
  
  // Basic parsing - extract name (first line usually)
  const name = lines[0] || 'Your Name';
  
  // Extract email and phone (look for patterns)
  const emailMatch = resumeText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  const phoneMatch = resumeText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  
  // For MVP, return a simple structure
  // The LLM will handle proper parsing later
  return {
    name: name,
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0] : '',
    location: '',
    linkedIn: '',
    summary: 'Experienced professional with a strong background in software development and problem-solving.',
    experience: [
      {
        title: 'Software Engineer',
        company: 'Tech Company',
        startDate: '2020',
        endDate: 'Present',
        description: [
          'Developed and maintained web applications',
          'Collaborated with cross-functional teams',
          'Implemented best practices and coding standards'
        ]
      }
    ],
    education: [
      {
        degree: 'Bachelor of Science in Computer Science',
        school: 'University',
        graduationDate: '2020'
      }
    ],
    skills: ['JavaScript', 'Node.js', 'React', 'Python', 'MongoDB']
  };
}

module.exports = {
  parseResumeText
};



