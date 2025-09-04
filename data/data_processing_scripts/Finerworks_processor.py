#!/usr/bin/env python3
"""
Combined Finer Works API Processor
Combines size calculation and image metadata extraction for Xiaoran's Traditional Chinese Paintings
Supports both .png and .jpg image formats
Updated to use actual pixel dimensions and 200 PPI requirements
"""

import json
import math
import os
import sys
from pathlib import Path
from PIL import Image
from urllib.parse import urljoin
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CombinedFinerWorksProcessor:
    def __init__(self, base_url="https://xiaoran.netlify.app/", image_dir="images/paintings/large"):
        self.base_url = base_url.rstrip('/') + '/'
        self.image_dir = image_dir
        self.REQUIRED_PPI = 200
        
    def get_image_dimensions_from_file(self, artwork_id):
        """Get actual pixel dimensions from the image file"""
        image_paths = self.get_local_image_paths(artwork_id)
        
        if not image_paths:
            logger.warning(f"Image file not found for artwork: {artwork_id}")
            return None, None
            
        try:
            with Image.open(image_paths['large_path']) as img:
                width, height = img.size
                logger.info(f"Image dimensions for {artwork_id}: {width} × {height} pixels")
                return width, height
        except Exception as e:
            logger.error(f"Error reading image dimensions for {artwork_id}: {e}")
            return None, None

    def calculate_max_print_size_at_300ppi(self, pixel_width, pixel_height):
        """Calculate maximum print size at 300 PPI"""
        max_width_inches = pixel_width / self.REQUIRED_PPI
        max_height_inches = pixel_height / self.REQUIRED_PPI
        
        # Round down to ensure we don't exceed 300 PPI
        max_width_inches = math.floor(max_width_inches * 10) / 10
        max_height_inches = math.floor(max_height_inches * 10) / 10
        
        return max_width_inches, max_height_inches

    def generate_size_options_at_300ppi(self, max_width_inches, max_height_inches):
        """Generate 3 size options while maintaining 300+ PPI"""
        sizes = []
        original_ratio = max_width_inches / max_height_inches
        
        # Generate target sizes similar to your original logic
        # Use the maximum dimension to determine size categories
        max_dimension = max(max_width_inches, max_height_inches)
        
        # Generate 3 different target sizes based on the maximum possible size
        if max_dimension >= 18:
            target_sizes = [12, 15, int(max_dimension)]  # Small, medium, maximum
        elif max_dimension >= 12:
            target_sizes = [8, 12, int(max_dimension)]   # Small, medium, maximum  
        else:
            target_sizes = [6, int(max_dimension * 0.8), int(max_dimension)]  # Adjust for smaller images
        
        for target_size in target_sizes:
            if original_ratio > 1:
                # Landscape artwork (width > height)
                width = target_size
                height = width / original_ratio
            else:
                # Portrait artwork (height > width)
                height = target_size
                width = height * original_ratio
            
            # Round to integers like your original code
            width_rounded = round(width)
            height_rounded = round(height)
            
            # Verify ratio consistency (from your original logic)
            new_ratio = width_rounded / height_rounded
            if abs(new_ratio - original_ratio) > 0.1:
                # If ratio deviation is too large, adjust one dimension
                if original_ratio > 1:
                    height_rounded = round(width_rounded / original_ratio)
                else:
                    width_rounded = round(height_rounded * original_ratio)
            
            # Don't exceed our maximum size at 300 PPI and ensure reasonable minimum
            if (width_rounded <= max_width_inches and height_rounded <= max_height_inches and
                width_rounded >= 6 and height_rounded >= 6):
                
                sizes.append({
                    'width_inches': width_rounded,
                    'height_inches': height_rounded
                })
        
        # Remove duplicates
        unique_sizes = {}
        for size in sizes:
            key = f"{size['width_inches']}x{size['height_inches']}"
            if key not in unique_sizes:
                unique_sizes[key] = size
        
        # Sort by area (largest first) and return up to 3
        sorted_sizes = sorted(unique_sizes.values(), 
                            key=lambda x: x['width_inches'] * x['height_inches'], 
                            reverse=True)
        
        return sorted_sizes[:3]

    def clean_artwork_data(self, artwork):
        """Clean artwork data - remove old fields and ensure new structure"""
        # Create clean copy
        cleaned = artwork.copy()
        
        # Remove old/deprecated fields
        fields_to_remove = ['sizeCm', 'sizeInches', 'mediumEn', 'recent', 'exhibitions', 'tags']
        for field in fields_to_remove:
            cleaned.pop(field, None)
        
        # Ensure we have the dimension fields (fallback to parsing sizeCm if needed)
        if not cleaned.get('heightCm') or not cleaned.get('widthCm'):
            if artwork.get('sizeCm'):
                height_cm, width_cm = self.parse_size_cm(artwork['sizeCm'])
                if height_cm and width_cm:
                    cleaned['heightCm'] = height_cm
                    cleaned['widthCm'] = width_cm
        
        # Calculate inch dimensions if we have cm dimensions
        if cleaned.get('heightCm') and cleaned.get('widthCm'):
            cleaned['heightInches'] = round(self.cm_to_inches(cleaned['heightCm']), 1)
            cleaned['widthInches'] = round(self.cm_to_inches(cleaned['widthCm']), 1)
        
        return cleaned

    def parse_size_cm(self, size_str):
        """Parse size string, return (height_cm, width_cm)"""
        if not size_str:
            return None, None
        
        size_str = size_str.replace('×', 'x').replace('X', 'x').replace(' ', '')
        
        if 'x' in size_str:
            parts = size_str.split('x')
            if len(parts) == 2:
                try:
                    height = float(parts[0])
                    width = float(parts[1])
                    return height, width
                except ValueError:
                    pass
        return None, None

    def cm_to_inches(self, cm):
        """Convert cm to inches"""
        return cm / 2.54

    def calculate_optimal_sizes_from_pixels(self, artwork_id):
        """Calculate optimal display sizes based on actual pixel dimensions and 300 PPI"""
        # Get actual pixel dimensions from image file
        pixel_width, pixel_height = self.get_image_dimensions_from_file(artwork_id)
        
        if not pixel_width or not pixel_height:
            logger.warning(f"Cannot get pixel dimensions for artwork: {artwork_id}")
            return []
        
        # Calculate maximum print size at 300 PPI
        max_width_inches, max_height_inches = self.calculate_max_print_size_at_300ppi(pixel_width, pixel_height)
        
        logger.info(f"Max print size at 300 PPI for {artwork_id}: {max_width_inches}\" × {max_height_inches}\"")
        
        # Generate size options
        size_options = self.generate_size_options_at_300ppi(max_width_inches, max_height_inches)
        
        if not size_options:
            logger.warning(f"No valid print sizes at 300 PPI for artwork: {artwork_id}")
        else:
            logger.info(f"Generated {len(size_options)} size options for {artwork_id}")
        
        return size_options

    def get_local_image_paths(self, artwork_id):
        """Get local image paths and URLs for artwork ID - supports both .png and .jpg"""
        # Try both .png and .jpg extensions
        for ext in ['.png', '.jpg']:
            # Main large image
            large_filename = f"{artwork_id}_large{ext}"
            large_path = os.path.join(self.image_dir, large_filename)
            
            if os.path.exists(large_path):
                large_url = urljoin(self.base_url, f"{self.image_dir}/{large_filename}")
                
                # Thumbnail image
                thumb_filename = f"{artwork_id}_thumb{ext}"
                thumb_path = os.path.join("images/paintings/thumbnails", thumb_filename)
                thumb_url = urljoin(self.base_url, f"images/paintings/thumbnails/{thumb_filename}")
                
                # Check if thumbnail exists
                thumb_exists = os.path.exists(thumb_path)
                
                return {
                    'large_path': large_path,
                    'large_url': large_url,
                    'large_filename': large_filename,
                    'thumb_path': thumb_path if thumb_exists else None,
                    'thumb_url': thumb_url if thumb_exists else None,
                    'thumb_filename': thumb_filename if thumb_exists else None,
                    'thumb_exists': thumb_exists
                }
        
        return None

    def get_image_info(self, local_path, image_url):
        """Extract metadata from local image file"""
        try:
            print(f"  Processing local file: {local_path}")
            
            # Get file size
            file_size = os.path.getsize(local_path)
            
            # Get image dimensions and format
            with Image.open(local_path) as img:
                width, height = img.size
                format_type = img.format.lower() if img.format else 'png'
            
            return {
                'file_size': file_size,
                'pix_w': width,
                'pix_h': height,
                'format': format_type,
                'url': image_url
            }
            
        except Exception as e:
            print(f"  Error: {e}")
            return None

    def create_finerworks_metadata(self, artwork_id, image_paths, image_info, artwork_data, recommended_sizes):
        """Create Finer Works compatible metadata based on their API example"""
        
        # Get artwork info
        title = artwork_data.get('title', 'Untitled')
        title_en = artwork_data.get('titleEn', '')
        description = f"Traditional Chinese painting by Xiaoran. {title_en}" if title_en else f"Traditional Chinese painting: {title}"
        
        # Create the image object for Finer Works API
        finerworks_image = {
            "title": title,
            "description": description,
            "file_name": image_paths['large_filename'],
            "file_size": image_info['file_size'],
            "pix_w": image_info['pix_w'],
            "pix_h": image_info['pix_h'],
            "hires_file_name": image_paths['large_filename'],  # Same as file_name for hi-res source
            "private_hires_uri": image_paths['large_url']      # URL to download the hi-res image
        }
        
        # Add thumbnail info if available
        if image_paths['thumb_exists']:
            finerworks_image.update({
                "thumbnail_file_name": image_paths['thumb_filename'],
                "public_thumbnail_uri": image_paths['thumb_url']
            })
        
        # For preview, we'll use the large image as preview too since you don't have separate preview files
        # This is common when you only have thumbnail + hi-res
        finerworks_image.update({
            "preview_file_name": image_paths['large_filename'],
            "public_preview_uri": image_paths['large_url']
        })
        
        # Add metadata for our reference (not sent to API)
        metadata = {
            "finerworks_api_object": finerworks_image,
            "format": image_info['format'],
            "dimensions_text": f"{image_info['pix_w']}×{image_info['pix_h']}",
            "file_size_mb": round(image_info['file_size'] / (1024 * 1024), 2),
            "has_thumbnail": image_paths['thumb_exists']
        }
        
        return metadata

    def process_artworks(self, input_file, output_file=None):
        """Process artworks JSON and combine size calculations with image metadata"""
        
        print(f"Processing artwork data from: {input_file}")
        print(f"Base URL: {self.base_url}")
        print(f"Image directory: {self.image_dir}")
        print(f"Required PPI: {self.REQUIRED_PPI}")
        print("-" * 60)
        
        # Load existing JSON
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                artworks_list = json.load(f)
        except Exception as e:
            print(f"Error loading JSON file: {e}")
            return False
        
        if output_file is None:
            output_file = f"finerworks_ready_{os.path.basename(input_file)}"
        
        processed_count = 0
        error_count = 0
        recommendations = {}
        
        print(f"Analyzing {len(artworks_list)} artworks...")
        
        # Process each artwork
        for artwork in artworks_list:
            artwork_id = artwork['id']
            title = artwork.get('title', 'Unknown')
            title_en = artwork.get('titleEn', '')
            
            print(f"\nProcessing: {title}")
            if title_en:
                print(f"   English: {title_en}")
            
            # Clean artwork data
            cleaned_artwork = self.clean_artwork_data(artwork)
            
            # Calculate optimal sizes based on actual pixel dimensions
            optimal_sizes = self.calculate_optimal_sizes_from_pixels(artwork_id)
            
            if not optimal_sizes:
                print(f"  Could not calculate valid sizes at 300 PPI for {title}")
                error_count += 1
                continue
            
            # Find local image files
            image_paths = self.get_local_image_paths(artwork_id)
            
            if not image_paths:
                print(f"  Large image file not found for: {artwork_id}")
                # Still add the artwork with size recommendations but no image data
                recommendations[artwork_id] = {
                    'artwork_info': {
                        'id': artwork_id,
                        'title': title,
                        'title_en': title_en,
                        'original_size_cm': f"{cleaned_artwork.get('heightCm', '')}×{cleaned_artwork.get('widthCm', '')}"
                    },
                    'recommended_sizes': optimal_sizes
                }
                error_count += 1
                continue
            
            print(f"  Found large image: {image_paths['large_filename']}")
            if image_paths['thumb_exists']:
                print(f"  Found thumbnail: {image_paths['thumb_filename']}")
            
            # Get image metadata from local file
            image_info = self.get_image_info(image_paths['large_path'], image_paths['large_url'])
            
            if image_info:
                # Create Finer Works metadata
                finerworks_metadata = self.create_finerworks_metadata(
                    artwork_id, image_paths, image_info, cleaned_artwork, optimal_sizes
                )
                
                # Add to recommendations
                recommendations[artwork_id] = {
                    'artwork_info': {
                        'id': artwork_id,
                        'title': title,
                        'title_en': title_en,
                        'original_size_cm': f"{cleaned_artwork.get('heightCm', '')}×{cleaned_artwork.get('widthCm', '')}"
                    },
                    'recommended_sizes': optimal_sizes,
                    'finerworks_image': finerworks_metadata
                }
                
                print(f"  Dimensions: {image_info['pix_w']}×{image_info['pix_h']}")
                print(f"  File size: {finerworks_metadata['file_size_mb']} MB")
                print(f"  Recommended sizes: {len(optimal_sizes)}")
                for i, size in enumerate(optimal_sizes):
                    print(f"    Size {i+1}: {size['width_inches']}×{size['height_inches']}\"")
                print(f"  Complete metadata added")
                
                processed_count += 1
            else:
                # Add without image metadata
                recommendations[artwork_id] = {
                    'artwork_info': {
                        'id': artwork_id,
                        'title': title,
                        'title_en': title_en,
                        'original_size_cm': f"{cleaned_artwork.get('heightCm', '')}×{cleaned_artwork.get('widthCm', '')}"
                    },
                    'recommended_sizes': optimal_sizes
                }
                error_count += 1
        
        # Save updated JSON
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(recommendations, f, ensure_ascii=False, indent=2)
            
            print(f"\n" + "="*60)
            print(f"Processing complete!")
            print(f"Results:")
            print(f"   • Processed: {processed_count} artworks with complete data")
            print(f"   • Partial: {error_count} artworks (missing images or invalid PPI)")
            print(f"   • Total: {len(recommendations)} artworks in output")
            print(f"   • Success rate: {processed_count/(processed_count+error_count)*100:.1f}%")
            print(f"Updated file saved as: {output_file}")
            
            return True
            
        except Exception as e:
            print(f"Error saving file: {e}")
            return False

def main():
    """Main execution function"""
    
    # Check if JSON file exists
    input_file = "./data/artworks.json"
    if not os.path.exists(input_file):
        print(f"File not found: {input_file}")
        print("Please make sure the JSON file is in the parent directory.")
        return
    
    # Create processor and process
    processor = CombinedFinerWorksProcessor()
    
    success = processor.process_artworks(input_file, "./data/finerworks_ready_artworks.json")
    
    if success:
        print(f"\nAll done! You can now use the updated JSON for Finer Works API.")
        print(f"Next steps:")
        print(f"  1. Review the updated JSON file")
        print(f"  2. Test image upload with a few samples")
        print(f"  3. Integrate into your website workflow")
    else:
        print(f"\nProcessing failed. Please check the errors above.")

if __name__ == "__main__":
    main()
