const GhostAdminAPI = require('@tryghost/admin-api');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const api = new GhostAdminAPI({
    url: 'https://insights.onav.com.br',
    key: process.env.GHOST_ADMIN_KEY,
    version: 'v5.0'
});

async function uploadImage() {
    try {
        console.log('📸 Uploading image to Ghost...\n');

        const imagePath = path.join(__dirname, '../img/insights/vp.webp');
        const imageBuffer = fs.readFileSync(imagePath);

        // Create a file object
        const imageFile = {
            file: imageBuffer,
            name: 'virtual-production-led-wall.webp',
            purpose: 'image'
        };

        // Upload to Ghost
        const result = await api.images.upload(imageFile);

        console.log('✅ Image uploaded successfully!');
        console.log(`📍 URL: ${result.url}\n`);
        console.log('Copy this URL and use it in the upload-to-ghost.js file for feature_image');

        return result.url;

    } catch (error) {
        console.error('❌ Error uploading image:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

uploadImage();
