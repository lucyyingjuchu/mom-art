#!/usr/bin/env python3
"""
Artwork Auto-Categorizer for Chinese Art Portfolio - UPDATED VERSION
Uses centralized category-config.json for consistency with web interface
"""

import json
import re
from typing import Dict, List, Set
import os

class ArtworkCategorizer:
    def __init__(self, config_path='./data/category-config.json'):
        """Load categorization rules from config file"""
        self.config_path = config_path
        self.config = self.load_config()
        
    def load_config(self) -> Dict:
        """Load category configuration from JSON file"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            print(f"✅ Loaded category config from: {self.config_path}")
            print(f"📊 Subjects: {len(config['categories']['subjects'])}")
            print(f"🗺️ Locations: {len(config['categories']['locations'])}")
            
            return config
            
        except FileNotFoundError:
            print(f"❌ Config file not found: {self.config_path}")
            print("Using fallback rules...")
            return self.get_fallback_config()
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in config file: {e}")
            return self.get_fallback_config()
    
    def get_fallback_config(self) -> Dict:
        """Fallback config if file load fails"""
        return {
            "categories": {
                "subjects": ["landscape", "waterfall", "flowers", "calligraphy"],
                "locations": ["huangshan", "alishan"]
            },
            "autoDetectionKeywords": {
                "landscape": ["山水", "山", "峰", "雲海", "煙雲"],
                "waterfall": ["瀑布", "瀑", "飛瀑"],
                "flowers": ["花", "梅", "菊", "藤"],
                "calligraphy": ["心經", "書法", "經"],
                "huangshan": ["黃山", "北海", "夢筆"],
                "alishan": ["阿里山", "雲揚"]
            }
        }

    def categorize_artwork(self, artwork: Dict) -> Dict[str, List[str]]:
        """Categorize artwork using config-based keywords"""
        title = artwork.get('title', '')
        description = artwork.get('description', '')
        
        # Combine title and description for analysis
        text_to_analyze = f"{title} {description}".lower()
        
        categories = {
            'subjects': [],
            'locations': []
        }

        print(f"🎨 Analyzing: {title}")

        # Use keywords from config
        keywords = self.config.get('autoDetectionKeywords', {})
        
        for category, category_keywords in keywords.items():
            # Check if this category is a subject or location
            if category in self.config['categories']['subjects']:
                if any(keyword.lower() in text_to_analyze for keyword in category_keywords):
                    categories['subjects'].append(category)
                    print(f"  📍 Subject: {category}")
                    
            elif category in self.config['categories']['locations']:
                if any(keyword.lower() in text_to_analyze for keyword in category_keywords):
                    categories['locations'].append(category)
                    print(f"  🗺️ Location: {category}")

        # Fallback logic for completely uncategorized artworks
        if not categories['subjects']:
            # Basic fallback based on common patterns
            if any(pattern in text_to_analyze for pattern in ['山', '雲', '水', '峽', '溪']):
                categories['subjects'].append('landscape')
                print(f"  📍 Fallback: landscape")
            elif any(pattern in text_to_analyze for pattern in ['書', '經', '詩']):
                categories['subjects'].append('calligraphy') 
                print(f"  📍 Fallback: calligraphy")

        return categories

    def clean_artwork_categories(self, artwork: Dict) -> Dict:
        """Clean old category data while preserving manual categories"""
        
        # Preserve existing manual categories (if they exist and have the right structure)
        preserved_manual = {"subjects": [], "locations": []}
        
        if artwork.get('manualCategories'):
            # Handle both old and new manual category structures
            if isinstance(artwork['manualCategories'], dict):
                # New structure
                preserved_manual = {
                    "subjects": artwork['manualCategories'].get('subjects', []),
                    "locations": artwork['manualCategories'].get('locations', [])
                }
            elif isinstance(artwork['manualCategories'], list):
                # Old structure - classify manual categories
                for manual_cat in artwork['manualCategories']:
                    if manual_cat in self.config['categories']['subjects']:
                        preserved_manual['subjects'].append(manual_cat)
                    elif manual_cat in self.config['categories']['locations']:
                        preserved_manual['locations'].append(manual_cat)
                    else:
                        # Default unknown manual categories to subjects
                        preserved_manual['subjects'].append(manual_cat)
        
        print(f"  💾 Preserved manual: {preserved_manual}")
        return preserved_manual

    def process_artworks_file(self, input_file: str, output_file: str = None):
        """Process the entire artworks.json file with config-based categorization"""
        if output_file is None:
            output_file = input_file  # Overwrite original
            
        print(f"📂 Loading artworks from: {input_file}")
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Handle both array and object format
            if isinstance(data, list):
                artworks = data
            else:
                artworks = data if isinstance(data, list) else [data] if 'title' in data else []
                
            print(f"📊 Found {len(artworks)} artworks to process")
            
        except FileNotFoundError:
            print(f"❌ Error: File '{input_file}' not found!")
            return
        except json.JSONDecodeError as e:
            print(f"❌ Error: Invalid JSON format in '{input_file}': {e}")
            return

        # Process each artwork
        updated_count = 0
        for i, artwork in enumerate(artworks):
            print(f"\n--- Processing {i+1}/{len(artworks)} ---")
            
            # Clean and preserve manual categories first
            preserved_manual = self.clean_artwork_categories(artwork)
            
            # Get new auto-categories using config
            new_auto_categories = self.categorize_artwork(artwork)
            
            # Update artwork with clean structure
            artwork['autoCategories'] = new_auto_categories
            artwork['manualCategories'] = preserved_manual
            
            # Remove old fields
            if 'categories' in artwork:
                del artwork['categories']  # Remove old flat categories
            if 'subcategory' in artwork:
                del artwork['subcategory']  # Remove old subcategory
            
            updated_count += 1
            print(f"  ✅ Auto: subjects={new_auto_categories['subjects']}, locations={new_auto_categories['locations']}")
            print(f"  ✅ Manual: subjects={preserved_manual['subjects']}, locations={preserved_manual['locations']}")

        print(f"\n🎉 Processed {updated_count} artworks successfully!")
        
        # Save the updated data
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(artworks, f, ensure_ascii=False, indent=2)
            
            print(f"💾 Saved updated artworks to: {output_file}")
            
            # Generate statistics report
            self.generate_stats_report(artworks)
            
        except Exception as e:
            print(f"❌ Error saving file: {e}")

    def generate_stats_report(self, artworks: List[Dict]):
        """Generate statistics report"""
        auto_stats = {"subjects": {}, "locations": {}}
        manual_stats = {"subjects": {}, "locations": {}}
        total_artworks = len(artworks)
        
        for artwork in artworks:
            # Count auto categories
            auto_cats = artwork.get('autoCategories', {})
            for subject in auto_cats.get('subjects', []):
                auto_stats['subjects'][subject] = auto_stats['subjects'].get(subject, 0) + 1
            for location in auto_cats.get('locations', []):
                auto_stats['locations'][location] = auto_stats['locations'].get(location, 0) + 1
            
            # Count manual categories
            manual_cats = artwork.get('manualCategories', {})
            for subject in manual_cats.get('subjects', []):
                manual_stats['subjects'][subject] = manual_stats['subjects'].get(subject, 0) + 1
            for location in manual_cats.get('locations', []):
                manual_stats['locations'][location] = manual_stats['locations'].get(location, 0) + 1

        print(f"\n📊 CATEGORIZATION STATISTICS")
        print(f"=" * 60)
        print(f"Total Artworks: {total_artworks}")
        
        print(f"\n🤖 AUTO-CATEGORIZED SUBJECTS:")
        for subject, count in sorted(auto_stats['subjects'].items()):
            percentage = (count / total_artworks) * 100
            print(f"  {subject:15} {count:3d} ({percentage:5.1f}%)")
        
        if auto_stats['locations']:
            print(f"\n🤖 AUTO-CATEGORIZED LOCATIONS:")
            for location, count in sorted(auto_stats['locations'].items()):
                percentage = (count / total_artworks) * 100
                print(f"  {location:15} {count:3d} ({percentage:5.1f}%)")
        
        if any(manual_stats['subjects'].values()) or any(manual_stats['locations'].values()):
            print(f"\n✋ MANUALLY CATEGORIZED:")
            for category_type, categories in manual_stats.items():
                if categories:
                    print(f"  {category_type.upper()}:")
                    for category, count in sorted(categories.items()):
                        percentage = (count / total_artworks) * 100
                        print(f"    {category:13} {count:3d} ({percentage:5.1f}%)")


def main():
    """Main execution function"""
    import sys
    
    print("🎨 Config-Based Artwork Auto-Categorizer Starting...")
    print("=" * 60)
    
    # Get input file path
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        input_file = input("📂 Enter path to artworks.json file (or press Enter for './data/artworks.json'): ").strip()
        if not input_file:
            input_file = './data/artworks.json'
    
    # Create categorizer and process file
    categorizer = ArtworkCategorizer()
    categorizer.process_artworks_file(input_file)
    
    print(f"\n🎉 Config-based categorization complete!")
    print(f"📝 Next steps:")
    print(f"   1. Manual categories are preserved")
    print(f"   2. Auto categories use centralized config")
    print(f"   3. Website will merge both for display")

if __name__ == "__main__":
    main()