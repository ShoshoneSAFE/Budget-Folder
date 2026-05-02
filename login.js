// S.A.F.E. Login, Registration, User Roles & Suggestions Panel
// CREDENTIALS imported from credentials.js

let currentUser = null;
let loginMode = 'login'; // 'login' | 'register' | 'forgot-password' | 'change-password'

// Get all users (credentials + vendors from localStorage)
function getAllUsers(){
  let users = {...CREDENTIALS};
  const vendors = JSON.parse(localStorage.getItem('safe_vendors') || '{}');
  const deptHeads = JSON.parse(localStorage.getItem('safe_dept_heads') || '{}');
  return {...users, ...vendors, ...deptHeads};
}

function openLogin(){
  loginMode = 'login';
  renderLoginForm();
  document.getElementById('loginOverlay').classList.add('open');
}
function closeLogin(){document.getElementById('loginOverlay').classList.remove('open');}

function renderLoginForm(){
  try {
    const form = document.getElementById('liForm');
    if(!form) return;
    
    if(loginMode === 'login'){
      form.innerHTML = `
        <input type="email" id="liEmail" placeholder="Email address" autocomplete="off"/>
        <input type="password" id="liPass" placeholder="Password" autocomplete="off"/>
        <div class="login-err" id="liErr"></div>
        <button class="btn-login" onclick="doLogin()">Sign In</button>
        <button class="btn-public" onclick="doPublic()">Continue as Public (Read Only)</button>
        <button class="btn-public" onclick="showRegister()">New User / Vendor? Register Here</button>
        <button class="btn-public" onclick="showForgotPass()">Forgot Password?</button>
      `;
      // Auto-populate email from localStorage
      setTimeout(() => {
        const savedEmail = localStorage.getItem('safe_last_email');
        const emailField = document.getElementById('liEmail');
        if(savedEmail && emailField) emailField.value = savedEmail;
        
        // Add Enter/Tab key listener to password field
        const passField = document.getElementById('liPass');
        if(passField) {
          passField.addEventListener('keydown', (e) => {
            if(e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              doLogin();
            }
          });
        }
      }, 100);
    } else if(loginMode === 'register'){
      const deptOptions = `
        <option value="">Select your department/role</option>
        <option value="01">01 - Assessor</option>
        <option value="02">02 - Auditor</option>
        <option value="03">03 - Clerk</option>
        <option value="04">04 - Commissioner</option>
        <option value="05">05 - Coroner</option>
        <option value="06">06 - Fire</option>
        <option value="07">07 - Health</option>
        <option value="08">08 - Highway</option>
        <option value="09">09 - IT</option>
        <option value="10">10 - Jail</option>
        <option value="11">11 - Parks</option>
        <option value="12">12 - Planning</option>
        <option value="13">13 - Prosecutor</option>
        <option value="14">14 - Recorder</option>
        <option value="15">15 - Sheriff</option>
        <option value="16">16 - Social Services</option>
        <option value="17">17 - Surveyor</option>
        <option value="18">18 - Treasurer</option>
        <option value="19">19 - Veterans</option>
        <option value="20">20 - Weed</option>
        <option value="04.1">04.1 - Commissioner District One</option>
        <option value="04.2">04.2 - Commissioner District Two</option>
        <option value="04.3">04.3 - Commissioner District Three</option>
        <option value="VENDOR">VENDOR - Bill Submission</option>
      `;
      form.innerHTML = `
        <h3>Create Account</h3>
        <input type="email" id="regEmail" placeholder="Email address" autocomplete="off"/>
        <input type="text" id="regName" placeholder="Your full name"/>
        <select id="regDept">
          ${deptOptions}
        </select>
        <input type="text" id="regCompany" placeholder="Company name (vendors only)" style="display:none;"/>
        <input type="text" id="regAuthCode" placeholder="Authorization code (dept heads)" style="display:none;"/>
        <select id="regCommDistrict" style="display:none;">
          <option value="">Select Commissioner District</option>
          <option value="1">District 1 Commissioner</option>
          <option value="2">District 2 Commissioner</option>
          <option value="3">District 3 Commissioner</option>
        </select>
        <input type="password" id="regPass1" placeholder="Create password" autocomplete="off"/>
        <input type="password" id="regPass2" placeholder="Confirm password" autocomplete="off"/>
        <div class="login-err" id="liErr"></div>
        <button class="btn-login" onclick="doRegister()">Create Account</button>
        <button class="btn-public" onclick="showLogin()">Back to Login</button>
      `;
      setTimeout(() => {
        const deptSelect = document.getElementById('regDept');
        if(deptSelect) {
          deptSelect.addEventListener('change', (e) => {
            const companyField = document.getElementById('regCompany');
            const authField = document.getElementById('regAuthCode');
            const commField = document.getElementById('regCommDistrict');
            if(companyField) companyField.style.display = e.target.value === 'VENDOR' ? 'block' : 'none';
            if(authField) authField.style.display = (e.target.value && e.target.value !== 'VENDOR' && !e.target.value.startsWith('04.')) ? 'block' : 'none';
            if(commField) commField.style.display = e.target.value.startsWith('04.') ? 'block' : 'none';
          });
        }
      }, 100);
    }
  } catch(err) {
    console.error('renderLoginForm error:', err);
    document.getElementById('liForm').innerHTML = '<p style="color:red;">Error loading form. Refresh page.</p>';
  }
}

function showLogin(){loginMode='login'; renderLoginForm();}
function showRegister(){loginMode='register'; renderLoginForm();}
function showForgotPass(){
  document.getElementById('liErr').textContent = 'Contact commissioners or clerk to reset your password.';
}

function doPublic(){currentUser={role:'public',name:'Public'};closeLogin();updateUserBadge();}

function prePopulateSuggestionForm(){
  if(currentUser && currentUser.email && currentUser.name){
    const nameField = document.getElementById('sName');
    const emailField = document.getElementById('sEmail');
    if(nameField) nameField.value = currentUser.name;
    if(emailField) emailField.value = currentUser.email;
  }
}

// Multi-dept selector
function showDeptSelector(usersByEmail){
  const overlay = document.getElementById('loginOverlay');
  overlay.innerHTML = `
    <div class="login-box">
      <h2>Select Department</h2>
      <p style="font-size:13px;color:#666;margin-bottom:16px;">You have access to multiple departments. Choose one:</p>
      <div id="deptList" style="max-height:300px;overflow-y:auto;"></div>
      <button class="btn-public" onclick="showLogin()" style="margin-top:12px;width:100%;">Back</button>
    </div>
  `;
  
  const deptList = document.getElementById('deptList');
  usersByEmail.forEach(user => {
    const btn = document.createElement('button');
    btn.className = 'btn-login';
    btn.style.marginBottom = '8px';
    btn.style.width = '100%';
    btn.textContent = `${user.dept} - ${user.name || user.email}`;
    btn.onclick = () => {
      currentUser = user;
      closeLogin();
      updateUserBadge();
      if(user.role === 'admin' || user.role === 'clerk' || (user.dept === '04')){
        document.getElementById('stab3').style.display = '';
      }
    };
    deptList.appendChild(btn);
  });
}

// Show credentials management panel (admin/clerk/commissioner only)
function showCredentials(){
  const allUsers = getAllUsers();
  const credsList = [];
  
  for(let key in allUsers){
    const user = allUsers[key];
    // Hide admin credentials unless current user is admin
    if(user.role === 'admin' && currentUser.role !== 'admin'){
      continue;
    }
    credsList.push(user);
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'credsOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  overlay.innerHTML = `
    <div style="background:white;width:90%;max-width:1000px;max-height:80vh;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;">
      <div style="background:var(--navy);color:white;padding:16px;display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0;">System Credentials</h2>
        <button onclick="closeCredentials()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;">✕</button>
      </div>
      <div style="overflow-y:auto;flex:1;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead style="background:#f5f5f5;position:sticky;top:0;">
            <tr>
              <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">Name</th>
              <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">Email</th>
              <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">Password</th>
              <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">Dept</th>
              <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">Role</th>
              <th style="padding:12px;text-align:center;border-bottom:1px solid #ddd;">Actions</th>
            </tr>
          </thead>
          <tbody id="credsList"></tbody>
        </table>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  const tbody = document.getElementById('credsList');
  
  credsList.forEach((user, idx) => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #eee';
    const decryptedPass = atob(user.pass);
    tr.innerHTML = `
      <td style="padding:12px;">${user.name || '—'}</td>
      <td style="padding:12px;">${user.email}</td>
      <td style="padding:12px;font-family:monospace;font-size:12px;">${decryptedPass}</td>
      <td style="padding:12px;">${user.dept}</td>
      <td style="padding:12px;">${user.role}</td>
      <td style="padding:12px;text-align:center;">
        <button onclick="editCred(${idx})" style="background:var(--gold);color:var(--navy);border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;margin-right:4px;">Edit</button>
        <button onclick="delCred('${user.email}','${user.dept}')" style="background:#c41e3a;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function closeCredentials(){
  const overlay = document.getElementById('credsOverlay');
  if(overlay) overlay.remove();
}

function editCred(idx){
  // TODO: Edit modal
  alert('Edit functionality coming soon');
}

function delCred(email, dept){
  if(!confirm(`Delete ${email} from ${dept}?`)) return;
  const vendors = JSON.parse(localStorage.getItem('safe_vendors') || '{}');
  const deptHeads = JSON.parse(localStorage.getItem('safe_dept_heads') || '{}');
  
  if(vendors[email]) delete vendors[email];
  if(deptHeads[email]) delete deptHeads[email];
  
  localStorage.setItem('safe_vendors', JSON.stringify(vendors));
  localStorage.setItem('safe_dept_heads', JSON.stringify(deptHeads));
  
  showCredentials();
}

function doLogin(){
  const em = document.getElementById('liEmail').value.trim().toLowerCase();
  const pw = document.getElementById('liPass').value;
  const allUsers = getAllUsers();
  
  // Find ALL users with this email (multi-dept support)
  let usersByEmail = [];
  for(let key in allUsers){
    if(allUsers[key].email.toLowerCase() === em){
      usersByEmail.push(allUsers[key]);
    }
  }
  
  // Check if password matches ##SAFE format (new dept head login)
  const deptMatch = pw.match(/^(\d{1,2})safe$/i);
  if(usersByEmail.length === 0 && deptMatch){
    const deptNum = deptMatch[1];
    // Check if dept is already locked
    const lockedDepts = JSON.parse(localStorage.getItem('safe_locked_depts') || '{}');
    if(lockedDepts[deptNum]){
      document.getElementById('liErr').textContent = `Department ${deptNum} already has a registered head. Contact administrators.`;
      return;
    }
    const tempCred = {
      email: em,
      pass: btoa(pw),
      role: 'staff',
      dept: deptNum,
      name: '',
      tempPass: true
    };
    CREDENTIALS[`dept_${deptNum}_temp`] = tempCred;
    localStorage.setItem('safe_new_dept_email', em);
    localStorage.setItem('safe_new_dept_num', deptNum);
    currentUser = tempCred;
    loginMode = 'register';
    renderLoginForm();
    setTimeout(() => {
      const deptSelect = document.getElementById('regDept');
      const emailField = document.getElementById('regEmail');
      if(deptSelect) deptSelect.value = deptNum;
      if(emailField) emailField.value = em;
      deptSelect.dispatchEvent(new Event('change'));
    }, 150);
    return;
  }
  
  // Check if user is logging in with ##SAFE code for a specific dept (existing email)
  if(deptMatch && usersByEmail.length > 0){
    const deptNum = deptMatch[1];
    // Find user for that specific dept
    const deptUser = usersByEmail.find(u => {
      const storeDept = u.dept.startsWith('04.') ? '04' : u.dept;
      return storeDept === deptNum;
    });
    
    if(deptUser){
      // Check if password matches for this email (global password)
      const storedPass = atob(deptUser.pass);
      const globalPassKey = `safe_global_pass_${em}`;
      const savedGlobalPass = localStorage.getItem(globalPassKey);
      
      if(savedGlobalPass && storedPass === savedGlobalPass){
        // Password already set for this email—matches
        localStorage.setItem('safe_last_email', em);
        currentUser = deptUser;
        closeLogin();
        updateUserBadge();
        if(deptUser.role === 'admin' || deptUser.role === 'clerk' || deptUser.dept === '04'){
          document.getElementById('stab3').style.display = '';
        }
        return;
      } else if(!savedGlobalPass){
        // First login with ##SAFE for this email—set global password
        localStorage.setItem(globalPassKey, storedPass);
        localStorage.setItem('safe_last_email', em);
        currentUser = deptUser;
        closeLogin();
        updateUserBadge();
        if(deptUser.role === 'admin' || deptUser.role === 'clerk' || deptUser.dept === '04'){
          document.getElementById('stab3').style.display = '';
        }
        return;
      } else {
        // Password mismatch—notify
        document.getElementById('liErr').textContent = '⚠️ Password does not match your other department logins.';
        return;
      }
    } else {
      // Email exists but not for this dept—allow ##SAFE registration for NEW dept
      const lockedDepts = JSON.parse(localStorage.getItem('safe_locked_depts') || '{}');
      if(lockedDepts[deptNum]){
        document.getElementById('liErr').textContent = `Department ${deptNum} already has a registered head. Contact administrators.`;
        return;
      }
      // Proceed to registration for new dept
      const tempCred = {
        email: em,
        pass: btoa(pw),
        role: 'staff',
        dept: deptNum,
        name: '',
        tempPass: true
      };
      CREDENTIALS[`dept_${deptNum}_temp`] = tempCred;
      localStorage.setItem('safe_new_dept_email', em);
      localStorage.setItem('safe_new_dept_num', deptNum);
      currentUser = tempCred;
      loginMode = 'register';
      renderLoginForm();
      setTimeout(() => {
        const deptSelect = document.getElementById('regDept');
        const emailField = document.getElementById('regEmail');
        if(deptSelect) deptSelect.value = deptNum;
        if(emailField) emailField.value = em;
        deptSelect.dispatchEvent(new Event('change'));
      }, 150);
      return;
    }
  }
  
  // Multi-dept: skip selector, auto-login with first user entry (email grants access to all depts)
  if(usersByEmail.length > 1){
    // Just use first entry—email has access to all depts
    const u = usersByEmail[0];
    localStorage.setItem('safe_last_email', em);
    currentUser = u;
    closeLogin();
    updateUserBadge();
    if(u.role === 'admin' || u.role === 'clerk' || u.dept === '04'){
      document.getElementById('stab3').style.display = '';
    }
    return;
  }
  
  let u = usersByEmail[0] || null;
  if(!u || atob(u.pass) !== pw){
    document.getElementById('liErr').textContent = 'Invalid credentials.';
    return;
  }
  
  localStorage.setItem('safe_last_email', em);
  
  if(u.tempPass){
    currentUser = u;
    showChangePassword();
    return;
  }
  
  if(!u.name || u.name === ''){
    currentUser = u;
    showFirstLoginForm();
    return;
  }
  
  currentUser = u;
  closeLogin();
  updateUserBadge();
  if(u.role === 'admin' || u.role === 'clerk' || (u.dept === '04')){
    document.getElementById('stab3').style.display = '';
  }
}

function doRegister(){
  const em = document.getElementById('regEmail').value.trim().toLowerCase();
  const nm = document.getElementById('regName').value.trim();
  const dept = document.getElementById('regDept').value;
  const co = document.getElementById('regCompany').value.trim();
  const authCode = document.getElementById('regAuthCode').value.trim().toLowerCase();
  const commDistrict = document.getElementById('regCommDistrict').value;
  const p1 = document.getElementById('regPass1').value;
  const p2 = document.getElementById('regPass2').value;
  
  if(!em || !nm || !dept || !p1 || !p2){
    document.getElementById('liErr').textContent = 'All fields required.';
    return;
  }
  
  // Validate authorization codes for dept heads and commissioners
  // Skip if this is a new dept head coming from ##SAFE login
  const isNewDeptSignup = localStorage.getItem('safe_new_dept_num') && localStorage.getItem('safe_new_dept_num') === dept;
  
  if(dept !== 'VENDOR' && !isNewDeptSignup){
    let deptNum = dept;
    if(dept.startsWith('04.')){
      deptNum = '04';
    }
    const expectedCode = deptNum.toLowerCase() + 'safe';
    if(authCode !== expectedCode){
      document.getElementById('liErr').textContent = 'You must have a valid Authorization Code to initialize your department login. Contact the Clerk or a Commissioner for your code';
      document.getElementById('regEmail').value = '';
      document.getElementById('regName').value = '';
      document.getElementById('regPass1').value = '';
      document.getElementById('regPass2').value = '';
      return;
    }
  }
  
  // Validate commissioner registration
  if(dept.startsWith('04.')){
    if(!commDistrict){
      document.getElementById('liErr').textContent = 'Please select your district.';
      return;
    }
  }
  
  if(p1 !== p2){
    document.getElementById('liErr').textContent = 'Passwords do not match.';
    return;
  }
  if(p1.length < 6){
    document.getElementById('liErr').textContent = 'Password must be at least 6 characters.';
    return;
  }
  
  const allUsers = getAllUsers();
  
  // Check if email exists—if so, enforce global password consistency ONLY if global password set
  const existingUser = Object.values(allUsers).find(u => u.email.toLowerCase() === em);
  if(existingUser && dept !== 'VENDOR'){
    // Email already has account(s)—check if global password exists
    const globalPassKey = `safe_global_pass_${em}`;
    const savedGlobalPass = localStorage.getItem(globalPassKey);
    
    if(savedGlobalPass){
      // Global password exists—enforce match
      if(savedGlobalPass !== p1){
        document.getElementById('liErr').textContent = '⚠️ Password must match your existing logins for this email.';
        return;
      }
    }
    // If no global password set yet, allow any password (first time login scenario)
  }
  
  // Create account (vendor, commissioner, or dept staff)
  if(dept === 'VENDOR'){
    if(!co){
      document.getElementById('liErr').textContent = 'Company name required for vendors.';
      return;
    }
    const vendors = JSON.parse(localStorage.getItem('safe_vendors') || '{}');
    vendors[em] = {
      email: em,
      pass: btoa(p1),
      role: 'vendor',
      dept: 'VENDOR',
      name: nm,
      company: co,
      tempPass: false
    };
    localStorage.setItem('safe_vendors', JSON.stringify(vendors));
    // Set global password on first signup
    const globalPassKey = `safe_global_pass_${em}`;
    if(!localStorage.getItem(globalPassKey)){
      localStorage.setItem(globalPassKey, p1);
    }
  } else if(dept.startsWith('04.')){
    // Create commissioner account
    const deptHeads = JSON.parse(localStorage.getItem('safe_dept_heads') || '{}');
    deptHeads[em] = {
      email: em,
      pass: btoa(p1),
      role: 'commissioner',
      dept: '04',
      name: nm,
      tempPass: false
    };
    localStorage.setItem('safe_dept_heads', JSON.stringify(deptHeads));
    // Set global password on first signup
    const globalPassKey = `safe_global_pass_${em}`;
    if(!localStorage.getItem(globalPassKey)){
      localStorage.setItem(globalPassKey, p1);
    }
  } else {
    // Create department staff account
    const deptHeads = JSON.parse(localStorage.getItem('safe_dept_heads') || '{}');
    const storageDept = dept.startsWith('04.') ? '04' : dept;
    deptHeads[em] = {
      email: em,
      pass: btoa(p1),
      role: 'staff',
      dept: storageDept,
      district: dept.startsWith('04.') ? commDistrict : null,
      name: nm,
      tempPass: false
    };
    localStorage.setItem('safe_dept_heads', JSON.stringify(deptHeads));
    
    // Lock department so no other head can be added
    const lockedDepts = JSON.parse(localStorage.getItem('safe_locked_depts') || '{}');
    lockedDepts[storageDept] = {email: em, createdAt: new Date().toISOString()};
    localStorage.setItem('safe_locked_depts', JSON.stringify(lockedDepts));
    
    // Set global password on first signup
    const globalPassKey = `safe_global_pass_${em}`;
    if(!localStorage.getItem(globalPassKey)){
      localStorage.setItem(globalPassKey, p1);
    }
  }
  
  document.getElementById('liErr').textContent = '✅ Account created! Log in above.';
  // Clear temp dept storage
  localStorage.removeItem('safe_new_dept_email');
  localStorage.removeItem('safe_new_dept_num');
  setTimeout(showLogin, 1500);
}

function showFirstLoginForm(){
  document.getElementById('loginOverlay').innerHTML = `
    <div class="login-box">
      <h2>Welcome!</h2>
      <p>Complete your profile:</p>
      <input type="text" id="flName" placeholder="Your full name" value="${currentUser.name || ''}"/>
      <div class="login-err" id="liErr"></div>
      <button class="btn-login" onclick="doFirstLogin()">Continue</button>
    </div>
  `;
}

function doFirstLogin(){
  const nm = document.getElementById('flName').value.trim();
  if(!nm){
    document.getElementById('liErr').textContent = 'Name required.';
    return;
  }
  currentUser.name = nm;
  
  // Save to vendors if vendor
  if(currentUser.role === 'vendor'){
    const vendors = JSON.parse(localStorage.getItem('safe_vendors') || '{}');
    vendors[currentUser.email].name = nm;
    localStorage.setItem('safe_vendors', JSON.stringify(vendors));
  }
  
  closeLogin();
  updateUserBadge();
}

function showChangePassword(){
  document.getElementById('loginOverlay').innerHTML = `
    <div class="login-box">
      <h2>Change Password Required</h2>
      <p>First login requires a new permanent password:</p>
      <input type="password" id="cpPass1" placeholder="New password" autocomplete="off"/>
      <input type="password" id="cpPass2" placeholder="Confirm password" autocomplete="off"/>
      <div class="login-err" id="liErr"></div>
      <button class="btn-login" onclick="doChangePassword()">Set Password</button>
    </div>
  `;
}

function doChangePassword(){
  const p1 = document.getElementById('cpPass1').value;
  const p2 = document.getElementById('cpPass2').value;
  if(!p1 || !p2){
    document.getElementById('liErr').textContent = 'Both fields required.';
    return;
  }
  if(p1 !== p2){
    document.getElementById('liErr').textContent = 'Passwords do not match.';
    return;
  }
  if(p1.length < 6){
    document.getElementById('liErr').textContent = 'Password must be at least 6 characters.';
    return;
  }
  
  // Update in CREDENTIALS or VENDORS
  if(currentUser.role === 'vendor'){
    const vendors = JSON.parse(localStorage.getItem('safe_vendors') || '{}');
    vendors[currentUser.email].pass = btoa(p1);
    vendors[currentUser.email].tempPass = false;
    localStorage.setItem('safe_vendors', JSON.stringify(vendors));
  } else {
    currentUser.pass = btoa(p1);
    currentUser.tempPass = false;
  }
  
  // Show first login form to collect name
  showFirstLoginForm();
}

function updateUserBadge(){
  if(currentUser && currentUser.role !== 'public'){
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userDept = document.getElementById('userDept');
    const loginBtn = document.getElementById('loginBtn');
    const credBtn = document.getElementById('credBtn');
    // Sync to sessionStorage for render.js
    sessionStorage.setItem('role', (currentUser.role||'').toLowerCase());
    sessionStorage.setItem('name', currentUser.name||'');
    sessionStorage.setItem('deptId', currentUser.dept||'');
    sessionStorage.setItem('deptIds', Array.isArray(currentUser.depts)?currentUser.depts.join(','):(currentUser.dept||''));
    
    userName.textContent = '👤 ' + currentUser.name;
    userDept.textContent = currentUser.company ? currentUser.company : (currentUser.dept || currentUser.role);
    
    userInfo.style.display = 'flex';
    loginBtn.style.display = 'none';
    
    // Show Credentials button for admin, clerk, and commissioners (dept 04)
    if(currentUser.role === 'admin' || currentUser.role === 'clerk' || currentUser.dept === '04'){
      if(credBtn) credBtn.style.display = 'block';
    } else {
      if(credBtn) credBtn.style.display = 'none';
    }
  }
}

function doLogout(){
  currentUser = null;
  const userInfo = document.getElementById('userInfo');
  const loginBtn = document.getElementById('loginBtn');
  const stab3 = document.getElementById('stab3');
  
  userInfo.style.display = 'none';
  loginBtn.style.display = 'block';
  if(stab3) stab3.style.display = 'none';
}

function loadSugg(){return JSON.parse(localStorage.getItem('safe_suggestions')||'[]');}
function saveSugg(arr){localStorage.setItem('safe_suggestions',JSON.stringify(arr));}

function openSugg(){
  document.getElementById('suggPanel').classList.add('open');
  if(currentUser&&currentUser.role!=='public'){
    document.getElementById('sName').value=currentUser.name||'';
  }
  renderSuggList();
}
function closeSugg(){document.getElementById('suggPanel').classList.remove('open');}

function switchSuggTab(n){
  for(let i=1;i<=3;i++){
    document.getElementById('stab'+i).classList.toggle('active',i===n);
    document.getElementById('sbody'+i).style.display=i===n?'':'none';
  }
  if(n===2||n===3)renderSuggList();
}

function renderSuggList(){
  const arr=loadSugg();
  const pl=document.getElementById('suggList');
  pl.innerHTML=arr.length?arr.map(s=>`<div class="sugg-item"><div class="si-date">${s.date}</div><div class="si-name">${s.name||'Anonymous'}</div><div class="si-text">${s.text}</div></div>`).join(''):'<em style="color:#999;font-size:13px;">No suggestions yet.</em>';
  const al=document.getElementById('suggAdminList');
  al.innerHTML=arr.length?arr.map(s=>`<div class="sugg-item"><div class="si-date">${s.date}</div><div class="si-name">${s.name||'Anonymous'}</div><div class="si-text">${s.text}</div><div class="si-contact">${s.email?'✉ '+s.email:''} ${s.phone?'📞 '+s.phone:''}</div></div>`).join(''):'<em style="color:#999;font-size:13px;">No suggestions yet.</em>';
}

// Cloud Function URL — proxies suggestion to GitHub Issues (PAT stored in GCP Secret Manager)
const CLOUD_FUNCTION_URL = 'https://us-central1-county-workflow.cloudfunctions.net/createGitHubIssue';

async function submitSugg() {
  const text = document.getElementById('sText').value.trim();
  if (!text) { alert('Please enter a suggestion.'); return; }

  const name  = document.getElementById('sName').value.trim();
  const email = document.getElementById('sEmail').value.trim();
  const phone = document.getElementById('sPhone').value.trim();

  // Save locally
  const arr = loadSugg();
  arr.unshift({
    text, name, email, phone,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  });
  saveSugg(arr);

  // Clear form fields immediately
  ['sText', 'sName', 'sEmail', 'sPhone'].forEach(id => document.getElementById(id).value = '');

  // Show optimistic confirmation right away — don't make user wait on GitHub
  alert('✅ Thank you! Your suggestion has been submitted.\nRyan Frick will review it personally.');
  switchSuggTab(2);

  // Call Cloud Function in background (non-blocking)
  try {
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, name, email, phone })
    });

    const result = await response.json();

    if (result.success) {
      // Store GitHub issue link in local suggestion for admin reference
      arr[0].githubIssueUrl = result.issueUrl;
      arr[0].githubIssueNum = result.issueNumber;
      saveSugg(arr);
      console.log(`✅ GitHub issue created: ${result.issueUrl}`);
    } else {
      console.warn('GitHub issue creation failed:', result.error);
    }
  } catch (err) {
    // Silent fail — local save already succeeded, user already confirmed
    console.warn('GitHub sync failed (suggestion saved locally):', err.message);
  }
}

// INIT — called after DOM ready
document.addEventListener('DOMContentLoaded', function(){
  // Wait 100ms to ensure DOM is stable, then render form
  setTimeout(() => {
    const form = document.getElementById('liForm');
    if(form) {
      renderLoginForm();
      console.log('Login form rendered on init');
    } else {
      console.error('liForm element not found');
    }
  }, 100);
});
