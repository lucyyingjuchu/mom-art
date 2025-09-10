#!/usr/bin/env python3
"""
Hybrid Finer Works API Processor
Supports both GitHub (low-res) and AWS S3 (high-res) storage
Gradually expand print-ready artworks one by one
"""

import json
import math
import os
import sys
from pathlib import Path
from PIL import Image
from urllib.parse import urljoin
import logging
import boto3
from botocore.exceptions import ClientError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HybridFinerWorksProcessor:
    def __init__(self, 
                 base_url="https://xiaoran.netlify.app/", 
                 github_image_dir="images/paintings/large",
                 s3_bucket_name="xiaoran-high-res-artworks",
                 s3_region="us-east-1"):
        self.base_url = base_url.rstrip('/') + '/'
        self.github_image_dir = github_image_dir
        self.s3_bucket_name = s3_bucket_name
        self.s3_region = s3_region
        self.REQUIRED_PPI = 200  # Lowered from 300 based on your needs
        
        # Initialize S3 client (will use AWS credentials from environment/config)
        try:
            self.s3_client = boto3.client('s3', region_name=s3_region)
        except Exception as e:
            logger.warning(f"Could not initialize S3 client: {e}")
            self.s3_client = None
    
    def check_s3_object_exists(self, artwork_id):
        """Check if high-res version exists in S3"""
        if not self.s3_client:
            return False
            
        try:
            key = f"high-res/{artwork_id}_large.jpg"
            self.s3_client.head_object(Bucket=self.s3_bucket_name, Key=key)
            return True
        except ClientError:
            return False
    
    def get_s3_image_url(self, artwork_id):
        """Get S3 URL for high-res image"""
        return f"https://{self.s3_bucket_name}.s3.{self.s3_region}.amazonaws.com/high-res/{artwork_id}_large.jpg"
    
    def get_image_dimensions_and_source(self, artwork_id):
        """Get pixel dimensions and determine best source (S3 or GitHub)"""
        # First check if high-res version exists in S3
        has_s3_version = self.check_s3_object_exists(artwork_id)
        
        # Always try to read from local GitHub version for dimensions
        github_paths = self.get_github_image_paths(artwork_id)
        
        if not github_paths:
            logger.warning(f"No local image found for artwork: {artwork_id}")
            return None, None, None
            
        try:
            with Image.open(github_paths['large_path']) as img:
                width, height = img.size
                
                # Determine which source to use for print
                if has_s3_version:
                    source = "s3"
                    print_url = self.get_s3_image_url(artwork_id)
                    logger.info(f"Found S3 high-res version for {artwork_id}")
                else:
                    source = "github"
                    print_url = github_paths['large_url']
                    logger.info(f"Using GitHub version for {artwork_id}")
                
                return width, height, {
                    'source': source,
                    'print_url': print_url,
                    'web_url': github_paths['large_url'],
                    'has_high_res': has_s3_version
                }
                
        except Exception as e:
            logger.error(f"Error reading image dimensions for {artwork_id}: {e}")
            return None, None, None

    def calculate_max_print_size_at_ppi(self, pixel_width, pixel_height):
        """Calculate maximum print size at required PPI"""
        max_width_inches = pixel_width / self.REQUIRED_PPI
        max_height_inches = pixel_height / self.REQUIRED_PPI
        
        # Round down to ensure we don't exceed PPI requirement
        max_width_inches = math.floor(max_width_inches * 10) / 10
        max_height_inches = math.floor(max_height_inches * 10) / 10
        
        return max_width_inches, max_height_inches

    def generate_size_options_at_ppi(self, max_width_inches, max_height_inches):
        """Generate size options while maintaining required PPI"""
        sizes = []
        original_ratio = max_width_inches / max_height_inches
        
        # Generate target sizes
        max_dimension = max(max_width_inches, max_height_inches)
        
        if max_dimension >= 18:
            target_sizes = [12, 15, int(max_dimension)]
        elif max_dimension >= 12:
            target_sizes = [8, 12, int(max_dimension)]
        else:
            target_sizes = [6, int(max_dimension * 0.8), int(max_dimension)]
        
        for target_size in target_sizes:
            if original_ratio > 1:
                width = target_size
                height = width / original_ratio
            else:
                height = target_size
                width = height * original_ratio
            
            # Round to integers
            width_rounded = round(width)
            height_rounded = round(height)
            
            # Verify ratio consistency
            new_ratio = width_rounded / height_rounded
            if abs(new_ratio - original_ratio) > 0.1:
                if original_ratio > 1:
                    height_rounded = round(width_rounded / original_ratio)
                else:
                    width_rounded = round(height_rounded * original_ratio)
            
            # Check constraints
            if (width_rounded <= max_width_inches and height_rounded <= max_height_inches and
                width_rounded >= 6 and height_rounded >= 6):
                
                sizes.append({
                    'width_inches': width_rounded,
                    'height_inches': height_rounded
                })
        
        # Remove duplicates and return up to 3
        unique_sizes = {}
        for size in sizes:
            key = f"{size['width_inches']}x{size['height_inches']}"
            if key not in unique_sizes:
                unique_sizes[key] = size
        
        sorted_sizes = sorted(unique_sizes.values(), 
                            key=lambda x: x['width_inches'] * x['height_inches'], 
                            reverse=True)
        
        return sorted_sizes[:3]

    def clean_artwork_data(self, artwork):
        """Clean artwork data - remove old fields and ensure new structure"""
        cleaned = artwork.copy()
        
        # Remove old/deprecated fields
        fields_to_remove = ['sizeCm', 'sizeInches', 'mediumEn', 'recent', 'exhibitions', 'tags']
        for field in fields_to_remove:
            cleaned.pop(field, None)
        
        return cleaned

    def get_github_image_paths(self, artwork_id):
        """Get GitHub image paths - same as before"""
        for ext in ['.png', '.jpg']:
            large_filename = f"{artwork_id}_large{ext}"
            large_path = os.path.join(self.github_image_dir, large_filename)
            
            if os.path.exists(large_path):
                large_url = urljoin(self.base_url, f"{self.github_image_dir}/{large_filename}")
                
                thumb_filename = f"{artwork_id}_thumb{ext}"
                thumb_path = os.path.join("images/paintings/thumbnails", thumb_filename)
                thumb_url = urljoin(self.base_url, f"images/paintings/thumbnails/{thumb_filename}")
                
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

    def get_image_info(self, local_path, source_info):
        """Extract metadata from local image file"""
        try:
            print(f"  Processing: {local_path}")
            
            # Get file size (from GitHub version for reference)
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
                'source': source_info['source'],
                'print_url': source_info['print_url'],
                'web_url': source_info['web_url'],
                'has_high_res': source_info['has_high_res']
            }
            
        except Exception as e:
            print(f"  Error: {e}")
            return None

    def create_finerworks_metadata(self, artwork_id, github_paths, image_info, artwork_data, recommended_sizes):
        """Create Finer Works compatible metadata with hybrid storage support"""
        
        title = artwork_data.get('title', 'Untitled')
        title_en = artwork_data.get('titleEn', '')
        description = f"Traditional Chinese painting by Xiaoran. {title_en}" if title_en else f"Traditional Chinese painting: {title}"
        
        # Use the appropriate URL based on source
        print_image_url = image_info['print_url']
        
        # Create the image object for Finer Works API
        finerworks_image = {
            "title": title,
            "description": description,
            "file_name": github_paths['large_filename'],
            "file_size": image_info['file_size'],
            "pix_w": image_info['pix_w'],
            "pix_h": image_info['pix_h'],
            "hires_file_name": github_paths['large_filename'],
            "private_hires_uri": print_image_url  # This will be S3 URL if available
        }
        
        # Add thumbnail info
        if github_paths['thumb_exists']:
            finerworks_image.update({
                "thumbnail_file_name": github_paths['thumb_filename'],
                "public_thumbnail_uri": github_paths['thumb_url']
            })
        
        # Preview uses web version (GitHub)
        finerworks_image.update({
            "preview_file_name": github_paths['large_filename'],
            "public_preview_uri": image_info['web_url']
        })
        
        # Add metadata
        metadata = {
            "finerworks_api_object": finerworks_image,
            "format": image_info['format'],
            "dimensions_text": f"{image_info['pix_w']}×{image_info['pix_h']}",
            "file_size_mb": round(image_info['file_size'] / (1024 * 1024), 2),
            "has_thumbnail": github_paths['thumb_exists'],
            "storage_source": image_info['source'],
            "has_high_res_version": image_info['has_high_res']
        }
        
        return metadata

    def upload_to_s3(self, local_file_path, artwork_id):
        """Upload high-res image to S3"""
        if not self.s3_client:
            logger.error("S3 client not available")
            return False
            
        try:
            key = f"high-res/{artwork_id}_large.jpg"
            
            # Upload with public read access
            self.s3_client.upload_file(
                local_file_path, 
                self.s3_bucket_name, 
                key,
                ExtraArgs={
                    'ACL': 'public-read',
                    'ContentType': 'image/jpeg'
                }
            )
            
            logger.info(f"Successfully uploaded {artwork_id} to S3")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upload {artwork_id} to S3: {e}")
            return False

    def process_artworks(self, input_file, output_file=None):
        """Process artworks with hybrid storage support"""
        
        print(f"Processing artwork data from: {input_file}")
        print(f"GitHub URL: {self.base_url}")
        print(f"S3 Bucket: {self.s3_bucket_name}")
        print(f"Required PPI: {self.REQUIRED_PPI}")
        print("-" * 60)
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                artworks_list = json.load(f)
        except Exception as e:
            print(f"Error loading JSON file: {e}")
            return False
        
        if output_file is None:
            output_file = f"finerworks_ready_{os.path.basename(input_file)}"
        
        processed_count = 0
        print_ready_count = 0
        web_only_count = 0
        recommendations = {}
        
        print(f"Analyzing {len(artworks_list)} artworks...")
        
        for artwork in artworks_list:
            artwork_id = artwork['id']
            title = artwork.get('title', 'Unknown')
            title_en = artwork.get('titleEn', '')
            
            print(f"\nProcessing: {title}")
            if title_en:
                print(f"   English: {title_en}")
            
            # Clean artwork data
            cleaned_artwork = self.clean_artwork_data(artwork)
            
            # Get dimensions and source info
            pixel_width, pixel_height, source_info = self.get_image_dimensions_and_source(artwork_id)
            
            if not pixel_width or not pixel_height:
                print(f"  Could not get dimensions for {title}")
                continue
            
            # Calculate print sizes
            max_width_inches, max_height_inches = self.calculate_max_print_size_at_ppi(pixel_width, pixel_height)
            optimal_sizes = self.generate_size_options_at_ppi(max_width_inches, max_height_inches)
            
            github_paths = self.get_github_image_paths(artwork_id)
            if not github_paths:
                continue
                
            image_info = self.get_image_info(github_paths['large_path'], source_info)
            if not image_info:
                continue
            
            # Determine if print-ready
            can_print = len(optimal_sizes) > 0
            
            if can_print:
                # Create full metadata for print-ready artworks
                finerworks_metadata = self.create_finerworks_metadata(
                    artwork_id, github_paths, image_info, cleaned_artwork, optimal_sizes
                )
                
                recommendations[artwork_id] = {
                    'artwork_info': {
                        'id': artwork_id,
                        'title': title,
                        'title_en': title_en,
                        'original_size_cm': f"{cleaned_artwork.get('heightCm', '')}×{cleaned_artwork.get('widthCm', '')}"
                    },
                    'recommended_sizes': optimal_sizes,
                    'finerworks_image': finerworks_metadata,
                    'print_ready': True
                }
                
                print(f"  ✅ PRINT READY - {image_info['source'].upper()} source")
                print(f"  Max size: {max_width_inches:.1f}×{max_height_inches:.1f}\"")
                print(f"  Size options: {len(optimal_sizes)}")
                print_ready_count += 1
                
            else:
                # Web-only artwork
                recommendations[artwork_id] = {
                    'artwork_info': {
                        'id': artwork_id,
                        'title': title,
                        'title_en': title_en,
                        'original_size_cm': f"{cleaned_artwork.get('heightCm', '')}×{cleaned_artwork.get('widthCm', '')}"
                    },
                    'print_ready': False,
                    'reason': f"Insufficient resolution for {self.REQUIRED_PPI} PPI printing"
                }
                
                print(f"  📱 WEB ONLY - resolution too low for printing")
                web_only_count += 1
            
            processed_count += 1
        
        # Save results
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(recommendations, f, ensure_ascii=False, indent=2)
            
            print(f"\n" + "="*60)
            print(f"Processing complete!")
            print(f"Results:")
            print(f"   • Print-ready: {print_ready_count} artworks")
            print(f"   • Web-only: {web_only_count} artworks")
            print(f"   • Total processed: {processed_count}")
            print(f"   • Print percentage: {print_ready_count/processed_count*100:.1f}%")
            print(f"Output saved: {output_file}")
            
            return True
            
        except Exception as e:
            print(f"Error saving file: {e}")
            return False

def main():
    """Main execution function"""
    
    input_file = "../artworks.json"
    if not os.path.exists(input_file):
        print(f"File not found: {input_file}")
        return
    
    # You'll need to set up AWS credentials first
    processor = HybridFinerWorksProcessor(
        s3_bucket_name="xiaoran-high-res-artworks",  # Change this to your bucket name
        s3_region="us-east-1"  # Change this to your preferred region
    )
    
    success = processor.process_artworks(input_file, "finerworks_ready_artworks.json")
    
    if success:
        print(f"\nNext steps:")
        print(f"1. Set up AWS S3 bucket")
        print(f"2. Upload high-res versions of selected artworks")
        print(f"3. Re-run processor to pick up S3 versions")
        print(f"4. Test with Finerworks API")

if __name__ == "__main__":
    main()
