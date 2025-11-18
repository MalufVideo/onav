const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Parse the Ghost Admin API key
const [id, secret] = process.env.GHOST_ADMIN_KEY.split(':');

// Create JWT token for authentication
function createToken() {
    const token = jwt.sign(
        {},
        Buffer.from(secret, 'hex'),
        {
            keyid: id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/admin/'
        }
    );
    return token;
}

async function uploadImageAndUpdatePost() {
    try {
        console.log('🚀 Starting image upload process...\n');

        const baseUrl = 'https://insights.onav.com.br';
        const token = createToken();

        // Step 1: Upload image
        console.log('📸 Uploading image to Ghost...');

        const imagePath = path.resolve(__dirname, '../img/insights/vp.webp');
        const form = new FormData();
        form.append('file', fs.createReadStream(imagePath), {
            filename: 'virtual-production-led-wall.webp',
            contentType: 'image/webp'
        });

        const uploadResponse = await axios.post(
            `${baseUrl}/ghost/api/admin/images/upload`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Ghost ${token}`
                }
            }
        );

        const imageUrl = uploadResponse.data.images[0].url;
        console.log(`✅ Image uploaded: ${imageUrl}\n`);

        // Step 2: Update the post with feature image
        const postId = '68e3303b06971800013c627c';
        console.log('📝 Updating article with feature image...');

        // Get current post
        const getResponse = await axios.get(
            `${baseUrl}/ghost/api/admin/posts/${postId}`,
            {
                headers: {
                    'Authorization': `Ghost ${createToken()}`
                }
            }
        );

        const currentPost = getResponse.data.posts[0];

        // Update post with feature image
        const updateResponse = await axios.put(
            `${baseUrl}/ghost/api/admin/posts/${postId}`,
            {
                posts: [{
                    id: postId,
                    updated_at: currentPost.updated_at,
                    feature_image: imageUrl
                }]
            },
            {
                headers: {
                    'Authorization': `Ghost ${createToken()}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Article updated successfully!\n');
        console.log('🎉 Done! Your article now has a feature image.');
        console.log(`📍 Image URL: ${imageUrl}`);
        console.log(`📍 View article at: http://ghost-pkocccco88s0wcssk048ks8g.109.123.248.87.sslip.io/p/8c96eaf4-2e96-4b4a-92f4-ef87919952c8/`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

uploadImageAndUpdatePost();
