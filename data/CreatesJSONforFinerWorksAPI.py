#!/usr/bin/env python3
"""
Image Metadata Extractor for Xiaoran's Traditional Chinese Paintings
Extracts image dimensions and file sizes for Finer Works API integration
"""

import json
import os
import sys
from PIL import Image
from urllib.parse import urljoin
from pathlib import Path

class ImageMetadataExtractor:
    def __init__(self, base_url="https://xiaoran.netlify.app/", image_dir="images/paintings/large"):
        self.base_url = base_url.rstrip('/') + '/'
        self.image_dir = image_dir
    
    def get_local_image_paths(self, artwork_id):
        """Get local image paths and URLs for artwork ID"""
        # Main large image
        large_filename = f"{artwork_id}_large.png"
        large_path = os.path.join(self.image_dir, large_filename)
        large_url = urljoin(self.base_url, f"{self.image_dir}/{large_filename}")
        
        # Thumbnail image
        thumb_filename = f"{artwork_id}_thumb.png"
        thumb_path = os.path.join("images/paintings/thumbnails", thumb_filename)
        thumb_url = urljoin(self.base_url, f"images/paintings/thumbnails/{thumb_filename}")
        
        # Check if files exist
        large_exists = os.path.exists(large_path)
        thumb_exists = os.path.exists(thumb_path)
        
        if large_exists:
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
            print(f"  📁 Processing local file: {local_path}")
            
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
    
    def create_finerworks_metadata(self, artwork_id, image_paths, image_info, artwork_data):
        """Create Finer Works compatible metadata based on their API example"""
        
        # Get artwork info
        title = artwork_data['artwork_info'].get('title', 'Untitled')
        title_en = artwork_data['artwork_info'].get('title_en', '')
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
    
    def process_artwork_json(self, json_file_path, output_file=None):
        """Process the artwork JSON and add image metadata"""
        
        print(f"🎨 Processing artwork metadata from: {json_file_path}")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"📁 Image directory: {self.image_dir}")
        print("-" * 60)
        
        # Load existing JSON
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"❌ Error loading JSON file: {e}")
            return False
        
        processed_count = 0
        error_count = 0
        
        # Process each artwork
        for artwork_id, artwork_data in data.items():
            title = artwork_data['artwork_info'].get('title', 'Unknown')
            title_en = artwork_data['artwork_info'].get('title_en', '')
            
            print(f"\n🖼️  Processing: {title}")
            if title_en:
                print(f"   English: {title_en}")
            
            # Find local image files
            image_paths = self.get_local_image_paths(artwork_id)
            
            if not image_paths:
                print(f"  ❌ Large image file not found: {self.image_dir}/{artwork_id}_large.png")
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
                    artwork_id, image_paths, image_info, artwork_data
                )
                
                # Add to artwork data
                artwork_data['finerworks_image'] = finerworks_metadata
                
                print(f"  📏 Dimensions: {image_info['pix_w']}×{image_info['pix_h']}")
                print(f"  📦 File size: {finerworks_metadata['file_size_mb']} MB")
                print(f"  📝 Title: {finerworks_metadata['finerworks_api_object']['title']}")
                print(f"  ✅ Metadata added")
                
                processed_count += 1
            else:
                error_count += 1
            
            # No delay needed for local processing
        
        # Save updated JSON
        if output_file is None:
            output_file = f"updated_{os.path.basename(json_file_path)}"
        
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"\n" + "="*60)
            print(f"✅ Processing complete!")
            print(f"📊 Results:")
            print(f"   • Processed: {processed_count} artworks")
            print(f"   • Errors: {error_count} artworks")
            print(f"   • Success rate: {processed_count/(processed_count+error_count)*100:.1f}%")
            print(f"💾 Updated file saved as: {output_file}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error saving file: {e}")
            return False

def main():
    """Main execution function"""
    
    # Check if JSON file exists
    json_file = "finerworks_size_recommendations.json"
    if not os.path.exists(json_file):
        print(f"❌ File not found: {json_file}")
        print("Please make sure the JSON file is in the current directory.")
        return
    
    # Create extractor and process
    extractor = ImageMetadataExtractor()
    
    success = extractor.process_artwork_json(json_file)
    
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
