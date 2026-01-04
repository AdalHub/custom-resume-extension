# Step-by-Step Guide to Fix Gemini API Model Error

## Problem
Getting 404 error: "models/gemini-1.5-flash is not found for API version v1beta"

## Solution Steps

### Step 1: Test Which Model Works

Run this command to find which model your API key can access:

```bash
cd proofresume/server
node utils/testGemini.js
```

This will test multiple model names and tell you which one works.

**Expected Output:**
- It will try: gemini-pro, gemini-1.5-pro, gemini-1.5-flash, etc.
- When it finds one that works, it will say: `✓ SUCCESS! Model "gemini-pro" works!`
- Note which model name works

### Step 2: If Test Script Works

If the test script finds a working model, the code has been updated to automatically try models in order. The server should now work.

**Try generating a resume again from the extension.**

### Step 3: If Test Script Fails - Check API Key Setup

If all models fail, follow these steps:

#### 3a. Verify API Key is Correct
1. Go to https://aistudio.google.com/apikey
2. Check that your API key is active
3. Copy the key and verify it matches your `.env` file

#### 3b. Enable Gemini API in Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services** > **Library**
4. Search for "Generative Language API"
5. Click on it and click **Enable**

#### 3c. Check API Restrictions
1. Go to https://console.cloud.google.com/apis/credentials
2. Click on your API key
3. Under **API restrictions**, make sure:
   - Either "Don't restrict key" is selected, OR
   - "Restrict key" is selected AND "Generative Language API" is in the allowed list

#### 3d. Verify Billing
1. Go to https://console.cloud.google.com/billing
2. Make sure billing is enabled for your project
3. Check that your billing account is active

### Step 4: Manual Model Selection

If you know which model works from Step 1, you can manually set it:

1. Open `proofresume/server/services/geminiService.js`
2. Find the `modelNames` array (around line 15)
3. Move the working model to the first position:
   ```javascript
   const modelNames = [
     'gemini-pro',  // Put working model first
     'gemini-1.5-flash',
     // ... rest
   ];
   ```

4. Do the same in `proofresume/server/services/verifierService.js`

5. Restart the server (or it will auto-restart with nodemon)

### Step 5: Alternative - Use REST API Directly

If the SDK continues to have issues, we can switch to using the REST API directly. But try Steps 1-4 first.

## Quick Test

After making changes:

1. **Restart server** (if not using nodemon, stop and run `npm run dev` again)
2. **Open extension** on a job posting page
3. **Click "Generate Tailored Resume"**
4. **Check server console** - you should see: `✓ Using model: gemini-pro` (or whichever works)

## Common Model Names

Based on Google's documentation, try these in order:
- `gemini-pro` (most stable, widely available)
- `gemini-1.5-flash` (faster, newer)
- `gemini-1.5-pro` (most capable, newer)
- `gemini-1.0-pro` (older version)

## Still Having Issues?

If nothing works:
1. Check your API key is valid: https://aistudio.google.com/apikey
2. Verify billing is enabled
3. Check Google Cloud Console for any error messages
4. Try creating a new API key


