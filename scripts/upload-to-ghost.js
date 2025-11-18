const GhostAdminAPI = require('@tryghost/admin-api');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Ghost API Configuration
// Get the full Admin API key from your Ghost settings
const GHOST_ADMIN_KEY = process.env.GHOST_ADMIN_KEY || '68e3039b9df5110017dafdc:7b878af35f31ec409d44c0d91c12a8a18ee79707';

const api = new GhostAdminAPI({
    url: 'https://insights.onav.com.br',
    key: GHOST_ADMIN_KEY,
    version: 'v5.0'
});

// Article configurations
const articles = [
    {
        file: '../articles/article1-virtual-production.md',
        title: 'O Futuro da Produção Audiovisual: Como a Produção Virtual Está Revolucionando a Indústria',
        slug: 'futuro-producao-virtual-revolucao-audiovisual',
        tags: ['Produção Virtual', 'LED Walls', 'Tecnologia', 'Cinema', 'Inovação'],
        featured: true,
        excerpt: 'Descubra como a produção virtual está transformando a indústria audiovisual, combinando LED walls, tracking em tempo real e motores gráficos para criar possibilidades ilimitadas.',
        meta_description: 'Guia completo sobre produção virtual: tecnologias, vantagens, aplicações práticas e o futuro da criação de conteúdo audiovisual com LED walls e tracking em tempo real.',
        feature_image: '../img/insights/vp.webp' // Local path - will be uploaded to Ghost
    },
    {
        file: '../articles/article2-led-walls-guide.md',
        title: 'Guia Completo de LED Walls para Produção Virtual: Tudo o Que Você Precisa Saber',
        slug: 'guia-completo-led-walls-producao-virtual',
        tags: ['LED Walls', 'Produção Virtual', 'Guia Técnico', 'Equipamentos', 'Tutorial'],
        featured: true,
        excerpt: 'Das especificações técnicas ao ROI: um guia completo sobre LED walls para produção virtual, incluindo configurações, processamento, tracking e melhores práticas.',
        meta_description: 'Guia técnico completo de LED walls: especificações, configurações, sistemas de processamento, tracking de câmera, otimização e análise de custo-benefício.',
        feature_image: null // Add image URL if you have one
    }
];

async function uploadArticles() {
    console.log('🚀 Starting Ghost upload process...\n');

    for (const article of articles) {
        try {
            console.log(`📝 Processing: ${article.title}`);

            // Read markdown file
            const filePath = path.join(__dirname, article.file);
            const content = await fs.readFile(filePath, 'utf-8');

            // Convert markdown to Ghost's mobiledoc format
            const mobiledoc = convertMarkdownToMobiledoc(content);

            // Prepare post data
            const postData = {
                title: article.title,
                slug: article.slug,
                mobiledoc: mobiledoc,
                tags: article.tags.map(tag => ({ name: tag })),
                featured: article.featured,
                status: 'draft', // Change to 'published' when ready
                excerpt: article.excerpt,
                meta_description: article.meta_description,
                meta_title: article.title,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (article.feature_image) {
                postData.feature_image = article.feature_image;
            }

            // Upload to Ghost
            const result = await api.posts.add(postData, { source: 'html' });

            console.log(`✅ Successfully uploaded: ${article.title}`);
            console.log(`   📍 URL: ${result.url}`);
            console.log(`   🔑 ID: ${result.id}`);
            console.log(`   📊 Status: ${result.status}\n`);

        } catch (error) {
            console.error(`❌ Error uploading "${article.title}":`, error.message);
            if (error.response) {
                console.error('   Response:', error.response.data);
            }
            console.log('');
        }
    }

    console.log('🎉 Upload process completed!');
}

// Simple markdown to mobiledoc converter
// For production, consider using @tryghost/mobiledoc-kit or similar
function convertMarkdownToMobiledoc(markdown) {
    // Convert markdown to HTML first (simple conversion)
    let html = markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold and italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Code blocks
        .replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        // Lists
        .replace(/^\* (.+)$/gim, '<li>$1</li>')
        .replace(/^- (.+)$/gim, '<li>$1</li>')
        .replace(/^\d+\. (.+)$/gim, '<li>$1</li>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    // Wrap in paragraphs if not already wrapped
    if (!html.startsWith('<')) {
        html = `<p>${html}</p>`;
    }

    // Create basic mobiledoc structure
    const mobiledoc = {
        version: '0.3.1',
        atoms: [],
        cards: [['html', { html: html }]],
        markups: [],
        sections: [[10, 0]]
    };

    return JSON.stringify(mobiledoc);
}

// Helper function to upload image
async function uploadImage(imagePath) {
    try {
        const fsSync = require('fs');
        const imageBuffer = fsSync.readFileSync(path.join(__dirname, imagePath));

        const result = await api.images.upload({
            file: imageBuffer,
            name: path.basename(imagePath)
        });

        console.log(`   📸 Image uploaded: ${result.url}`);
        return result.url;
    } catch (error) {
        console.error(`   ⚠️  Image upload failed: ${error.message}`);
        return null;
    }
}

// Alternative: Use html directly (Ghost supports source: 'html')
async function uploadArticlesHTML() {
    console.log('🚀 Starting Ghost upload process (HTML mode)...\n');

    for (const article of articles) {
        try {
            console.log(`📝 Processing: ${article.title}`);

            // Read markdown file
            const filePath = path.join(__dirname, article.file);
            const markdown = await fs.readFile(filePath, 'utf-8');

            // Convert markdown to HTML (simple conversion)
            const html = convertMarkdownToHTML(markdown);

            // Upload feature image if provided
            let featureImageUrl = null;
            if (article.feature_image) {
                featureImageUrl = await uploadImage(article.feature_image);
            }

            // Prepare post data
            const postData = {
                title: article.title,
                slug: article.slug,
                html: html,
                tags: article.tags.map(tag => ({ name: tag })),
                featured: article.featured,
                status: 'draft', // Change to 'published' when ready
                excerpt: article.excerpt,
                meta_description: article.meta_description,
                meta_title: article.title
            };

            if (featureImageUrl) {
                postData.feature_image = featureImageUrl;
            }

            // Upload to Ghost
            const result = await api.posts.add(postData, { source: 'html' });

            console.log(`✅ Successfully uploaded: ${article.title}`);
            console.log(`   📍 URL: ${result.url}`);
            console.log(`   🔑 ID: ${result.id}`);
            console.log(`   📊 Status: ${result.status}\n`);

        } catch (error) {
            console.error(`❌ Error uploading "${article.title}":`, error.message);
            if (error.response && error.response.data) {
                console.error('   Response:', JSON.stringify(error.response.data, null, 2));
            }
            console.log('');
        }
    }

    console.log('🎉 Upload process completed!');
}

function convertMarkdownToHTML(markdown) {
    let html = markdown
        // Code blocks (must be before other replacements)
        .replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre><code class="language-$1">$2</code></pre>')

        // Headers
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')

        // Bold and italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')

        // Inline code
        .replace(/`(.+?)`/g, '<code>$1</code>')

        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

        // Horizontal rules
        .replace(/^---$/gim, '<hr>')

        // Convert lists
        .replace(/^\* (.+)$/gim, '<li>$1</li>')
        .replace(/^- (.+)$/gim, '<li>$1</li>')
        .replace(/^\d+\. (.+)$/gim, '<li>$1</li>')

        // Wrap consecutive list items in ul
        .replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`)

        // Paragraphs
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    // Wrap in paragraphs
    html = `<p>${html}</p>`;

    // Clean up
    html = html
        .replace(/<p><h/g, '<h')
        .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
        .replace(/<p><ul>/g, '<ul>')
        .replace(/<\/ul><\/p>/g, '</ul>')
        .replace(/<p><pre>/g, '<pre>')
        .replace(/<\/pre><\/p>/g, '</pre>')
        .replace(/<p><hr><\/p>/g, '<hr>')
        .replace(/<p><\/p>/g, '')
        .replace(/<br><\/p>/g, '</p>');

    return html;
}

// Run the upload
uploadArticlesHTML().catch(console.error);
