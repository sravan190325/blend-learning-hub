const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PassThrough } = require('stream');

/**
 * Certificate Generation Module for Blend Learning Portal
 * Handles dynamic PDF certificate creation with branding
 */

const CERTIFICATES_DIR = process.env.CERTIFICATES_DIR
  || path.join(process.env.DATA_DIR || __dirname, 'certificates');
const PORTAL_NAME = 'Blend Learning Portal';
const FOOTER_TEXT = 'Powered by Global PM Team';

// Ensure certificates directory exists
if (!fs.existsSync(CERTIFICATES_DIR)) {
  fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });
}

/**
 * Generate a unique certificate ID
 */
function generateCertificateId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

/**
 * Generate a PDF certificate
 * @param {Object} params - Certificate parameters
 * @param {string} params.userName - User's full name
 * @param {string} params.trackName - Learning track name
 * @param {Date} params.completionDate - Date of completion
 * @param {string} params.certificateId - Unique certificate ID
 * @param {string} params.trackLevel - Track level (foundation, advanced, enterprise)
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateCertificatePDF(params) {
  return new Promise((resolve, reject) => {
    try {
      const {
        userName = 'Learner',
        trackName = 'Learning Track',
        completionDate = new Date(),
        certificateId = generateCertificateId(),
        trackLevel = 'foundation'
      } = params;

      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true
      });

      // Collect PDF into buffer
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);

      // Define colors based on track level
      const colors = {
        foundation: { primary: '#053057', accent: '#00EDED', light: '#A2F3F3' },
        advanced: { primary: '#1a3a6b', accent: '#00EDED', light: '#E8F4FF' },
        enterprise: { primary: '#3a0a5c', accent: '#c084fc', light: '#F3EEFF' }
      };
      const theme = colors[trackLevel] || colors.foundation;

      // Set up fonts
      doc.font('Helvetica');

      // Background decorative elements
      doc.save();
      
      // Top decorative bar
      doc.rect(0, 0, doc.page.width, 80)
        .fillAndStroke(theme.primary, theme.primary);

      // Bottom decorative bar
      doc.rect(0, doc.page.height - 60, doc.page.width, 60)
        .fillAndStroke(theme.light, theme.light);

      doc.restore();

      // Top decorative element - Certificate icon/badge
      doc.fontSize(48);
      doc.fillColor(theme.light);
      doc.text('★', 50, 20, { align: 'center', width: doc.page.width - 100 });

      // Portal branding
      doc.fontSize(10);
      doc.fillColor('#FFFFFF');
      doc.text(PORTAL_NAME, 50, 50, { align: 'center', width: doc.page.width - 100 });

      // Title
      doc.moveDown(3);
      doc.fontSize(32);
      doc.fillColor(theme.primary);
      doc.font('Helvetica-Bold');
      doc.text('Certificate of Completion', { align: 'center' });

      // Decorative line
      doc.moveDown(1);
      doc.strokeColor(theme.accent);
      doc.lineWidth(2);
      const lineY = doc.y;
      doc.moveTo(150, lineY)
        .lineTo(doc.page.width - 150, lineY)
        .stroke();

      // Main content section
      doc.moveDown(2);
      doc.font('Helvetica');
      doc.fontSize(12);
      doc.fillColor(theme.primary);

      // Completion statement
      doc.text('This is to certify that', { align: 'center' });
      
      // User name - prominent display
      doc.moveDown(0.5);
      doc.fontSize(24);
      doc.font('Helvetica-Bold');
      doc.fillColor(theme.primary);
      doc.text(userName.toUpperCase(), { align: 'center' });

      // Rest of completion statement
      doc.moveDown(0.8);
      doc.fontSize(12);
      doc.font('Helvetica');
      doc.fillColor(theme.primary);
      const completionText = `has successfully completed the`;
      doc.text(completionText, { align: 'center' });

      // Track name - emphasized
      doc.moveDown(0.3);
      doc.fontSize(16);
      doc.font('Helvetica-Bold');
      doc.fillColor(theme.accent);
      doc.text(trackName, { align: 'center' });

      // End of statement
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.font('Helvetica');
      doc.fillColor(theme.primary);
      doc.text('learning track', { align: 'center' });

      // Metadata section
      doc.moveDown(2);
      doc.fontSize(10);
      doc.fillColor(theme.primary);

      const completionDateStr = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(completionDate);

      // Two column layout for metadata
      const leftCol = 100;
      const rightCol = doc.page.width - 150;
      const metaY = doc.y;

      // Left column - Date
      doc.fontSize(10);
      doc.fillColor(theme.primary);
      doc.text('Date of Completion:', leftCol, metaY);
      doc.fontSize(11);
      doc.font('Helvetica-Bold');
      doc.fillColor(theme.accent);
      doc.text(completionDateStr, leftCol, metaY + 18);

      // Right column - Certificate ID
      doc.fontSize(10);
      doc.fillColor(theme.primary);
      doc.font('Helvetica');
      doc.text('Certificate ID:', rightCol, metaY, { align: 'right' });
      doc.fontSize(11);
      doc.font('Helvetica-Bold');
      doc.fillColor(theme.accent);
      doc.text(certificateId, rightCol, metaY + 18, { align: 'right' });

      // Bottom section
      doc.moveDown(3);
      
      // Signature line
      doc.fontSize(9);
      doc.fillColor(theme.primary);
      doc.lineWidth(1);
      doc.moveTo(100, doc.y)
        .lineTo(200, doc.y)
        .stroke();
      doc.fontSize(9);
      doc.text('Authorized by Blend Learning', 100, doc.y + 3);

      // Footer
      doc.moveDown(1.5);
      doc.fontSize(10);
      doc.fillColor('#FFFFFF');
      doc.font('Helvetica-Bold');
      doc.text(FOOTER_TEXT, 50, doc.page.height - 35, {
        align: 'center',
        width: doc.page.width - 100
      });

      // Certificate validation info
      doc.fontSize(8);
      doc.fillColor(theme.primary);
      doc.text(`Verify at: ${PORTAL_NAME} | ID: ${certificateId}`, 50, doc.page.height - 15, {
        align: 'center',
        width: doc.page.width - 100
      });

      // Finalize PDF
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Save certificate metadata
 */
function saveCertificateMetadata(userId, trackId, certificateData) {
  try {
    const metadataFile = path.join(CERTIFICATES_DIR, `${userId}-${trackId}-metadata.json`);
    fs.writeFileSync(metadataFile, JSON.stringify(certificateData, null, 2));
    return certificateData;
  } catch (error) {
    console.error('Error saving certificate metadata:', error);
    throw error;
  }
}

/**
 * Get or create certificate
 */
function getOrCreateCertificate(userId, trackId, userData, trackData) {
  try {
    const metadataFile = path.join(CERTIFICATES_DIR, `${userId}-${trackId}-metadata.json`);
    
    let certificateData;
    if (fs.existsSync(metadataFile)) {
      certificateData = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
    } else {
      certificateData = {
        userId,
        trackId,
        certificateId: generateCertificateId(),
        userName: userData.name,
        trackName: trackData.title || trackData.name,
        trackLevel: trackData.level || trackId,
        generatedAt: new Date().toISOString(),
        completionDate: new Date().toISOString(),
        downloadCount: 0
      };
      saveCertificateMetadata(userId, trackId, certificateData);
    }

    // Increment download count
    certificateData.downloadCount = (certificateData.downloadCount || 0) + 1;
    certificateData.lastDownloadedAt = new Date().toISOString();
    saveCertificateMetadata(userId, trackId, certificateData);

    return certificateData;
  } catch (error) {
    console.error('Error getting or creating certificate:', error);
    throw error;
  }
}

/**
 * Get certificate metadata
 */
function getCertificateMetadata(userId, trackId) {
  try {
    const metadataFile = path.join(CERTIFICATES_DIR, `${userId}-${trackId}-metadata.json`);
    if (fs.existsSync(metadataFile)) {
      return JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error('Error getting certificate metadata:', error);
    return null;
  }
}

/**
 * Check if user has earned certificate
 */
function hasCertificate(userId, trackId) {
  const metadata = getCertificateMetadata(userId, trackId);
  return metadata !== null;
}

/**
 * Get all certificates for a user
 */
function getUserCertificates(userId) {
  try {
    const files = fs.readdirSync(CERTIFICATES_DIR);
    const userFiles = files.filter(f => f.startsWith(`${userId}-`) && f.endsWith('-metadata.json'));
    
    return userFiles.map(file => {
      try {
        return JSON.parse(fs.readFileSync(path.join(CERTIFICATES_DIR, file), 'utf8'));
      } catch (e) {
        console.error(`Error reading certificate file ${file}:`, e);
        return null;
      }
    }).filter(cert => cert !== null);
  } catch (error) {
    console.error('Error getting user certificates:', error);
    return [];
  }
}

module.exports = {
  generateCertificatePDF,
  saveCertificateMetadata,
  getOrCreateCertificate,
  getCertificateMetadata,
  hasCertificate,
  getUserCertificates,
  generateCertificateId,
  CERTIFICATES_DIR,
  PORTAL_NAME,
  FOOTER_TEXT
};
