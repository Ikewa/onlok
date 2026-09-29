const QRCode = require('qrcode');
const logger = require('./logger');

/**
 * Generates a QR Code for a given URL Data
 * @param {string} url - The URL to encode
 * @returns {Promise<string>} - Base64 Image string of the QR Code
 */
const generateQRCode = async (url) => {
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(url);
        return qrCodeDataUrl;
    } catch (err) {
        logger.error('QR code generation failed', { error: err, type: 'qrcode' });
        throw new Error('Failed to generate QR code');
    }
};

module.exports = { generateQRCode };
