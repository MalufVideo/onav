# Ghost Article Upload Script

This script uploads the virtual production articles to your Ghost CMS instance.

## Setup

1. Install dependencies:
```bash
cd scripts
npm install
```

## Usage

Run the upload script:
```bash
npm run upload
```

## What it does

The script will:
1. Read the two markdown articles from the `articles/` directory
2. Convert markdown to HTML format
3. Upload them to Ghost as draft posts
4. Display the URLs and IDs of the created posts

## Articles included

1. **O Futuro da Produção Audiovisual** - Comprehensive overview of virtual production
2. **Guia Completo de LED Walls** - Technical deep-dive into LED walls for virtual production

## Configuration

The script uses your Ghost API credentials from the screenshot:
- URL: `https://insights.onav.com.br`
- Admin API Key: (already configured)

## Publishing

Articles are uploaded as **DRAFTS** by default. To publish them:

1. Go to your Ghost admin panel
2. Navigate to Posts
3. Find the uploaded articles
4. Click "Publish" when ready

Or modify the script to publish directly by changing:
```javascript
status: 'draft'  // Change to 'published'
```

## Adding Featured Images

To add featured images to the articles:

1. Upload images to Ghost
2. Copy the image URLs
3. Update the `feature_image` field in the `articles` array in the script
4. Re-run the upload

## Tags

Both articles are tagged with relevant keywords for SEO and discoverability:
- Produção Virtual
- LED Walls
- Tecnologia
- Cinema
- Inovação
- Guia Técnico
- Tutorial

## Troubleshooting

If you get errors:
- Verify your Ghost API key is correct
- Ensure Ghost API is enabled in your Ghost settings
- Check network connectivity to insights.onav.com.br
- Review error messages in console output
