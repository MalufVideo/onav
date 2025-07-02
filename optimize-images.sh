#!/bin/bash

# Image Optimization Script using ImageMagick
# This script converts JPG to WebP and optimizes existing WebP files
# for better PageSpeed performance while maintaining visual quality

echo "🖼️  Starting image optimization process..."

# Create backup directory
BACKUP_DIR="img/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Function to backup original file
backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        echo "📁 Backed up: $file"
    fi
}

# Function to optimize image with ImageMagick
optimize_image() {
    local input="$1"
    local output="$2"
    local max_width="$3"
    local quality="$4"
    
    if [ -f "$input" ]; then
        backup_file "$input"
        
        # Get original file size
        original_size=$(stat -f%z "$input" 2>/dev/null || stat -c%s "$input" 2>/dev/null)
        
        # Optimize with ImageMagick
        convert "$input" \
            -resize "${max_width}x${max_width}>" \
            -quality "$quality" \
            -strip \
            -interlace Plane \
            -define webp:method=6 \
            -define webp:alpha-quality=90 \
            -define webp:lossless=false \
            "$output"
        
        if [ -f "$output" ]; then
            # Get new file size
            new_size=$(stat -f%z "$output" 2>/dev/null || stat -c%s "$output" 2>/dev/null)
            savings=$((original_size - new_size))
            percentage=$((savings * 100 / original_size))
            
            echo "✅ Optimized: $(basename "$input") -> $(basename "$output")"
            echo "   📊 Size: $(numfmt --to=iec $original_size) -> $(numfmt --to=iec $new_size) (${percentage}% reduction)"
        else
            echo "❌ Failed to optimize: $input"
        fi
    else
        echo "⚠️  File not found: $input"
    fi
}

# Navigate to project root
cd "$(dirname "$0")"

echo "📁 Working directory: $(pwd)"
echo "📁 Backup directory: $BACKUP_DIR"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed. Please install it first:"
    echo "   macOS: brew install imagemagick"
    echo "   Ubuntu: sudo apt-get install imagemagick"
    echo "   Windows: Download from https://imagemagick.org/"
    exit 1
fi

echo "🔍 Found ImageMagick: $(convert -version | head -1)"

# Convert JPG files to optimized WebP
echo ""
echo "🔄 Converting JPG files to optimized WebP..."

# Hero and main images - high quality for above-fold content
optimize_image "img/hero-bg.jpg" "img/hero-bg.webp" 1920 85
optimize_image "img/on+av_logo.jpg" "img/on+av_logo.webp" 400 90

# Gallery and case study images - balanced quality
find img/ -name "*.jpg" -not -path "*/backup_*/*" | while read -r jpg_file; do
    webp_file="${jpg_file%.jpg}.webp"
    if [ ! -f "$webp_file" ]; then
        optimize_image "$jpg_file" "$webp_file" 1200 80
    fi
done

# Optimize existing large WebP files
echo ""
echo "🔄 Optimizing existing WebP files..."

# Large WebP files that need more compression
declare -A webp_targets=(
    ["img/disguise_ROE.webp"]="1920:75"  # Hero image - maintain quality
    ["img/globo-volume-led.webp"]="1400:70"
    ["img/globo-venice.webp"]="1400:70"
    ["img/globo-producao-virtual.webp"]="1400:70"
    ["img/globo-producao-virtual-neve.webp"]="1400:70"
    ["img/vp-neve.webp"]="1400:70"
    ["img/olimpiadas_globo_v1.webp"]="1400:75"
    ["img/olimpiadas_globo_v2.webp"]="1200:70"
    ["img/olimpiadas_globo_v3.webp"]="1200:70"
    ["img/olimpiadas_globo_v4.webp"]="1200:70"
    ["img/olimpiadas_globo_v5.webp"]="1200:70"
    ["img/olimpiadas_globo_v6.webp"]="1200:70"
    ["img/olimpiadas_globo_v7.webp"]="1200:70"
    ["img/olimpiadas_globo_v8.webp"]="1200:70"
    ["img/tate-disguise.webp"]="1200:75"
    ["img/belo_vp_3127.webp"]="1200:70"
    ["img/belo_vp_3129.webp"]="1200:70"
    ["img/dvd_jquest_disguise_v2.webp"]="1200:70"
    ["img/dvd_jquest_disguise_v3.webp"]="1200:70"
    ["img/dvd_jquest_disguise_v4.webp"]="1200:70"
    ["img/dvd_jquest_disguise_v5.webp"]="1200:70"
)

# Process Globo Agro series (many small files)
for i in $(seq -w 000 008); do
    webp_targets["img/globo_agro_${i}.webp"]="1000:75"
done

# Optimize targeted WebP files
for file in "${!webp_targets[@]}"; do
    if [ -f "$file" ]; then
        IFS=':' read -r max_width quality <<< "${webp_targets[$file]}"
        temp_file="${file%.webp}_temp.webp"
        
        optimize_image "$file" "$temp_file" "$max_width" "$quality"
        
        if [ -f "$temp_file" ]; then
            mv "$temp_file" "$file"
        fi
    else
        echo "⚠️  File not found: $file"
    fi
done

# Gallery images optimization
echo ""
echo "🔄 Optimizing gallery images..."

# Tours directory images
find img/tours/ -name "*.webp" -not -path "*/backup_*/*" | while read -r webp_file; do
    if [ -f "$webp_file" ]; then
        temp_file="${webp_file%.webp}_temp.webp"
        optimize_image "$webp_file" "$temp_file" 800 75
        if [ -f "$temp_file" ]; then
            mv "$temp_file" "$webp_file"
        fi
    fi
done

# Small icon and logo optimizations
echo ""
echo "🔄 Optimizing icons and logos..."

# Optimize smaller images with higher quality to maintain sharpness
find img/ -name "*logo*.webp" -not -path "*/backup_*/*" | while read -r logo_file; do
    if [ -f "$logo_file" ]; then
        temp_file="${logo_file%.webp}_temp.webp"
        optimize_image "$logo_file" "$temp_file" 400 85
        if [ -f "$temp_file" ]; then
            mv "$temp_file" "$logo_file"
        fi
    fi
done

# Remove any leftover JPG files that have WebP equivalents
echo ""
echo "🧹 Cleaning up redundant JPG files..."

find img/ -name "*.jpg" -not -path "*/backup_*/*" | while read -r jpg_file; do
    webp_equivalent="${jpg_file%.jpg}.webp"
    if [ -f "$webp_equivalent" ]; then
        echo "🗑️  Removing redundant JPG: $(basename "$jpg_file")"
        rm "$jpg_file"
    fi
done

# Generate optimization report
echo ""
echo "📊 Optimization Report"
echo "====================="

total_original=0
total_optimized=0

find "$BACKUP_DIR" -type f | while read -r backup_file; do
    original_name=$(basename "$backup_file")
    current_file="img/$original_name"
    
    if [ -f "$current_file" ]; then
        original_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
        current_size=$(stat -f%z "$current_file" 2>/dev/null || stat -c%s "$current_file" 2>/dev/null)
        
        total_original=$((total_original + original_size))
        total_optimized=$((total_optimized + current_size))
    fi
done > /tmp/size_calc.txt

# Calculate total savings (approximate since we're in a subshell)
if [ -d "$BACKUP_DIR" ] && [ "$(ls -A "$BACKUP_DIR")" ]; then
    echo "✅ Optimization completed successfully!"
    echo "📁 Original files backed up to: $BACKUP_DIR"
    echo "🎯 Recommendation: Test the site and delete backup folder if satisfied"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Test your website for visual quality"
    echo "   2. Run PageSpeed Insights to measure improvements" 
    echo "   3. If satisfied, remove backup: rm -rf $BACKUP_DIR"
    echo "   4. If issues found, restore: cp $BACKUP_DIR/* img/"
else
    echo "⚠️  No files were optimized. Check if images exist in img/ directory"
fi

echo ""
echo "🚀 Image optimization process completed!"