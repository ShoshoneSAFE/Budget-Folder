// S.A.F.E. Budget Data — Hybrid Flat/Hierarchical Structure
// Stored flat for search, displayed hierarchical by Fund→Revenue/Expense→Department→LineItems

const BUDGET_FIELDS = {
  // Metadata
  acctNum: String,        // e.g., "0401-0000"
  description: String,    // e.g., "Salary - Elected Official"
  fund: String,           // "0001", "0019", etc.
  type: String,           // "revenue" | "expense"
  deptName: String,       // Department name (expenses only)
  revenueName: String,    // Revenue stream name (revenue only)
  category: String,       // "SALARIES", "BENEFITS", "EXPENSES", "CAPITAL", "REVENUE" — grouping only
  
  // Budget vs Actual
  budget: Number,         // 2026 Budget
  actual: Number,         // Actual through report date
  variance: Number,       // Calculated: budget - actual (never stored, always computed)
  pctUsed: Number,        // Calculated: actual / budget (never stored, always computed)
  
  // Editable Fields
  forecastPct: Number,    // Forecast % (editable by commissioners/dept heads)
  notes: Array            // [ { text: String, author: String, timestamp: Date }, ... ]
};

// FLAT STORAGE — for search/filter across all fields
let BUDGET_DATA = [];

// HIERARCHICAL METADATA — for display structure without duplicating data
const BUDGET_HIERARCHY = {
  // funds: {
  //   "0001": {
  //     name: "Current Expense",
  //     revenue: [ ...acctNums ],
  //     departments: {
  //       "dept-01": { name: "Clerk/Auditor", lines: [ ...acctNums ] }
  //     }
  //   }
  // }
};

/**
 * Initialize budget data from PDF upload
 * @param {Array} uploadedLines - Line items extracted from PDF
 */
function initBudgetData(uploadedLines) {
  BUDGET_DATA = uploadedLines.map(line => ({
    acctNum: line.acctNum,
    description: line.description,
    fund: line.fund,
    type: line.type, // 'revenue' or 'expense'
    deptName: line.deptName || null,
    revenueName: line.revenueName || null,
    category: line.category, // 'SALARIES', 'BENEFITS', 'EXPENSES', 'CAPITAL', 'REVENUE'
    budget: parseFloat(line.budget) || 0,
    actual: parseFloat(line.actual) || 0,
    forecastPct: parseFloat(line.forecastPct) || 0,
    notes: line.notes || []
  }));

  // Build hierarchy for display
  buildHierarchy();

  // Persist to shared storage
  saveToStorage();
}

/**
 * Build hierarchical metadata from flat data
 */
function buildHierarchy() {
  const hierarchy = {};

  BUDGET_DATA.forEach(line => {
    const fund = line.fund;
    
    if (!hierarchy[fund]) {
      hierarchy[fund] = {
        name: `Fund ${fund}`,
        revenue: [],
        departments: {},
        categories: {}
      };
    }

    if (line.type === 'revenue') {
      hierarchy[fund].revenue.push(line.acctNum);
    } else {
      const dept = line.deptName || 'Unassigned';
      if (!hierarchy[fund].departments[dept]) {
        hierarchy[fund].departments[dept] = [];
      }
      hierarchy[fund].departments[dept].push(line.acctNum);

      // Also index by category for subtotals
      const cat = line.category || 'EXPENSES';
      if (!hierarchy[fund].categories[cat]) {
        hierarchy[fund].categories[cat] = [];
      }
      hierarchy[fund].categories[cat].push(line.acctNum);
    }
  });

  Object.assign(BUDGET_HIERARCHY, { funds: hierarchy });
}

/**
 * Get a line item by account number
 */
function getLineItem(acctNum) {
  return BUDGET_DATA.find(line => line.acctNum === acctNum);
}

/**
 * Search across all fields (account, description, department, etc.)
 * @param {String} query - Search term
 * @returns {Array} Matching line items
 */
function searchBudget(query) {
  const q = query.toLowerCase();
  return BUDGET_DATA.filter(line =>
    (line.acctNum && line.acctNum.toLowerCase().includes(q)) ||
    (line.description && line.description.toLowerCase().includes(q)) ||
    (line.deptName && line.deptName.toLowerCase().includes(q)) ||
    (line.revenueName && line.revenueName.toLowerCase().includes(q)) ||
    (line.category && line.category.toLowerCase().includes(q))
  );
}

/**
 * Calculate variance (budget - actual)
 */
function calcVariance(acctNum) {
  const line = getLineItem(acctNum);
  return line ? line.budget - line.actual : 0;
}

/**
 * Calculate % used (actual / budget)
 */
function calcPctUsed(acctNum) {
  const line = getLineItem(acctNum);
  if (!line || line.budget === 0) return 0;
  return Math.round((line.actual / line.budget) * 100);
}

/**
 * Calculate forecasted actual (actual ÷ (1 - forecastPct))
 */
function calcForecastedActual(acctNum) {
  const line = getLineItem(acctNum);
  if (!line) return 0;
  const elapsed = 0.46; // 46% of fiscal year elapsed (from PDF)
  const forecast = line.forecastPct || elapsed;
  if (forecast === 1) return line.actual; // Avoid division by zero
  return Math.round(line.actual / (1 - forecast));
}

/**
 * Calculate forecasted variance (budget - forecastedActual)
 */
function calcForecastedVariance(acctNum) {
  const line = getLineItem(acctNum);
  return line ? line.budget - calcForecastedActual(acctNum) : 0;
}

/**
 * Add or update a note on a line item
 */
function addNote(acctNum, text, author) {
  const line = getLineItem(acctNum);
  if (line) {
    line.notes.push({
      text,
      author,
      timestamp: new Date().toISOString()
    });
    saveToStorage();
  }
}

/**
 * Update forecast % for a line item
 */
function setForecastPct(acctNum, pct) {
  const line = getLineItem(acctNum);
  if (line) {
    line.forecastPct = pct;
    saveToStorage();
  }
}

/**
 * Persist budget data to shared storage (Anthropic or localStorage fallback)
 */
function saveToStorage() {
  try {
    if (window.storage) {
      // Use Anthropic persistent storage
      window.storage.set('budgetData', JSON.stringify(BUDGET_DATA), true); // shared=true for public read
    } else {
      // Fallback to localStorage
      localStorage.setItem('budgetData', JSON.stringify(BUDGET_DATA));
    }
  } catch (err) {
    console.error('Storage error:', err);
  }
}

/**
 * Load budget data from storage
 */
async function loadFromStorage() {
  try {
    let data = null;
    if (window.storage) {
      const result = await window.storage.get('budgetData');
      data = result ? JSON.parse(result.value) : null;
    } else {
      data = JSON.parse(localStorage.getItem('budgetData')) || null;
    }
    
    if (data && Array.isArray(data)) {
      BUDGET_DATA = data;
      buildHierarchy();
      return true;
    }
  } catch (err) {
    console.error('Load error:', err);
  }
  return false;
}

/**
 * Get all funds in order
 */
function getAllFunds() {
  return Object.keys(BUDGET_HIERARCHY.funds || {}).sort();
}

/**
 * Get revenue lines for a fund
 */
function getRevenueByFund(fund) {
  const fundhierarchy = BUDGET_HIERARCHY.funds?.[fund];
  if (!fundhierarchy) return [];
  return fundhierarchy.revenue.map(acctNum => getLineItem(acctNum)).filter(Boolean);
}

/**
 * Get departments for a fund
 */
function getDeptsByFund(fund) {
  const fundhierarchy = BUDGET_HIERARCHY.funds?.[fund];
  if (!fundhierarchy) return {};
  return fundhierarchy.departments;
}

/**
 * Get line items by department
 */
function getLinesByDept(fund, dept) {
  const fundhierarchy = BUDGET_HIERARCHY.funds?.[fund];
  if (!fundhierarchy) return [];
  const acctNums = fundhierarchy.departments?.[dept] || [];
  return acctNums.map(acctNum => getLineItem(acctNum)).filter(Boolean);
}

/**
 * Calculate subtotal for a category or department
 */
function calcSubtotal(fund, dept, category) {
  let lines = [];
  
  if (category && !dept) {
    // Category subtotal (e.g., SALARIES for entire fund)
    const fundhierarchy = BUDGET_HIERARCHY.funds?.[fund];
    lines = (fundhierarchy?.categories?.[category] || [])
      .map(acctNum => getLineItem(acctNum))
      .filter(Boolean);
  } else if (dept) {
    // Department subtotal (all or by category)
    lines = getLinesByDept(fund, dept);
    if (category) {
      lines = lines.filter(line => line.category === category);
    }
  } else if (fund) {
    // Entire fund
    lines = BUDGET_DATA.filter(line => line.fund === fund);
  }

  return {
    budgetTotal: lines.reduce((sum, line) => sum + line.budget, 0),
    actualTotal: lines.reduce((sum, line) => sum + line.actual, 0),
    varianceTotal: lines.reduce((sum, line) => sum + (line.budget - line.actual), 0),
    pctUsedAvg: lines.length > 0
      ? Math.round(lines.reduce((sum, line) => sum + calcPctUsed(line.acctNum), 0) / lines.length)
      : 0
  };
}

/**
 * Filter lines by criteria (for display/export)
 */
function filterBudget(criteria) {
  // criteria: { fund, type, dept, category, minVariance, maxPctUsed, ... }
  return BUDGET_DATA.filter(line => {
    if (criteria.fund && line.fund !== criteria.fund) return false;
    if (criteria.type && line.type !== criteria.type) return false;
    if (criteria.dept && line.deptName !== criteria.dept) return false;
    if (criteria.category && line.category !== criteria.category) return false;
    return true;
  });
}
