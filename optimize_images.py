#!/usr/bin/env python3
"""
Image optimization script for onav.com.br
Resizes images to their actual display dimensions and optimizes compression
"""

import os
from PIL import Image

def optimize_image(input_path, output_path, target_width, target_height, preserve_quality=True):
    """
    Resize image to target dimensions while preserving quality
    """
    try:
        with Image.open(input_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Resize image using high-quality resampling
            img_resized = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
            
            if preserve_quality:
                # Use lossless or very high quality settings
                img_resized.save(output_path, 'WEBP', quality=95, optimize=True, method=6, lossless=False)
            else:
                # Standard optimization
                img_resized.save(output_path, 'WEBP', quality=85, optimize=True, method=6)
            
            # Get file sizes
            original_size = os.path.getsize(input_path)
            optimized_size = os.path.getsize(output_path)
            
            print(f"✓ {input_path} -> {output_path}")
            print(f"  Size: {original_size:,} bytes -> {optimized_size:,} bytes ({optimized_size/original_size*100:.1f}%)")
            print(f"  Dimensions: {img.size} -> {target_width}x{target_height}")
            
    except Exception as e:
        print(f"✗ Error processing {input_path}: {e}")

def main():
    # Image optimization tasks based on the provided data
    optimizations = [
        {
            'input': '/mnt/d/web projects/site_onav/img/volume_disguise.webp',
            'output': '/mnt/d/web projects/site_onav/img/volume_disguise_optimized.webp',
            'width': 294,  # Keeping reasonable size for volume image
            'height': 294,
            'preserve_quality': False  # Allow some compression for this large image
        },
        {
            'input': '/mnt/d/web projects/site_onav/img/doridio.webp',
            'output': '/mnt/d/web projects/site_onav/img/doridio_optimized.webp',
            'width': 48,
            'height': 48,
            'preserve_quality': True  # Preserve quality for logo
        },
        {
            'input': '/mnt/d/web projects/site_onav/img/lg.webp',
            'output': '/mnt/d/web projects/site_onav/img/lg_optimized.webp',
            'width': 82,
            'height': 40,
            'preserve_quality': True  # Preserve quality for brand logo
        },
        {
            'input': '/mnt/d/web projects/site_onav/img/unreal.webp',
            'output': '/mnt/d/web projects/site_onav/img/unreal_optimized.webp',
            'width': 53,
            'height': 64,
            'preserve_quality': True  # Preserve quality for brand logo
        }
    ]
    
    print("🖼️  Starting image optimization...")
    print("=" * 60)
    
    for opt in optimizations:
        if os.path.exists(opt['input']):
            optimize_image(
                opt['input'],
                opt['output'],
                opt['width'],
                opt['height'],
                opt.get('preserve_quality', True)
            )
        else:
            print(f"✗ File not found: {opt['input']}")
        print()
    
    print("🎉 Image optimization complete!")
    print("\nNext steps:")
    print("1. Review the optimized images")
    print("2. Update HTML to use the _optimized versions")
    print("3. Test the website to ensure images display correctly")

if __name__ == "__main__":
    main()