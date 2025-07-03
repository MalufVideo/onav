#!/usr/bin/env python3
"""
Image optimization script for modal gallery images
Optimizes large images for web display while maintaining quality
"""

import os
from PIL import Image
import argparse
from pathlib import Path

def optimize_image(input_path, output_path, target_width=900, target_size_kb=100):
    """
    Optimize an image for web display with target file size
    
    Args:
        input_path: Path to input image
        output_path: Path to save optimized image
        target_width: Maximum width in pixels
        target_size_kb: Target file size in KB
    """
    try:
        # Open and convert to RGB if needed
        with Image.open(input_path) as img:
            # Convert to RGB if necessary (for WebP compatibility)
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Get original dimensions
            original_width, original_height = img.size
            
            # Calculate new dimensions maintaining aspect ratio
            if original_width > target_width:
                ratio = target_width / original_width
                new_width = target_width
                new_height = int(original_height * ratio)
            else:
                new_width = original_width
                new_height = original_height
            
            # Resize image with high quality resampling
            resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Iteratively find the right quality to hit target size
            quality = 85
            target_size_bytes = target_size_kb * 1024
            
            while quality > 10:
                # Save with current quality
                resized_img.save(
                    output_path,
                    'WebP',
                    quality=quality,
                    method=6,
                    optimize=True
                )
                
                # Check file size
                current_size = os.path.getsize(output_path)
                
                if current_size <= target_size_bytes:
                    break
                
                # Reduce quality for next iteration
                quality -= 10
            
            # If still too large, try reducing dimensions
            if os.path.getsize(output_path) > target_size_bytes and quality <= 10:
                # Reduce width by 20% and try again
                new_width = int(new_width * 0.8)
                new_height = int(new_height * 0.8)
                smaller_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                smaller_img.save(
                    output_path,
                    'WebP',
                    quality=70,
                    method=6,
                    optimize=True
                )
            
            # Calculate size reduction
            original_size = os.path.getsize(input_path)
            new_size = os.path.getsize(output_path)
            reduction = ((original_size - new_size) / original_size) * 100
            
            print(f"✓ {input_path} -> {output_path}")
            print(f"  Dimensions: {original_width}x{original_height} -> {new_width}x{new_height}")
            print(f"  Size: {original_size/1024:.1f}KB -> {new_size/1024:.1f}KB ({reduction:.1f}% reduction)")
            print(f"  Quality: {quality}, Target: <{target_size_kb}KB")
            
            return True
            
    except Exception as e:
        print(f"✗ Error processing {input_path}: {str(e)}")
        return False

def main():
    # Images to optimize based on the network analysis
    images_to_optimize = [
        'globo-volume-led.webp',
        'gloob2.webp', 
        'gloob_futeboloria.webp',
        'ludmilla_coachella.webp',
        'globo-venice.webp'
    ]
    
    img_dir = Path('img')
    output_dir = Path('img')
    
    # Create output directory if it doesn't exist
    output_dir.mkdir(exist_ok=True)
    
    print("🖼️  Optimizing modal images for web performance...")
    print("=" * 60)
    
    optimized_files = []
    
    for image_name in images_to_optimize:
        input_path = img_dir / image_name
        
        if input_path.exists():
            # Create optimized filename
            name_without_ext = input_path.stem
            optimized_name = f"{name_without_ext}_optimized.webp"
            output_path = output_dir / optimized_name
            
            print(f"\n📸 Processing: {image_name}")
            
            if optimize_image(input_path, output_path):
                optimized_files.append(optimized_name)
        else:
            print(f"⚠️  Warning: {input_path} not found")
    
    print("\n" + "=" * 60)
    print("🎉 Optimization complete!")
    print(f"📁 Optimized {len(optimized_files)} images")
    
    if optimized_files:
        print("\n📋 Optimized image names:")
        for filename in optimized_files:
            print(f"  • {filename}")
        
        # Also save to a text file for reference
        with open('optimized_images_list.txt', 'w') as f:
            f.write("Optimized Modal Images:\n")
            f.write("=" * 30 + "\n\n")
            for filename in optimized_files:
                f.write(f"{filename}\n")
        
        print(f"\n💾 List saved to: optimized_images_list.txt")

if __name__ == "__main__":
    main()