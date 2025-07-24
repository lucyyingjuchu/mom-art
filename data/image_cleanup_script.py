#!/usr/bin/env python3
"""
Artwork Image Cleanup Script
============================
This script removes orphaned images from the images/paintings/thumbnails/ folder
that don't have corresponding entries in artworks.json.

Usage: python cleanup_orphaned_images.py
"""

import json
import os
import re
from pathlib import Path

def load_artwork_ids(json_file="artworks.json"):
    """Load all artwork IDs from the JSON file."""
    # Get the directory where the script is located
    script_dir = Path(__file__).parent
    json_path = script_dir / json_file
    
    print(f"🔍 Looking for {json_file} at: {json_path.absolute()}")
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            artworks = json.load(f)
        
        artwork_ids = {artwork['id'] for artwork in artworks}
        print(f"✅ Loaded {len(artwork_ids)} artwork IDs from {json_file}")
        return artwork_ids
    
    except FileNotFoundError:
        print(f"❌ Error: {json_file} not found at {json_path.absolute()}!")
        print(f"📁 Current working directory: {Path.cwd()}")
        print(f"📁 Script directory: {script_dir.absolute()}")
        return set()
    except json.JSONDecodeError:
        print(f"❌ Error: Invalid JSON in {json_file}")
        return set()

def extract_id_from_filename(filename):
    """
    Extract artwork ID from image filename.
    Examples:
    - "2017_001_thumb.png" -> "2017_001"
    - "2022.8_001_thumb.png" -> "2022.8_001"
    - "unknown_008_thumb.jpg" -> "unknown_008"
    """
    # Remove file extension
    name_without_ext = os.path.splitext(filename)[0]
    
    # Pattern to match artwork ID (everything before "_thumb")
    match = re.match(r'^(.+)_thumb$', name_without_ext)
    if match:
        return match.group(1)
    
    # If no "_thumb" suffix, try to extract ID pattern directly
    # This handles cases like "2017_001.png" without "_thumb"
    id_patterns = [
        r'^(\d{4}_\d{3}).*',           # 2017_001
        r'^(\d{4}\.\d+_\d{3}).*',      # 2022.8_001  
        r'^(unknown_\d{3}).*'          # unknown_008
    ]
    
    for pattern in id_patterns:
        match = re.match(pattern, name_without_ext)
        if match:
            return match.group(1)
    
    return None

def scan_images_folder(images_path="../images/paintings/thumbnails/"):
    """Scan the images folder and return all image files."""
    # Convert to Path object and make it relative to script directory
    script_dir = Path(__file__).parent
    images_dir = script_dir / images_path if not Path(images_path).is_absolute() else Path(images_path)
    
    print(f"🔍 Looking for images at: {images_dir.absolute()}")
    
    if not images_dir.exists():
        print(f"❌ Error: Images directory '{images_dir.absolute()}' not found!")
        print(f"📁 Current working directory: {Path.cwd()}")
        return []
    
    # Common image extensions
    image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}
    
    image_files = []
    for file_path in images_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in image_extensions:
            image_files.append(file_path)
    
    print(f"📁 Found {len(image_files)} image files in {images_dir}")
    return image_files

def cleanup_orphaned_images(dry_run=True):
    """
    Main cleanup function.
    
    Args:
        dry_run (bool): If True, only show what would be deleted without actually deleting
    """
    print("🧹 Starting artwork image cleanup...")
    print("=" * 50)
    
    # Load artwork IDs
    artwork_ids = load_artwork_ids()
    if not artwork_ids:
        print("❌ No artwork IDs loaded. Exiting.")
        return
    
    # Scan images folder
    image_files = scan_images_folder()
    if not image_files:
        print("❌ No image files found. Exiting.")
        return
    
    # Analyze each image file
    orphaned_files = []
    matched_files = []
    unrecognized_files = []
    
    for image_file in image_files:
        filename = image_file.name
        extracted_id = extract_id_from_filename(filename)
        
        if extracted_id is None:
            unrecognized_files.append(image_file)
            print(f"❓ Unrecognized pattern: {filename}")
        elif extracted_id in artwork_ids:
            matched_files.append(image_file)
            print(f"✅ Valid: {filename} -> {extracted_id}")
        else:
            orphaned_files.append(image_file)
            print(f"🗑️  Orphaned: {filename} -> {extracted_id} (not in artworks.json)")
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 CLEANUP SUMMARY:")
    print(f"   ✅ Valid images: {len(matched_files)}")
    print(f"   🗑️  Orphaned images: {len(orphaned_files)}")
    print(f"   ❓ Unrecognized patterns: {len(unrecognized_files)}")
    
    if orphaned_files:
        print(f"\n🗑️  ORPHANED FILES TO BE DELETED:")
        for file_path in orphaned_files:
            print(f"   - {file_path.name}")
    
    if unrecognized_files:
        print(f"\n❓ UNRECOGNIZED FILES (will be skipped):")
        for file_path in unrecognized_files:
            print(f"   - {file_path.name}")
    
    # Delete orphaned files
    if orphaned_files and not dry_run:
        print(f"\n🔥 DELETING {len(orphaned_files)} orphaned files...")
        deleted_count = 0
        for file_path in orphaned_files:
            try:
                file_path.unlink()  # Delete the file
                print(f"   ✅ Deleted: {file_path.name}")
                deleted_count += 1
            except Exception as e:
                print(f"   ❌ Failed to delete {file_path.name}: {e}")
        
        print(f"\n🎉 Successfully deleted {deleted_count} orphaned files!")
    
    elif orphaned_files and dry_run:
        print(f"\n🔍 DRY RUN MODE: No files were actually deleted.")
        print(f"   Run with --execute to actually delete {len(orphaned_files)} orphaned files.")

if __name__ == "__main__":
    import sys
    
    # Check for --execute flag
    execute_mode = "--execute" in sys.argv
    
    if execute_mode:
        print("⚠️  EXECUTE MODE: Files will be permanently deleted!")
        response = input("Are you sure you want to proceed? (yes/no): ")
        if response.lower() != 'yes':
            print("❌ Operation cancelled.")
            sys.exit(0)
        cleanup_orphaned_images(dry_run=False)
    else:
        print("🔍 DRY RUN MODE: Showing what would be deleted (no files will be harmed)")
        print("   Add --execute flag to actually delete orphaned files")
        cleanup_orphaned_images(dry_run=True)
    
    print("\n✨ Cleanup complete!")