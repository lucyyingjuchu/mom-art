import os
from PIL import Image
import pillow_heif  # For HEIF support if needed

def optimize_image(input_path, output_path, target_size_kb=500, quality_start=90):
    """
    Optimize image to get as close as possible to target size
    """
    try:
        pillow_heif.register_heif_opener()
        
        with Image.open(input_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            target_size_bytes = target_size_kb * 1024
            
            # Binary search for optimal quality
            best_quality = quality_start
            best_size = float('inf')
            low_quality = 20
            high_quality = 95
            
            # First, try original size with quality optimization
            while low_quality <= high_quality:
                mid_quality = (low_quality + high_quality) // 2
                
                import io
                temp_buffer = io.BytesIO()
                img.save(temp_buffer, format='JPEG', quality=mid_quality, optimize=True)
                current_size = temp_buffer.tell()
                
                # If this is closer to target, save it
                if abs(current_size - target_size_bytes) < abs(best_size - target_size_bytes):
                    best_quality = mid_quality
                    best_size = current_size
                
                if current_size > target_size_bytes:
                    high_quality = mid_quality - 1
                else:
                    low_quality = mid_quality + 1
            
            # Save with best quality found
            if best_size <= target_size_bytes * 1.1:  # Within 10% of target
                img.save(output_path, format='JPEG', quality=best_quality, optimize=True)
                final_size = os.path.getsize(output_path)
                print(f"✅ {os.path.basename(input_path)}: {final_size//1024}KB (Q:{best_quality}, target: {target_size_kb}KB)")
                return True
            
            # If still too big, try resizing
            width, height = img.size
            scale_factors = [0.95, 0.9, 0.85, 0.8, 0.75, 0.7]
            
            for scale in scale_factors:
                new_width = int(width * scale)
                new_height = int(height * scale)
                resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Binary search again for resized image
                best_quality_resized = 85
                best_size_resized = float('inf')
                low_q = 30
                high_q = 90
                
                while low_q <= high_q:
                    mid_q = (low_q + high_q) // 2
                    
                    temp_buffer = io.BytesIO()
                    resized_img.save(temp_buffer, format='JPEG', quality=mid_q, optimize=True)
                    current_size = temp_buffer.tell()
                    
                    if abs(current_size - target_size_bytes) < abs(best_size_resized - target_size_bytes):
                        best_quality_resized = mid_q
                        best_size_resized = current_size
                    
                    if current_size > target_size_bytes:
                        high_q = mid_q - 1
                    else:
                        low_q = mid_q + 1
                
                # If this size is close to target, use it
                if best_size_resized <= target_size_bytes * 1.1:
                    resized_img.save(output_path, format='JPEG', quality=best_quality_resized, optimize=True)
                    final_size = os.path.getsize(output_path)
                    print(f"✅ {os.path.basename(input_path)}: {final_size//1024}KB (resized to {new_width}x{new_height}, Q:{best_quality_resized})")
                    return True
            
            print(f"⚠️ Could not optimize {os.path.basename(input_path)} to target size")
            return False
            
    except Exception as e:
        print(f"❌ Error processing {input_path}: {e}")
        return False

def batch_optimize_images(source_dir, backup_dir=None, target_size_kb=500):
    """
    Batch optimize all images in a directory
    """
    if backup_dir:
        os.makedirs(backup_dir, exist_ok=True)
    
    supported_formats = ('.jpg', '.jpeg', '.png', '.webp')
    processed = 0
    errors = 0
    
    for filename in os.listdir(source_dir):
        if filename.lower().endswith(supported_formats):
            input_path = os.path.join(source_dir, filename)
            
            # Backup original if requested
            if backup_dir:
                backup_path = os.path.join(backup_dir, filename)
                import shutil
                shutil.copy2(input_path, backup_path)
            
            # Create output filename (always .jpg for consistency)
            name_without_ext = os.path.splitext(filename)[0]
            output_filename = f"{name_without_ext}.jpg"
            output_path = os.path.join(source_dir, output_filename)
            
            # Skip if input and output are the same file
            if input_path == output_path:
                temp_path = input_path + ".temp"
                if optimize_image(input_path, temp_path, target_size_kb):
                    os.replace(temp_path, output_path)
                    processed += 1
                else:
                    errors += 1
            else:
                if optimize_image(input_path, output_path, target_size_kb):
                    # Remove original if it was PNG (now converted to JPG)
                    if filename.lower().endswith('.png'):
                        os.remove(input_path)
                    processed += 1
                else:
                    errors += 1
    
    print(f"\n📊 Summary: {processed} optimized, {errors} errors")

# Usage
if __name__ == "__main__":
    # IMPORTANT: Update these paths for your setup
    SOURCE_DIR = "./images/paintings/thumbnails"  # Your artwork.image directory
    BACKUP_DIR = "./images/paintings/thumbnails_bkup"   # Backup original files
    TARGET_SIZE_KB = 500              # Target size in KB
    
    print(f"🚀 Starting image optimization...")
    print(f"📁 Source: {SOURCE_DIR}")
    print(f"💾 Backup: {BACKUP_DIR}")
    print(f"🎯 Target size: {TARGET_SIZE_KB}KB")
    
    batch_optimize_images(SOURCE_DIR, BACKUP_DIR, TARGET_SIZE_KB)