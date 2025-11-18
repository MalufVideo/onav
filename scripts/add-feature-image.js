const GhostAdminAPI = require('@tryghost/admin-api');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const api = new GhostAdminAPI({
    url: 'https://insights.onav.com.br',
    key: process.env.GHOST_ADMIN_KEY,
    version: 'v5.0'
});

async function addFeatureImage() {
    try {
        console.log('🚀 Adding feature image to article...\n');

        // Step 1: Upload the image using absolute path
        console.log('📸 Uploading image to Ghost...');
        const imagePath = path.resolve(__dirname, '../img/insights/vp.webp');

        // Read file as buffer
        const imageBuffer = fs.readFileSync(imagePath);

        // Create file object with buffer
        const imageResult = await api.images.upload({
            file: imageBuffer,
            name: 'virtual-production-led-wall.webp'
        });

        console.log(`✅ Image uploaded: ${imageResult.url}\n`);

        // Step 2: Update the first article with the image
        const postId = '68e3303b06971800013c627c'; // Updated ID from latest upload

        console.log('📝 Updating article with feature image...');

        // First, get the current post to get the updated_at timestamp
        const currentPost = await api.posts.read({id: postId});

        await api.posts.edit({
            id: postId,
            updated_at: currentPost.updated_at,
            feature_image: imageResult.url
        });

        console.log('✅ Article updated successfully!\n');
        console.log('🎉 Done! Your article now has a feature image.');
        console.log(`📍 View it at: http://ghost-pkocccco88s0wcssk048ks8g.109.123.248.87.sslip.io/p/8c96eaf4-2e96-4b4a-92f4-ef87919952c8/`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
        if (error.context) {
            console.error('Context:', error.context);
        }
    }
}

addFeatureImage();
