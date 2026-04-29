// S.A.F.E. Credentials - Encrypted Passwords
// Passwords stored as base64 (btoa) - use atob() to decode in login.js

const CREDENTIALS = {
  admin: {
    email: 'admin',
    pass: btoa('123454321'),
    role: 'admin',
    name: 'Admin',
    tempPass: false
  }
};
