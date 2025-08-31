#!/usr/bin/env python3
"""
Combined Finer Works API Processor
Combines size calculation and image metadata extraction for Xiaoran's Traditional Chinese Paintings
Supports both .png and .jpg image formats
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

    def analyze_artwork_characteristics(self, artwork):
        """Analyze artwork characteristics to determine suitable display style"""
        title = artwork.get('title', '')
        title_en = artwork.get('titleEn', '')
        description = artwork.get('description', '')
        
        # Determine artwork type
        artwork_type = 'general'
        viewing_style = 'comfortable'
        
        # Landscape paintings - suitable for larger sizes, dramatic display
        if any(keyword in title for keyword in ['山', '水', '峽', '瀑', '雲', '海']):
            artwork_type = 'landscape'
            viewing_style = 'dramatic'
            
        # Flower and bird paintings - suitable for medium sizes, detail appreciation
        elif any(keyword in title for keyword in ['花', '鳥', '梅', '竹', '菊', '蘭']):
            artwork_type = 'flower_bird'
            viewing_style = 'comfortable'
            
        # Calligraphy - suitable for smaller sizes, close viewing
        elif any(keyword in title for keyword in ['書', '字', '經', '詩', '序']):
            artwork_type = 'calligraphy'
            viewing_style = 'intimate'
            
        # Figures, animals - medium sizes
        elif any(keyword in title for keyword in ['人', '母', '熊', '雀', '鳥']):
            artwork_type = 'figure_animal'
            viewing_style = 'comfortable'
            
        return artwork_type, viewing_style

    def get_size_preferences(self, artwork_type, viewing_style):
        """Get size preferences based on artwork type"""
        base_preferences = {
            'small': {'min': 8, 'max': 12},
            'medium': {'min': 12, 'max': 18},
            'large': {'min': 18, 'max': 24}
        }
        
        # Adjust based on artwork type
        if artwork_type == 'landscape':
            # Landscape paintings tend toward larger sizes
            base_preferences = {
                'medium': {'min': 12, 'max': 18},
                'large': {'min': 18, 'max': 24},
                'statement': {'min': 24, 'max': 36}
            }
            
        elif artwork_type == 'calligraphy':
            # Calligraphy tends toward smaller refined sizes
            base_preferences = {
                'small': {'min': 8, 'max': 12},
                'medium': {'min': 12, 'max': 18}
            }
            
        return base_preferences

    def calculate_recommendation_score(self, width, height, original_ratio):
        """Calculate recommendation score (1-100)"""
        score = 50  # Base score
        
        # Size appropriateness (not too small, not too large)
        max_dim = max(width, height)
        if 12 <= max_dim <= 20:
            score += 30  # Most popular size range
        elif 8 <= max_dim <= 24:
            score += 20
        elif max_dim > 30:
            score -= 10  # Too large may be impractical
        
        # Ratio consistency
        calculated_ratio = width / height
        ratio_diff = abs(calculated_ratio - original_ratio)
        if ratio_diff < 0.05:
            score += 20  # Perfect ratio preservation
        elif ratio_diff < 0.1:
            score += 10
        
        # Size practicality (avoid strange sizes)
        if min(width, height) < 6:
            score -= 20  # Too narrow doesn't look good
        
        return max(0, min(100, score))

    def calculate_optimal_sizes(self, artwork):
        """Calculate optimal display sizes"""
        height_cm, width_cm = self.parse_size_cm(artwork.get('sizeCm', ''))
        
        if not height_cm or not width_cm:
            logger.warning(f"Cannot parse size: {artwork.get('id', 'unknown')}")
            return []
        
        # Convert to inches
        height_in = self.cm_to_inches(height_cm)
        width_in = self.cm_to_inches(width_cm)
        original_ratio = width_in / height_in
        
        # Analyze artwork characteristics
        artwork_type, viewing_style = self.analyze_artwork_characteristics(artwork)
        
        # Adjust size preferences based on artwork type
        size_preferences = self.get_size_preferences(artwork_type, viewing_style)
        
        all_sizes = []
        
        # Generate candidate sizes for each size range
        for size_category, size_range in size_preferences.items():
            min_size = size_range['min']
            max_size = size_range['max']
            
            # Try several target sizes within this range
            for target_size in [min_size, (min_size + max_size) / 2, max_size]:
                if original_ratio > 1:
                    # Landscape artwork (width > height)
                    width = target_size
                    height = width / original_ratio
                else:
                    # Portrait artwork (height > width)
                    height = target_size
                    width = height * original_ratio
                
                # Round while maintaining precise ratio
                width_rounded = round(width)
                height_rounded = round(height)
                
                # Verify ratio consistency
                new_ratio = width_rounded / height_rounded
                if abs(new_ratio - original_ratio) > 0.1:
                    # If ratio deviation is too large, adjust one dimension
                    if original_ratio > 1:
                        height_rounded = round(width_rounded / original_ratio)
                    else:
                        width_rounded = round(height_rounded * original_ratio)
                
                # Check if within reasonable range
                if (min_size <= max(width_rounded, height_rounded) <= max_size and
                    min(width_rounded, height_rounded) >= 6):
                    
                    score = self.calculate_recommendation_score(width_rounded, height_rounded, original_ratio)
                    
                    all_sizes.append({
                        'width_inches': width_rounded,
                        'height_inches': height_rounded,
                        'score': score
                    })
        
        # Remove duplicate sizes
        unique_sizes = {}
        for size in all_sizes:
            key = f"{size['width_inches']}x{size['height_inches']}"
            if key not in unique_sizes or size['score'] > unique_sizes[key]['score']:
                unique_sizes[key] = size
        
        # Sort by score, take top 2-3
        sorted_sizes = sorted(unique_sizes.values(), key=lambda x: x['score'], reverse=True)
        
        # Return up to 3 best sizes, remove scores
        result = []
        for i, size in enumerate(sorted_sizes[:3]):
            result.append({
                'width_inches': size['width_inches'],
                'height_inches': size['height_inches']
            })
        
        return result

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
            print(f"  📸 Processing local file: {local_path}")
            
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
            print(f"  ❌ Error: {e}")
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
        
        print(f"🎨 Processing artwork data from: {input_file}")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"📁 Image directory: {self.image_dir}")
        print("-" * 60)
        
        # Load existing JSON
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                artworks_list = json.load(f)
        except Exception as e:
            print(f"❌ Error loading JSON file: {e}")
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
            
            print(f"\n🖼️  Processing: {title}")
            if title_en:
                print(f"   English: {title_en}")
            
            # Calculate optimal sizes
            optimal_sizes = self.calculate_optimal_sizes(artwork)
            
            if not optimal_sizes:
                print(f"  ❌ Could not calculate sizes for {title}")
                error_count += 1
                continue
            
            # Find local image files
            image_paths = self.get_local_image_paths(artwork_id)
            
            if not image_paths:
                print(f"  ❌ Large image file not found for: {artwork_id}")
                # Still add the artwork with size recommendations but no image data
                recommendations[artwork_id] = {
                    'artwork_info': {
                        'id': artwork_id,
                        'title': title,
                        'title_en': title_en,
                        'original_size_cm': artwork.get('sizeCm', '')
                    },
                    'recommended_sizes': optimal_sizes
                }
                error_count += 1
                continue
            
            print(f"  ✅ Found large image: {image_paths['large_filename']}")
            if image_paths['thumb_exists']:
                print(f"  ✅ Found thumbnail: {image_paths['thumb_filename']}")
            
            # Get image metadata from local file
            image_info = self.get_image_info(image_paths['large_path'], image_paths['large_url'])
            
            if image_info:
                # Create Finer Works metadata
                finerworks_metadata = self.create_finerworks_metadata(
                    artwork_id, image_paths, image_info, artwork, optimal_sizes
                )
                
                # Add to recommendations
                recommendations[artwork_id] = {
                    'artwork_info': {
                        'id': artwork_id,
                        'title': title,
                        'title_en': title_en,
                        'original_size_cm': artwork.get('sizeCm', '')
                    },
                    'recommended_sizes': optimal_sizes,
                    'finerworks_image': finerworks_metadata
                }
                
                print(f"  📏 Dimensions: {image_info['pix_w']}×{image_info['pix_h']}")
                print(f"  📦 File size: {finerworks_metadata['file_size_mb']} MB")
                print(f"  🎯 Recommended sizes: {len(optimal_sizes)}")
                for i, size in enumerate(optimal_sizes):
                    print(f"    Size {i+1}: {size['width_inches']}×{size['height_inches']}\"")
                print(f"  ✅ Complete metadata added")
                
                processed_count += 1
            else:
                # Add without image metadata
                recommendations[artwork_id] = {
                    'artwork_info': {
                        'id': artwork_id,
                        'title': title,
                        'title_en': title_en,
                        'original_size_cm': artwork.get('sizeCm', '')
                    },
                    'recommended_sizes': optimal_sizes
                }
                error_count += 1
        
        # Save updated JSON
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(recommendations, f, ensure_ascii=False, indent=2)
            
            print(f"\n" + "="*60)
            print(f"✅ Processing complete!")
            print(f"📊 Results:")
            print(f"   • Processed: {processed_count} artworks with complete data")
            print(f"   • Partial: {error_count} artworks (missing images or size data)")
            print(f"   • Total: {len(recommendations)} artworks in output")
            print(f"   • Success rate: {processed_count/(processed_count+error_count)*100:.1f}%")
            print(f"💾 Updated file saved as: {output_file}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error saving file: {e}")
            return False

def main():
    """Main execution function"""
    
    # Check if JSON file exists
    input_file = "artworks-singleview_short.json"
    if not os.path.exists(input_file):
        print(f"❌ File not found: {input_file}")
        print("Please make sure the JSON file is in the current directory.")
        return
    
    # Create processor and process
    processor = CombinedFinerWorksProcessor()
    
    success = processor.process_artworks(input_file, "finerworks_ready_artworks_short.json")
    
    if success:
        print(f"\n🎉 All done! You can now use the updated JSON for Finer Works API testing.")
        print(f"Next steps:")
        print(f"  1. Review the updated JSON file")
        print(f"  2. Test image upload with a few samples")
        print(f"  3. Integrate into your website workflow")
    else:
        print(f"\n❌ Processing failed. Please check the errors above.")

if __name__ == "__main__":
    main()
