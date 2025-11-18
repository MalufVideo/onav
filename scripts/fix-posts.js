const GhostAdminAPI = require('@tryghost/admin-api');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const api = new GhostAdminAPI({
    url: 'https://insights.onav.com.br',
    key: process.env.GHOST_ADMIN_KEY,
    version: 'v5.0'
});

// Better markdown to HTML converter
function convertMarkdownToHTML(markdown) {
    let html = markdown;

    // Remove front matter if exists
    html = html.replace(/^---[\s\S]*?---\n/, '');

    // Code blocks (must be before other replacements)
    html = html.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || ''}">${code.trim()}</code></pre>`;
    });

    // Headers (must be done before paragraphs)
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold and italic (before other inline formatting)
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr>');

    // Lists - unordered
    const unorderedListRegex = /^[\*\-] (.+)$/gim;
    html = html.replace(unorderedListRegex, '<li>$1</li>');

    // Lists - ordered
    const orderedListRegex = /^\d+\. (.+)$/gim;
    html = html.replace(orderedListRegex, '<li>$1</li>');

    // Wrap consecutive list items
    html = html.replace(/(<li>.*?<\/li>\s*)+/gs, (match) => {
        // Check if it's already wrapped
        if (!match.trim().startsWith('<ul>') && !match.trim().startsWith('<ol>')) {
            return `<ul>\n${match}</ul>\n`;
        }
        return match;
    });

    // Split into paragraphs (double line breaks)
    const lines = html.split('\n');
    let inParagraph = false;
    let result = [];
    let currentParagraph = [];

    for (let line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines
        if (!trimmedLine) {
            if (currentParagraph.length > 0) {
                result.push('<p>' + currentParagraph.join(' ') + '</p>');
                currentParagraph = [];
                inParagraph = false;
            }
            continue;
        }

        // Check if line is a block element
        const isBlockElement = /^<(h[1-6]|ul|ol|li|pre|hr|blockquote|div)[\s>]/.test(trimmedLine) ||
                               /^<\/(h[1-6]|ul|ol|li|pre|hr|blockquote|div)>/.test(trimmedLine) ||
                               trimmedLine === '<hr>';

        if (isBlockElement) {
            // Close any open paragraph
            if (currentParagraph.length > 0) {
                result.push('<p>' + currentParagraph.join(' ') + '</p>');
                currentParagraph = [];
                inParagraph = false;
            }
            result.push(trimmedLine);
        } else {
            // Add to current paragraph
            currentParagraph.push(trimmedLine);
            inParagraph = true;
        }
    }

    // Close final paragraph if open
    if (currentParagraph.length > 0) {
        result.push('<p>' + currentParagraph.join(' ') + '</p>');
    }

    html = result.join('\n');

    // Clean up
    html = html
        // Remove empty paragraphs
        .replace(/<p>\s*<\/p>/g, '')
        .replace(/<p>(<h[1-6]>.*?<\/h[1-6]>)<\/p>/g, '$1')
        .replace(/<p>(<ul>[\s\S]*?<\/ul>)<\/p>/g, '$1')
        .replace(/<p>(<ol>[\s\S]*?<\/ol>)<\/p>/g, '$1')
        .replace(/<p>(<pre>[\s\S]*?<\/pre>)<\/p>/g, '$1')
        .replace(/<p><hr><\/p>/g, '<hr>')
        // Fix spacing
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return html;
}

async function fixPosts() {
    console.log('🔧 Fixing Ghost posts...\n');

    const posts = [
        {
            id: '68e3303b06971800013c627c',
            file: '../articles/article1-virtual-production.md'
        },
        {
            id: '68e3303d06971800013c6286',
            file: '../articles/article2-led-walls-guide.md'
        }
    ];

    for (const post of posts) {
        try {
            console.log(`📝 Processing post ID: ${post.id}`);

            // Read markdown file
            const filePath = path.join(__dirname, post.file);
            const markdown = await fs.readFile(filePath, 'utf-8');

            // Convert to HTML
            const html = convertMarkdownToHTML(markdown);

            // Get current post
            const currentPost = await api.posts.read({ id: post.id });

            console.log(`   Current status: ${currentPost.status}`);
            console.log(`   Updating HTML content...`);

            // Update post
            await api.posts.edit({
                id: post.id,
                updated_at: currentPost.updated_at,
                html: html,
                status: 'draft' // Reset to draft for review
            }, { source: 'html' });

            console.log(`   ✅ Updated successfully!\n`);

        } catch (error) {
            console.error(`   ❌ Error: ${error.message}\n`);
            if (error.response) {
                console.error('   Response:', JSON.stringify(error.response.data, null, 2));
            }
        }
    }

    console.log('🎉 All posts updated!');
    console.log('\nPlease review the posts in Ghost admin and publish when ready.');
}

fixPosts();
