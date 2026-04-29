// Upload Handler — Role-based budget PDF upload UI
// Only Clerk, Admin, or Commissioner can upload
// Triggers PDF parser and initializes budget data

/**
 * Build and insert upload button into the page
 * Called from main app after login
 */
function buildUploadButton(userRole, userEmail, userDept) {
  const allowedRoles = ['clerk', 'admin', 'commissioner'];
  
  if (!allowedRoles.includes(userRole)) {
    return; // User cannot upload — hide button
  }

  const container = document.getElementById('uploadContainer') || createUploadContainer();

  const btn = document.createElement('button');
  btn.className = 'upload-btn';
  btn.innerHTML = '📤 Load Budget';
  btn.title = `Upload FN302 Budget PDF (${userRole})`;
  btn.onclick = () => showUploadModal(userRole, userEmail, userDept);

  container.appendChild(btn);
}

/**
 * Create upload container if it doesn't exist
 */
function createUploadContainer() {
  const container = document.createElement('div');
  container.id = 'uploadContainer';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
  `;
  document.body.appendChild(container);
  return container;
}

/**
 * Show upload modal
 */
function showUploadModal(userRole, userEmail, userDept) {
  const modal = document.createElement('div');
  modal.className = 'upload-modal-overlay';
  modal.innerHTML = `
    <div class="upload-modal">
      <div class="modal-header">
        <h2>Load Budget PDF</h2>
        <button class="modal-close" onclick="this.closest('.upload-modal-overlay').remove()">✕</button>
      </div>

      <div class="modal-body">
        <p class="upload-info">📄 Upload weekly FN302 Budget Variance PDF</p>
        
        <input type="file" id="budgetFileInput" accept=".pdf" />
        
        <div class="file-info">
          <small>File format: <code>budget_MM-DD-YY_.pdf</code></small>
          <small>Report date will be extracted from filename</small>
        </div>

        <div class="user-info">
          <p><strong>Uploading as:</strong> ${userRole.toUpperCase()}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Department:</strong> ${userDept || 'County-wide'}</p>
        </div>

        <div class="modal-actions">
          <button class="btn-primary" id="uploadConfirmBtn" onclick="handleUploadConfirm()">
            Load Budget
          </button>
          <button class="btn-secondary" onclick="this.closest('.upload-modal-overlay').remove()">
            Cancel
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <small>✓ Data stored securely • ✓ Shared with authorized users • ✓ Automatic backup</small>
      </div>
    </div>
  `;

  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  `;

  document.body.appendChild(modal);

  // Store context for upload handler
  window._uploadContext = { userRole, userEmail, userDept };
}

/**
 * Handle upload confirmation
 */
async function handleUploadConfirm() {
  const fileInput = document.getElementById('budgetFileInput');
  const file = fileInput?.files?.[0];

  if (!file) {
    showError('Please select a PDF file');
    return;
  }

  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showError('File must be a PDF');
    return;
  }

  const { userRole } = window._uploadContext;

  try {
    const success = await handleBudgetUpload(file, userRole);
    
    if (success) {
      // Close modal
      document.querySelector('.upload-modal-overlay')?.remove();
      
      // Refresh display
      if (typeof renderBudgetDisplay === 'function') {
        renderBudgetDisplay();
      }
    }
  } catch (err) {
    showError(`Upload failed: ${err.message}`);
  }
}

/**
 * Show error toast
 */
function showError(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast-error';
  toast.innerHTML = `❌ ${msg}`;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #e74c3c;
    color: white;
    padding: 16px 20px;
    border-radius: 4px;
    z-index: 3000;
    font-size: 14px;
    max-width: 300px;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/**
 * Show success toast
 */
function showSuccess(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast-success';
  toast.innerHTML = `✅ ${msg}`;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #27ae60;
    color: white;
    padding: 16px 20px;
    border-radius: 4px;
    z-index: 3000;
    font-size: 14px;
    max-width: 300px;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/**
 * CSS for upload modal (add to styles.css)
 */
const UPLOAD_STYLES = `
.upload-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: all 0.2s;
}

.upload-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
}

.upload-modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 24px;
}

.upload-info {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #333;
}

#budgetFileInput {
  display: block;
  width: 100%;
  padding: 12px;
  border: 2px dashed #667eea;
  border-radius: 6px;
  background: #f5f7ff;
  margin: 16px 0;
  cursor: pointer;
}

#budgetFileInput:hover {
  background: #e8ecff;
}

.file-info {
  background: #f9f9f9;
  padding: 12px;
  border-left: 4px solid #667eea;
  margin: 16px 0;
  font-size: 12px;
  line-height: 1.6;
}

.user-info {
  background: #e8f5e9;
  padding: 12px;
  border-radius: 4px;
  margin: 16px 0;
  font-size: 13px;
}

.user-info p {
  margin: 8px 0;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary {
  flex: 1;
  background: #667eea;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-secondary {
  flex: 1;
  background: #e0e0e0;
  color: #333;
  border: none;
  padding: 12px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #d0d0d0;
}

.modal-footer {
  padding: 12px 24px;
  border-top: 1px solid #e0e0e0;
  background: #f9f9f9;
  border-radius: 0 0 8px 8px;
  font-size: 11px;
  color: #666;
  text-align: center;
}
`;
