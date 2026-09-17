/* Qaaf Tracker – settings for this website.
 * Fill in the two values below (see the setup guide, steps 3 and 5). */
window.QAAF_CONFIG = {
  // Web app URL from Apps Script → Deploy → Manage deployments (ends with /exec)
  apiUrl: 'PASTE_WEB_APP_URL_HERE',

  // OAuth Client ID from Google Cloud (ends with .apps.googleusercontent.com)
  googleClientId: 'PASTE_CLIENT_ID_HERE'
};
if (/^PASTE_/.test(window.QAAF_CONFIG.apiUrl)) window.QAAF_CONFIG.apiUrl = '';
if (/^PASTE_/.test(window.QAAF_CONFIG.googleClientId)) window.QAAF_CONFIG.googleClientId = '';
