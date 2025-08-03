#!/usr/bin/env python3
"""
Script 2: ID Reorderer  
=====================
1. Count artworks by year and identify gaps
2. Create sequential ID mapping (fill gaps)
3. Move files to temp folders
4. Move files back with new sequential names
5. Update JSON with new IDs

Usage: python id_reorderer.py
"""

import json
import shutil
from pathlib import Path
from collections import defaultdict

class IDReorderer:
    def __init__(self):
        self.base_dir = Path(".")
        self.data_file = self.base_dir / "data" / "artworks.json"
        self.thumb_dir = self.base_dir / "images" / "paintings" / "thumbnails"
        self.large_dir = self.base_dir / "images" / "paintings" / "large"
        
        # Temp folders
        self.temp_thumb_dir = self.base_dir / "images" / "paintings" / "thumbnails-temp"
        self.temp_large_dir = self.base_dir / "images" / "paintings" / "large-temp"
        
    def load_artworks(self):
        """Load artworks from JSON"""
        with open(self.data_file, 'r', encoding='utf-8') as f:
            artworks = json.load(f)
        print(f"✅ Loaded {len(artworks)} artworks")
        return artworks
    
    def analyze_current_ids(self, artworks):
        """Analyze current IDs and show gaps"""
        print("\n📊 Analyzing current IDs...")
        
        # Group by year
        year_groups = defaultdict(list)
        for artwork in artworks:
            year = artwork.get('year', 'unknown')
            year_groups[year].append(artwork)
        
        # Analyze each year
        print(f"\n📋 Current ID Distribution:")
        print(f"{'Year':<10} {'Count':<6} {'Current IDs':<30} {'Gaps'}")
        print("-" * 70)
        
        for year in sorted(year_groups.keys(), key=lambda x: int(x) if str(x).isdigit() else 9999):
            year_artworks = year_groups[year]
            
            # Extract current numbers
            current_numbers = []
            for artwork in year_artworks:
                artwork_id = artwork.get('id', '')
                if year == 'unknown':
                    if artwork_id.startswith('unknown_'):
                        try:
                            num = int(artwork_id.split('_')[1])
                            current_numbers.append(num)
                        except:
                            pass
                else:
                    if artwork_id.startswith(f"{year}_"):
                        try:
                            num = int(artwork_id.split('_')[1])
                            current_numbers.append(num)
                        except:
                            pass
            
            current_numbers.sort()
            
            # Find gaps
            if current_numbers:
                expected = list(range(1, len(current_numbers) + 1))
                gaps = [f"{year}_{num:03d}" for num in expected if num not in current_numbers]
                gaps_str = ", ".join(gaps[:5])  # Show first 5 gaps
                if len(gaps) > 5:
                    gaps_str += f" +{len(gaps)-5} more"
            else:
                gaps_str = "None"
            
            current_str = ", ".join([f"{year}_{num:03d}" for num in current_numbers[:3]])
            if len(current_numbers) > 3:
                current_str += f" +{len(current_numbers)-3} more"
            
            print(f"{year:<10} {len(year_artworks):<6} {current_str:<30} {gaps_str}")
        
        return year_groups
    
    def create_sequential_mapping(self, year_groups):
        """Create old_id → new_id mapping with sequential numbering"""
        print(f"\n🔢 Creating sequential ID mapping...")
        
        id_mapping = {}  # old_id → new_id
        artwork_mapping = {}  # old_id → artwork
        
        # Process each year
        for year in sorted(year_groups.keys(), key=lambda x: int(x) if str(x).isdigit() else 9999):
            year_artworks = year_groups[year]
            
            # Sort artworks within year by title  
            sorted_artworks = sorted(year_artworks, key=lambda x: x.get('title', ''))
            
            print(f"\n📅 {year}: {len(sorted_artworks)} artworks")
            
            # Assign sequential IDs
            for index, artwork in enumerate(sorted_artworks, 1):
                old_id = artwork.get('id', '')
                
                if year == 'unknown':
                    new_id = f"unknown_{index:03d}"
                else:
                    new_id = f"{year}_{index:03d}"
                
                id_mapping[old_id] = new_id
                artwork_mapping[old_id] = artwork
                
                if old_id != new_id:
                    print(f"  🔄 {old_id} → {new_id}: {artwork.get('title', 'Untitled')}")
                else:
                    print(f"  ✅ {new_id}: {artwork.get('title', 'Untitled')} (no change)")
        
        changes = sum(1 for old, new in id_mapping.items() if old != new)
        print(f"\n📊 Mapping created:")
        print(f"  • Total artworks: {len(id_mapping)}")
        print(f"  • ID changes needed: {changes}")
        print(f"  • No changes needed: {len(id_mapping) - changes}")
        
        return id_mapping, artwork_mapping
    
    def move_to_temp_folders(self):
        """Move all files to temp folders"""
        print(f"\n📁 Moving files to temp folders...")
        
        # Create temp directories
        self.temp_thumb_dir.mkdir(parents=True, exist_ok=True)
        self.temp_large_dir.mkdir(parents=True, exist_ok=True)
        
        moved_thumbs = 0
        moved_large = 0
        
        # Move thumbnail files
        if self.thumb_dir.exists():
            for thumb_file in self.thumb_dir.glob("*_thumb.png"):
                try:
                    dest = self.temp_thumb_dir / thumb_file.name
                    shutil.move(thumb_file, dest)
                    moved_thumbs += 1
                except Exception as e:
                    print(f"  ❌ Failed to move {thumb_file.name}: {e}")
        
        # Move large files
        if self.large_dir.exists():
            for large_file in self.large_dir.glob("*_large.png"):
                try:
                    dest = self.temp_large_dir / large_file.name
                    shutil.move(large_file, dest)
                    moved_large += 1
                except Exception as e:
                    print(f"  ❌ Failed to move {large_file.name}: {e}")
        
        print(f"✅ Moved {moved_thumbs} thumbnails and {moved_large} large files to temp")
        return moved_thumbs, moved_large
    
    def move_files_with_new_names(self, id_mapping):
        """Move files from temp folders back with new names"""
        print(f"\n🔄 Moving files back with new names...")
        
        # Recreate clean directories
        self.thumb_dir.mkdir(parents=True, exist_ok=True)
        self.large_dir.mkdir(parents=True, exist_ok=True)
        
        moved_thumbs = 0
        moved_large = 0
        missing_files = []
        
        for old_id, new_id in id_mapping.items():
            # Process thumbnail
            old_thumb = self.temp_thumb_dir / f"{old_id}_thumb.png"
            new_thumb = self.thumb_dir / f"{new_id}_thumb.png"
            
            if old_thumb.exists():
                try:
                    shutil.move(old_thumb, new_thumb)
                    moved_thumbs += 1
                    if old_id != new_id:
                        print(f"  📸 {old_id}_thumb.png → {new_id}_thumb.png")
                except Exception as e:
                    print(f"  ❌ Failed to move thumbnail {old_id}: {e}")
            else:
                missing_files.append(f"{old_id}_thumb.png")
            
            # Process large file
            old_large = self.temp_large_dir / f"{old_id}_large.png"
            new_large = self.large_dir / f"{new_id}_large.png"
            
            if old_large.exists():
                try:
                    shutil.move(old_large, new_large)
                    moved_large += 1
                    if old_id != new_id:
                        print(f"  📁 {old_id}_large.png → {new_id}_large.png")
                except Exception as e:
                    print(f"  ❌ Failed to move large file {old_id}: {e}")
            else:
                missing_files.append(f"{old_id}_large.png")
        
        print(f"✅ Moved {moved_thumbs} thumbnails and {moved_large} large files")
        
        if missing_files:
            print(f"⚠️  Missing files: {len(missing_files)}")
            for missing in missing_files[:10]:  # Show first 10
                print(f"  • {missing}")
            if len(missing_files) > 10:
                print(f"  • ... and {len(missing_files)-10} more")
    
    def update_json(self, id_mapping, artwork_mapping):
        """Update JSON with new IDs and paths"""
        print(f"\n📝 Updating JSON with new IDs...")
        
        # Create backup
        backup_path = self.data_file.with_suffix('.json.backup')
        shutil.copy2(self.data_file, backup_path)
        print(f"💾 Created backup: {backup_path}")
        
        # Update artworks
        updated_artworks = []
        for old_id, new_id in id_mapping.items():
            artwork = artwork_mapping[old_id].copy()
            
            # Update ID and paths
            artwork['id'] = new_id
            artwork['image'] = f"./images/paintings/thumbnails/{new_id}_thumb.png"
            artwork['imageHigh'] = f"./images/paintings/large/{new_id}_large.png"
            
            updated_artworks.append(artwork)
        
        # Sort by new ID for clean JSON
        updated_artworks.sort(key=lambda x: x['id'])
        
        # Save JSON
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(updated_artworks, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved {len(updated_artworks)} artworks with sequential IDs")
    
    def cleanup_temp_folders(self):
        """Remove temp folders"""
        print(f"\n🧹 Cleaning up temp folders...")
        
        removed_files = 0
        
        # Remove remaining files in temp folders
        for temp_dir in [self.temp_thumb_dir, self.temp_large_dir]:
            if temp_dir.exists():
                for file_path in temp_dir.glob("*"):
                    if file_path.is_file():
                        try:
                            file_path.unlink()
                            removed_files += 1
                        except:
                            pass
                
                # Remove directory
                try:
                    temp_dir.rmdir()
                except:
                    pass
        
        if removed_files > 0:
            print(f"🗑️  Removed {removed_files} leftover files from temp folders")
        else:
            print(f"✅ Temp folders cleaned up")
    
    def verify_results(self):
        """Verify final results"""
        print(f"\n🔍 Verifying results...")
        
        # Load updated JSON
        artworks = self.load_artworks()
        
        # Check for sequential IDs
        year_groups = defaultdict(list)
        for artwork in artworks:
            year = artwork.get('year', 'unknown')
            year_groups[year].append(artwork)
        
        print(f"\n📊 Final ID Distribution:")
        print(f"{'Year':<10} {'Count':<6} {'Range':<15} {'Sequential?'}")
        print("-" * 50)
        
        total_issues = 0
        
        for year in sorted(year_groups.keys(), key=lambda x: int(x) if str(x).isdigit() else 9999):
            year_artworks = year_groups[year]
            
            # Extract numbers
            numbers = []
            for artwork in year_artworks:
                artwork_id = artwork.get('id', '')
                if year == 'unknown':
                    if artwork_id.startswith('unknown_'):
                        try:
                            num = int(artwork_id.split('_')[1])
                            numbers.append(num)
                        except:
                            pass
                else:
                    if artwork_id.startswith(f"{year}_"):
                        try:
                            num = int(artwork_id.split('_')[1])
                            numbers.append(num)
                        except:
                            pass
            
            numbers.sort()
            
            # Check if sequential
            expected = list(range(1, len(numbers) + 1))
            is_sequential = numbers == expected
            
            if numbers:
                range_str = f"{year}_{numbers[0]:03d}-{year}_{numbers[-1]:03d}"
            else:
                range_str = "None"
            
            status = "✅ Yes" if is_sequential else "❌ No"
            if not is_sequential:
                total_issues += 1
            
            print(f"{year:<10} {len(year_artworks):<6} {range_str:<15} {status}")
        
        # Check file matches
        missing_files = 0
        for artwork in artworks:
            artwork_id = artwork['id']
            thumb_path = self.thumb_dir / f"{artwork_id}_thumb.png"
            large_path = self.large_dir / f"{artwork_id}_large.png"
            
            if not thumb_path.exists():
                missing_files += 1
            if not large_path.exists():
                missing_files += 1
        
        print(f"\n📁 File verification:")
        print(f"  • JSON artworks: {len(artworks)}")
        print(f"  • Thumbnail files: {len(list(self.thumb_dir.glob('*_thumb.png')))}")
        print(f"  • Large files: {len(list(self.large_dir.glob('*_large.png')))}")
        print(f"  • Missing files: {missing_files}")
        
        if total_issues == 0 and missing_files == 0:
            print(f"\n🎉 Perfect! All IDs are sequential and all files match!")
        else:
            print(f"\n⚠️  Found {total_issues} ID issues and {missing_files} missing files")
    
    def run(self):
        """Main process"""
        print("🔢 ID Reorderer")
        print("=" * 30)
        print("This will:")
        print("1. Analyze current IDs and gaps")
        print("2. Create sequential ID mapping")
        print("3. Move files to temp folders")
        print("4. Move files back with new names")
        print("5. Update JSON with new IDs")
        
        # Load and analyze
        artworks = self.load_artworks()
        year_groups = self.analyze_current_ids(artworks)
        
        # Create mapping
        id_mapping, artwork_mapping = self.create_sequential_mapping(year_groups)
        
        response = input(f"\n🚀 Proceed with ID reordering? (y/n): ").lower().strip()
        if response != 'y':
            print("❌ Cancelled")
            return
        
        # Move to temp folders
        self.move_to_temp_folders()
        
        # Move back with new names
        self.move_files_with_new_names(id_mapping)
        
        # Update JSON
        self.update_json(id_mapping, artwork_mapping)
        
        # Clean up
        self.cleanup_temp_folders()
        
        # Verify
        self.verify_results()
        
        print(f"\n🎉 ID reordering complete!")

def main():
    reorderer = IDReorderer()
    reorderer.run()

if __name__ == "__main__":
    main()