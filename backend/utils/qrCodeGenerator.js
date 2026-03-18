const QRCode = require('qrcode');

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
        console.error('Error generating QR code:', err);
        throw new Error('Failed to generate QR code');
    }
};

module.exports = { generateQRCode };
