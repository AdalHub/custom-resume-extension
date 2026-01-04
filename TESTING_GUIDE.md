# ProofResume Extension Testing Guide

## Prerequisites

1. **Server Setup:**
   - Ensure MongoDB Atlas connection string is in `server/.env` as `MONGODB_URI`
   - Ensure `GEMINI_API_KEY` is set in `server/.env`
   - Ensure `PORT=8787` (or your preferred port) in `server/.env`
   - Ensure `BASE_URL` is set in `server/.env` (e.g., `http://localhost:8787`)

2. **Extension Setup:**
   - Chrome browser installed
   - Node.js and npm installed

## Step-by-Step Testing Instructions

### Step 1: Start the Server

```bash
# Navigate to server directory
cd proofresume/server

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

**Expected Output:**
- Server should start on port 8787 (or your configured port)
- You should see: "Server running on port 8787"
- You should see: "Connected to MongoDB Atlas"
- You should see: "MongoDB indexes created"

**Troubleshooting:**
- If MongoDB connection fails, check your `MONGODB_URI` in `.env`
- If port is in use, change `PORT` in `.env` or kill the process using that port

---

### Step 2: Load the Extension in Chrome

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **"Load unpacked"** button
5. Navigate to and select the `proofresume/extension` folder
6. The extension should appear in your extensions list

**Expected Result:**
- Extension "ProofResume" appears in the list
- Status shows "Enabled"
- No errors in the extension details

**Troubleshooting:**
- If extension doesn't load, check for errors in the extension details
- Ensure all files are present in the `extension/` folder

---

### Step 3: Configure Extension Settings

1. Click the **ProofResume extension icon** in Chrome toolbar
2. Click **"Open Settings"** button
3. In the settings page:

   **a. Configure Resume:**
   - Either paste your resume text in the textarea, OR
   - Upload a `.txt` file with your resume content
   - Click **"Save Resume"**
   - Verify the preview shows your resume

   **b. Configure Backend URL:**
   - In the "Backend Configuration" section
   - Enter your backend URL (default: `http://localhost:8787`)
   - Click **"Save Backend URL"**
   - Verify success message appears

**Expected Result:**
- Resume text is saved and preview is shown
- Backend URL is saved successfully
- Status messages confirm saves

**Troubleshooting:**
- If resume doesn't save, check Chrome console for errors
- If backend URL validation fails, ensure it's a valid URL format

---

### Step 4: Test Job Description Capture

1. Open a job posting page in Chrome (e.g., LinkedIn, Greenhouse, Lever, or any job board)
2. Navigate to a specific job posting page
3. Click the **ProofResume extension icon** in the toolbar
4. The popup should show:
   - Status: "Resume ready" (green indicator)
   - "Generate Tailored Resume" button should be enabled

**Expected Result:**
- Extension popup opens
- Resume status shows as ready
- Generate button is enabled

**Troubleshooting:**
- If status shows "No resume configured", go back to Step 3 and save your resume
- If button is disabled, ensure resume is saved in settings

---

### Step 5: Generate Tailored Resume

1. While on a job posting page, open the extension popup
2. (Optional) Check **"Include cover letter"** checkbox
3. Click **"Generate Tailored Resume"** button
4. You should see:
   - Loading spinner appears
   - "Generating tailored resume..." message

**Expected Result:**
- Loading spinner shows
- After 30-60 seconds, results appear:
  - Truth Score (0-100) with color-coded bar
  - Flags list (if any issues found)
  - Download buttons for PDFs

**Troubleshooting:**
- If error appears, check:
  - Server is running (Step 1)
  - Backend URL is correct in settings
  - Gemini API key is valid
  - MongoDB connection is working
- Check server console for error messages
- Check browser console (F12) for extension errors

---

### Step 6: Verify Results

1. **Check Truth Score:**
   - Should display a number between 0-100
   - Color changes based on score:
     - Green (80+): Excellent
     - Yellow (60-79): Good
     - Red (<60): Needs improvement

2. **Review Flags:**
   - If flags appear, they show:
     - Status (STRETCH/UNSUPPORTED)
     - Reason for the flag
     - Suggested fix

3. **Download PDFs:**
   - Click **"Download Resume PDF"** to download tailored resume
   - If cover letter was requested, click **"Download Cover Letter"**
   - Open PDFs and verify:
     - Professional formatting
     - Proper typography
     - Clean layout
     - All sections present

**Expected Result:**
- Truth score displays correctly
- Flags (if any) are informative
- PDFs download successfully
- PDFs look professional and well-formatted

---

### Step 7: Test Version History (MongoDB)

1. Generate multiple resumes for different job postings
2. Check server console - you should see generations being saved
3. (Optional) Query MongoDB to verify:
   ```bash
   # Connect to MongoDB Atlas
   # Check generations collection
   ```

**Expected Result:**
- Each generation is saved to MongoDB
- Generation IDs are unique
- All data is persisted

---

### Step 8: Test Edge Cases

1. **No Resume Configured:**
   - Clear resume from settings
   - Try to generate - should show error

2. **Invalid Backend URL:**
   - Set backend URL to invalid value
   - Try to generate - should show error

3. **No Job Description:**
   - Open extension on a non-job page
   - Try to generate - should still work (captures page text)

4. **Large Job Description:**
   - Open a very long job posting
   - Generate - should truncate to ~12k chars

**Expected Result:**
- Errors are handled gracefully
- User-friendly error messages appear
- Extension doesn't crash

---

## Quick Test Checklist

- [ ] Server starts without errors
- [ ] MongoDB connects successfully
- [ ] Extension loads in Chrome
- [ ] Resume can be saved in settings
- [ ] Backend URL can be configured
- [ ] Extension popup shows correct status
- [ ] Job description is captured from page
- [ ] Resume generation completes successfully
- [ ] Truth score displays correctly
- [ ] Flags are shown (if applicable)
- [ ] PDFs download successfully
- [ ] PDFs are well-formatted and professional
- [ ] Multiple generations work
- [ ] Error handling works for edge cases

---

## Common Issues and Solutions

### Issue: "No resume configured"
**Solution:** Go to settings and save your resume text

### Issue: "Server error" or connection failed
**Solution:** 
- Check server is running
- Verify backend URL in settings matches server port
- Check server console for errors

### Issue: "Gemini API error"
**Solution:**
- Verify `GEMINI_API_KEY` is set in `server/.env`
- Check API key is valid and has credits

### Issue: PDF looks unformatted
**Solution:**
- Check server console for errors
- Verify Playwright is installed: `npx playwright install --with-deps`

### Issue: Extension doesn't capture job description
**Solution:**
- Ensure you're on a job posting page
- Check browser console for errors
- Verify `scripting` permission is in manifest.json

---

## Testing Different Job Boards

The extension should work on any webpage. Test on:
- LinkedIn job postings
- Greenhouse job pages
- Lever job pages
- Company career pages
- Any job board

The extension captures `document.body.innerText`, so it works universally.

---

## Performance Expectations

- **Generation Time:** 30-90 seconds (depends on Gemini API response time)
- **PDF Generation:** 2-5 seconds
- **Job Capture:** < 1 second

If generation takes longer than 2 minutes, check:
- Server console for errors
- Gemini API status
- Network connectivity

---

## Next Steps After Testing

Once testing is complete:
1. Verify all features work as expected
2. Check PDF quality and formatting
3. Test with different resume formats
4. Test with different job descriptions
5. Verify MongoDB persistence
6. Check error handling

Good luck with your demo! 🚀


