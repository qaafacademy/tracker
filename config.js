/* Qaaf Tracker – settings for this website.
 * Fill in the two values below (see the setup guide, steps 3 and 5). */
window.QAAF_CONFIG = {
  // Web app URL from Apps Script → Deploy → Manage deployments (ends with /exec)
  apiUrl: 'https://qaafacademy.github.io/tracker/',

  // OAuth Client ID from Google Cloud (ends with .apps.googleusercontent.com)
  googleClientId: '687957032488-j3oscp0h4l3lc6p3b6ce0uqgoh0m7cv6.apps.googleusercontent.com'
};
if (/^PASTE_/.test(window.QAAF_CONFIG.apiUrl)) window.QAAF_CONFIG.apiUrl = '';
if (/^PASTE_/.test(window.QAAF_CONFIG.googleClientId)) window.QAAF_CONFIG.googleClientId = '';
