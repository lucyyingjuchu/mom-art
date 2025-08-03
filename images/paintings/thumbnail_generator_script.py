#!/usr/bin/env python3
"""
Local Thumbnail Generator for Chinese Art Portfolio
Generates missing thumbnails from existing large images

Requirements:
- pip install Pillow requests

Usage:
1. Place this script in your project root (same level as images/ folder)
2. Run: python generate_thumbnails.py
"""

import os
import json
from PIL import Image
import requests
from pathlib import Path
import time

class ThumbnailGenerator:
    def __init__(self):
        self.base_dir = Path(".")
        self.large_dir = self.base_dir / "images" / "paintings" / "large"
        self.thumb_dir = self.base_dir / "images" / "paintings" / "thumbnails"
        self.data_file = self.base_dir / "data" / "artworks.json"
        
        # Create directories if they don't exist
        self.thumb_dir.mkdir(parents=True, exist_ok=True)
        
        self.processed = 0
        self.generated = 0
        self.errors = 0
        
    def load_artworks(self):
        """Load artworks from JSON file"""
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                artworks = json.load(f)
            print(f"✅ Loaded {len(artworks)} artworks from JSON")
            return artworks
        except Exception as e:
            print(f"❌ Error loading artworks: {e}")
            return []
    
    def find_large_image(self, artwork_id):
        """Find the large image file for an artwork ID"""
        # Try different possible filenames
        possible_names = [
            f"{artwork_id}_large.png",
            f"{artwork_id}_large.jpg", 
            f"{artwork_id}.png",
            f"{artwork_id}.jpg"
        ]
        
        for name in possible_names:
            file_path = self.large_dir / name
            if file_path.exists():
                return file_path
        
        return None
    
    def generate_thumbnail(self, large_image_path, artwork_id):
        """Generate a 400px thumbnail from large image"""
        try:
            # Open and process image
            with Image.open(large_image_path) as img:
                # Convert to RGB if needed (handles RGBA, etc.)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Get current dimensions
                width, height = img.size
                
                # Calculate new dimensions (max 800px on longest side)
                max_size = 800
                if width > height:
                    if width > max_size:
                        height = int(height * max_size / width)
                        width = max_size
                else:
                    if height > max_size:
                        width = int(width * max_size / height)
                        height = max_size
                
                # Only resize if needed
                if width != img.width or height != img.height:
                    img = img.resize((width, height), Image.Resampling.LANCZOS)
                
                # Save as PNG (consistent with website)
                thumb_path = self.thumb_dir / f"{artwork_id}_thumb.png"
                img.save(thumb_path, "PNG", optimize=True)
                
                return thumb_path
                
        except Exception as e:
            print(f"❌ Error generating thumbnail for {artwork_id}: {e}")
            return None
    
    def update_artwork_paths(self, artworks):
        """Update artwork JSON with correct image paths"""
        updated_count = 0
        
        for artwork in artworks:
            artwork_id = artwork.get('id', '')
            if not artwork_id:
                continue
                
            # Check if thumbnail exists
            thumb_path = self.thumb_dir / f"{artwork_id}_thumb.png"
            large_path = self.find_large_image(artwork_id)
            
            # Update paths if files exist
            if thumb_path.exists():
                artwork['image'] = f"./images/paintings/thumbnails/{artwork_id}_thumb.png"
                updated_count += 1
                
            if large_path:
                artwork['imageHigh'] = f"./images/paintings/large/{large_path.name}"
        
        print(f"📄 Updated {updated_count} artwork image paths")
        return artworks
    
    def save_artworks(self, artworks):
        """Save updated artworks back to JSON"""
        try:
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(artworks, f, indent=2, ensure_ascii=False)
            print(f"💾 Saved updated artworks.json")
        except Exception as e:
            print(f"❌ Error saving artworks: {e}")
    
    def run(self):
        """Main processing function"""
        print("🎨 Local Thumbnail Generator Starting...")
        print("=" * 50)
        
        # Load artworks
        artworks = self.load_artworks()
        if not artworks:
            return
        
        print(f"📁 Looking for large images in: {self.large_dir}")
        print(f"📁 Will save thumbnails to: {self.thumb_dir}")
        print()
        
        # Process each artwork
        for artwork in artworks:
            artwork_id = artwork.get('id', '')
            artwork_title = artwork.get('title', 'Untitled')
            
            if not artwork_id:
                continue
            
            self.processed += 1
            print(f"🔍 Processing {self.processed}/{len(artworks)}: {artwork_id} - {artwork_title}")
            
            # Check if thumbnail already exists
            thumb_path = self.thumb_dir / f"{artwork_id}_thumb.png"
            if thumb_path.exists():
                print(f"   ✅ Thumbnail already exists")
                continue
            
            # Find large image
            large_image_path = self.find_large_image(artwork_id)
            if not large_image_path:
                print(f"   ⚠️  No large image found")
                continue
            
            # Generate thumbnail
            print(f"   📸 Generating thumbnail from {large_image_path.name}")
            result = self.generate_thumbnail(large_image_path, artwork_id)
            
            if result:
                file_size = result.stat().st_size
                print(f"   ✅ Generated thumbnail ({file_size//1024}KB)")
                self.generated += 1
            else:
                print(f"   ❌ Failed to generate thumbnail")
                self.errors += 1
            
            # Small delay to be nice to system
            time.sleep(0.1)
        
        print()
        print("=" * 50)
        print(f"📊 Processing Summary:")
        print(f"   • Artworks processed: {self.processed}")
        print(f"   • Thumbnails generated: {self.generated}")
        print(f"   • Errors: {self.errors}")
        print(f"   • Success rate: {(self.generated/(self.processed-self.errors)*100):.1f}%" if self.processed > self.errors else "N/A")
        
        # Update JSON with correct paths
        print()
        print("📄 Updating artworks.json with correct image paths...")
        updated_artworks = self.update_artwork_paths(artworks)
        self.save_artworks(updated_artworks)
        
        print()
        print("🎉 Thumbnail generation complete!")
        print("📋 Next steps:")
        print("   1. Review generated thumbnails in images/paintings/thumbnails/")
        print("   2. Commit and push changes to GitHub")
        print("   3. Netlify will auto-deploy the updated website")

def main():
    """Main entry point"""
    generator = ThumbnailGenerator()
    
    # Check if we're in the right directory
    if not generator.data_file.exists():
        print("❌ Error: artworks.json not found!")
        print("📁 Please run this script from your project root directory")
        print("   (where you can see the images/ and data/ folders)")
        return
    
    if not generator.large_dir.exists():
        print("❌ Error: Large images directory not found!")
        print(f"📁 Expected: {generator.large_dir}")
        return
    
    # Count existing files
    large_files = list(generator.large_dir.glob("*.png")) + list(generator.large_dir.glob("*.jpg"))
    existing_thumbs = list(generator.thumb_dir.glob("*_thumb.png"))
    
    print(f"📊 Found {len(large_files)} large images")
    print(f"📊 Found {len(existing_thumbs)} existing thumbnails")
    print(f"📊 Estimated {len(large_files) - len(existing_thumbs)} thumbnails to generate")
    print()
    
    # Confirm before processing
    response = input("🚀 Proceed with thumbnail generation? (y/n): ").lower().strip()
    if response != 'y':
        print("❌ Cancelled by user")
        return
    
    generator.run()

if __name__ == "__main__":
    main()