// PDF Parser — Extract budget line items from Shoshone County FN302 PDF
// Uses Anthropic API to parse PDF text/tables into structured BUDGET_DATA format

/**
 * Parse budget PDF and extract line items
 * @param {File} pdfFile - PDF file from upload
 * @param {String} reportDate - Date from PDF (e.g., "3/17/2026")
 * @returns {Promise<Array>} Array of budget line items
 */
async function parseBudgetPDF(pdfFile, reportDate) {
  try {
    // Step 1: Convert PDF to base64
    const base64PDF = await fileToBase64(pdfFile);

    // Step 2: Call Anthropic API with PDF
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64PDF
                }
              },
              {
                type: "text",
                text: `Extract ALL budget line items from this Shoshone County FN302 Budget Variance report.
                
Return ONLY valid JSON array (no markdown, no preamble). Each line item must have:
{
  "acctNum": "0401-0000",
  "description": "Salary - Elected Official",
  "fund": "0001",
  "type": "revenue" OR "expense",
  "deptName": "Clerk/Auditor" (expenses only, null for revenue),
  "revenueName": "Property Taxes - 2025" (revenue only, null for expenses),
  "category": "SALARIES" | "BENEFITS" | "EXPENSES" | "CAPITAL" | "REVENUE",
  "budget": 58891.00,
  "actual": 24890.16,
  "forecastPct": 0
}

Rules:
1. Parse EVERY line item from every department and fund
2. For expenses: category is the section header (SALARIES, BENEFITS, EXPENSES, CAPITAL)
3. For revenue: category is always "REVENUE"
4. Extract fund from the "FUND:" label (e.g., "FUND: 0001 CURRENT EXPENSE")
5. Extract dept from the "DEPT:" label (e.g., "DEPT: 1 CLERK/AUDITOR")
6. Only include rows with account numbers (format: XXXX-XXXX)
7. Parse budget and actual as numbers (remove $ and commas)
8. Set forecastPct to 0 initially (will be edited by users)
9. Subtotal rows (TOTAL SALARIES, TOTAL EXPENSES, etc.) should be EXCLUDED
10. Summary rows at page end should be EXCLUDED

Return: [ { item1 }, { item2 }, ... ]`
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`API error: ${data.error.message}`);
    }

    // Step 3: Extract JSON from response
    const content = data.content[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('No JSON array found in API response');
    }

    const lineItems = JSON.parse(jsonMatch[0]);

    // Step 4: Validate and clean
    const cleaned = lineItems
      .filter(item => validateLineItem(item))
      .map(item => sanitizeLineItem(item));

    console.log(`✅ Parsed ${cleaned.length} line items from PDF`);
    return cleaned;

  } catch (err) {
    console.error('PDF Parse Error:', err);
    throw err;
  }
}

/**
 * Convert File to base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result.split(',')[1];
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate a line item has required fields
 */
function validateLineItem(item) {
  return (
    item.acctNum &&
    item.description &&
    item.fund &&
    item.type &&
    typeof item.budget === 'number' &&
    typeof item.actual === 'number'
  );
}

/**
 * Clean and normalize a line item
 */
function sanitizeLineItem(item) {
  return {
    acctNum: String(item.acctNum).trim(),
    description: String(item.description).trim(),
    fund: String(item.fund).trim(),
    type: String(item.type).toLowerCase() === 'revenue' ? 'revenue' : 'expense',
    deptName: item.deptName ? String(item.deptName).trim() : null,
    revenueName: item.revenueName ? String(item.revenueName).trim() : null,
    category: String(item.category || 'EXPENSES').trim().toUpperCase(),
    budget: parseFloat(item.budget) || 0,
    actual: parseFloat(item.actual) || 0,
    forecastPct: 0
  };
}

/**
 * Handle PDF upload from UI
 * Only callable by clerk, admin, or commissioner (checked by permissions)
 */
async function handleBudgetUpload(file, userRole) {
  // Permission check
  const allowedRoles = ['clerk', 'admin', 'commissioner'];
  if (!allowedRoles.includes(userRole)) {
    throw new Error(`⛔ Upload denied: ${userRole} does not have permission`);
  }

  try {
    // Show loading indicator
    showLoadingIndicator('Parsing budget PDF...');

    // Extract report date from filename or prompt user
    const reportDate = extractDateFromFilename(file.name) || prompt('Enter report date (MM/DD/YY):');
    if (!reportDate) throw new Error('Report date required');

    // Parse PDF
    const lineItems = await parseBudgetPDF(file, reportDate);

    // Initialize budget data
    initBudgetData(lineItems);

    // Show confirmation
    hideLoadingIndicator();
    showConfirmation(`✅ Loaded ${lineItems.length} budget line items\nReport Date: ${reportDate}`);

    return true;

  } catch (err) {
    hideLoadingIndicator();
    showError(`Upload failed: ${err.message}`);
    return false;
  }
}

/**
 * Extract date from filename (e.g., "budget_03-17-26_.pdf" → "3/17/2026")
 */
function extractDateFromFilename(filename) {
  const match = filename.match(/(\d{2})-(\d{2})-(\d{2})/);
  if (match) {
    const [_, m, d, y] = match;
    return `${parseInt(m)}/${parseInt(d)}/20${y}`;
  }
  return null;
}

/**
 * UI Helpers
 */
function showLoadingIndicator(msg) {
  const div = document.getElementById('loadingIndicator') || document.createElement('div');
  div.id = 'loadingIndicator';
  div.innerHTML = `<div class="loading-modal"><div class="spinner"></div><p>${msg}</p></div>`;
  div.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
    z-index: 9999;
  `;
  document.body.appendChild(div);
}

function hideLoadingIndicator() {
  const div = document.getElementById('loadingIndicator');
  if (div) div.remove();
}

function showConfirmation(msg) {
  alert(msg);
}

function showError(msg) {
  alert(`❌ ${msg}`);
}
