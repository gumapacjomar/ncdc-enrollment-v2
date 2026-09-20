// Dynamic Uploads URL — local vs production
export const UPLOADS_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/uploads'
    : 'https://ncdcenrollment.bscs4a.com/uploads';

export default UPLOADS_URL;