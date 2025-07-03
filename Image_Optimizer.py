import os
from PIL import Image

class ImageOptimizer:
    def __init__(self, image_paths, target_dimensions, preserve_quality=True):
        self.image_paths = image_paths
        self.target_dimensions = target_dimensions
        self.preserve_quality = preserve_quality

    def optimize_images(self):
        for image_path in self.image_paths:
            if os.path.exists(image_path):
                self.process_image(image_path)
            else:
                print(f"Image not found: {image_path}")

    def process_image(self, image_path):
        try:
            with Image.open(image_path) as img:
                original_size = os.path.getsize(image_path)
                
                # Get target dimensions for this image
                target_dims = self.target_dimensions.get(image_path, None)
                if target_dims is None:
                    print(f"No target dimensions specified for {image_path}")
                    return
                
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Resize to exact target dimensions
                img_resized = img.resize((target_dims['width'], target_dims['height']), Image.Resampling.LANCZOS)
                
                # Create output filename
                base_name = os.path.splitext(image_path)[0]
                output_path = f"{base_name}_optimized.webp"
                
                # Save with high quality (no compression)
                if self.preserve_quality:
                    img_resized.save(output_path, 'WEBP', quality=95, optimize=True, method=6)
                else:
                    img_resized.save(output_path, 'WEBP', quality=85, optimize=True)

                optimized_size = os.path.getsize(output_path)
                print(f"✓ {image_path} -> {output_path}")
                print(f"  Size: {original_size:,} bytes -> {optimized_size:,} bytes")
                print(f"  Dimensions: {img.size} -> {target_dims['width']}x{target_dims['height']}")
                
        except Exception as e:
            print(f"✗ Could not process {image_path}: {e}")

if __name__ == '__main__':
    # Configuration - only process lg.webp and unreal.webp
    image_paths = [
        'img/lg.webp',
        'img/unreal.webp'
    ]
    
    # Target dimensions based on actual display sizes
    target_dimensions = {
        'img/lg.webp': {'width': 82, 'height': 40},
        'img/unreal.webp': {'width': 53, 'height': 64}
    }
    
    print("🖼️  Optimizing LG and Unreal logos...")
    print("=" * 50)
    
    # Optimize the images without compression
    optimizer = ImageOptimizer(image_paths, target_dimensions, preserve_quality=True)
    optimizer.optimize_images()
    
    print("\n🎉 Optimization complete!")
    print("Images resized to display dimensions with quality preserved.")