// Test script to find working Gemini model using NEW SDK
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

// New SDK automatically gets API key from GEMINI_API_KEY environment variable
const ai = new GoogleGenAI({});

// List of model names to try (using new SDK model names)
const modelsToTest = [
  'gemini-2.5-flash',  // Latest from new SDK
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-1.0-pro'
];

async function testModel(modelName) {
  try {
    console.log(`\nTesting: ${modelName}...`);
    
    // New SDK API structure
    const response = await ai.models.generateContent({
      model: modelName,
      contents: 'Say "Hello" in one word.'
    });
    
    const text = response.text;
    console.log(`✓ SUCCESS! Model "${modelName}" works!`);
    console.log(`  Response: ${text.trim()}`);
    return true;
  } catch (error) {
    const errorMsg = error.message || error.toString();
    console.log(`✗ FAILED: ${errorMsg.split('\n')[0]}`);
    if (error.status) {
      console.log(`  Status: ${error.status}`);
    }
    return false;
  }
}

async function findWorkingModel() {
  console.log('Testing Gemini models to find one that works...\n');
  
  for (const modelName of modelsToTest) {
    const works = await testModel(modelName);
    if (works) {
      console.log(`\n✅ Use this model: "${modelName}"`);
      return modelName;
    }
  }
  
  console.log('\n❌ No working models found. Check your API key and billing.');
  return null;
}

findWorkingModel().then(model => {
  if (model) {
    console.log(`\nUpdate your code to use: model = genAI.getGenerativeModel({ model: '${model}' });`);
  }
});

