#!/usr/bin/env python3
"""
Artwork Auto-Categorizer for Chinese Art Portfolio
Processes artworks.json and adds category labels based on title analysis
"""

import json
import re
from typing import Dict, List, Set

class ArtworkCategorizer:
    def __init__(self):
        # Define categorization rules based on title keywords
        self.rules = {
            # By Subject
            'subject': {
                'waterfall': ['瀑布', '瀑', '飛瀑', '銀瀑', '煙聲'],
                'landscape': ['山水', '山', '峰', '雲海', '煙雲', '嵐', '壑', '石', '木', '谷', '峽', '溪'],
                'flowingclouds': ['煙', '雲', '煙雲', '雲海', '霧', '嵐'],
                'flowers': ['花', '梅', '菊', '藤', '紫藤', '杜鵑', '桃花', '荷', '蓮', '牡丹', '阿勃勒', '金針', '櫻花', '凌霄'],
                'bamboo': ['竹', '墨竹', '疏竹', '翠竹'],
                'calligraphy': ['心經', '書法', '經', '愛蓮說', '序', '書', '隸', '楷', '行', '草', '隸書', '楷書', '草書', '詩', '聯'],
            },
            
            # By Location  
            'location': {
                'huangshan': ['黃山', '北海', '夢筆'],
                'alishan': ['阿里山', '雲揚'],
                'taroko': ['太魯閣', '太魯峽'],
                'hehuanshan': ['合歡', '合歡山'],
                'yushan': ['玉山', '玉山北峰'],
                'liushidanshan': ['六十石山', '六十石'],
                'guishandao': ['龜山島'],
                'longdong': ['龍洞'],
                'zhangjiajie': ['張家界'],
                'grandcanyon': ['大峽谷'],
                'iguazu': ['伊瓜蘇'],
                'niagara': ['尼加拉']
            },
            
            # By Style 
            'style': {
                'traditional': ['水墨', '墨', '古', '傳統'],
                'abstract': ['抽象', '潑墨', '無題'],
                'modern': ['現代', '當代']
            }
        }

    def categorize_artwork(self, artwork: Dict) -> Dict[str, List[str]]:
        """Categorize a single artwork based on title analysis"""
        title = artwork.get('title', '')
        categories = {
            'subjects': [],
            'locations': [],
            'styles': []
        }

        print(f"🎨 Analyzing: {title}")

        # Check subject categories
        for category, keywords in self.rules['subject'].items():
            if any(keyword in title for keyword in keywords):
                categories['subjects'].append(category)
                print(f"  📍 Subject: {category}")

        # Check location categories  
        for location, keywords in self.rules['location'].items():
            if any(keyword in title for keyword in keywords):
                categories['locations'].append(location)
                print(f"  🗺️  Location: {location}")

        # Check style categories
        for style, keywords in self.rules['style'].items():
            if any(keyword in title for keyword in keywords):
                categories['styles'].append(style)
                print(f"  🎭 Style: {style}")

        # Default fallback categories
        if not categories['subjects']:
            if any(keyword in title for keyword in ['山', '雲', '水', '峽', '溪']):
                categories['subjects'].append('landscape')
                print(f"  📍 Default Subject: landscape")
            elif any(keyword in title for keyword in ['書', '經', '詩', '聯']):
                categories['subjects'].append('calligraphy')
                print(f"  📍 Default Subject: calligraphy")
            else:
                categories['subjects'].append('traditional')
                print(f"  📍 Default Subject: traditional")

        if not categories['styles']:
            categories['styles'].append('traditional')
            print(f"  🎭 Default Style: traditional")

        return categories

    def process_artworks_file(self, input_file: str, output_file: str = None):
        """Process the entire artworks.json file"""
        if output_file is None:
            output_file = input_file.replace('.json', '_categorized.json')

        print(f"📂 Loading artworks from: {input_file}")
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Handle both array and object format
            if isinstance(data, list):
                artworks = data
            elif isinstance(data, dict) and 'artworks' in data:
                artworks = data['artworks']
            else:
                artworks = data
                
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
            
            # Get auto-categories
            auto_categories = self.categorize_artwork(artwork)
            
            # Create combined categories array
            all_categories = []
            
            # Add all subject categories
            all_categories.extend(auto_categories['subjects'])
            
            # Add all location categories  
            all_categories.extend(auto_categories['locations'])
            
            # Add all style categories
            all_categories.extend(auto_categories['styles'])
            
            # Remove duplicates while preserving order
            unique_categories = []
            seen = set()
            for cat in all_categories:
                if cat not in seen:
                    unique_categories.append(cat)
                    seen.add(cat)
            
            # Update artwork with categories
            artwork['autoCategories'] = auto_categories  # Keep detailed breakdown
            artwork['categories'] = unique_categories    # Flat list for easy filtering
            
            # Also keep the old subcategory field if it exists and isn't empty
            if artwork.get('subcategory') and artwork['subcategory'].strip():
                if artwork['subcategory'] not in artwork['categories']:
                    artwork['categories'].append(artwork['subcategory'])
            
            updated_count += 1
            print(f"  ✅ Categories: {unique_categories}")

        print(f"\n🎉 Processed {updated_count} artworks successfully!")
        
        # Save the updated data
        try:
            # Maintain original file structure
            if isinstance(data, list):
                output_data = artworks
            else:
                output_data = data
                output_data['artworks'] = artworks
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
            
            print(f"💾 Saved categorized artworks to: {output_file}")
            
            # Generate statistics report
            self.generate_stats_report(artworks)
            
        except Exception as e:
            print(f"❌ Error saving file: {e}")

    def generate_stats_report(self, artworks: List[Dict]):
        """Generate a statistics report of the categorization"""
        stats = {
            'subjects': {},
            'locations': {},  
            'styles': {},
            'total_artworks': len(artworks)
        }
        
        for artwork in artworks:
            auto_cats = artwork.get('autoCategories', {})
            
            # Count subjects
            for subject in auto_cats.get('subjects', []):
                stats['subjects'][subject] = stats['subjects'].get(subject, 0) + 1
            
            # Count locations
            for location in auto_cats.get('locations', []):
                stats['locations'][location] = stats['locations'].get(location, 0) + 1
            
            # Count styles
            for style in auto_cats.get('styles', []):
                stats['styles'][style] = stats['styles'].get(style, 0) + 1

        print(f"\n📊 CATEGORIZATION STATISTICS")
        print(f"=" * 50)
        print(f"Total Artworks: {stats['total_artworks']}")
        
        print(f"\n🎨 SUBJECTS:")
        for subject, count in sorted(stats['subjects'].items()):
            percentage = (count / stats['total_artworks']) * 100
            print(f"  {subject:15} {count:3d} ({percentage:5.1f}%)")
        
        if stats['locations']:
            print(f"\n🗺️  LOCATIONS:")
            for location, count in sorted(stats['locations'].items()):
                percentage = (count / stats['total_artworks']) * 100
                print(f"  {location:15} {count:3d} ({percentage:5.1f}%)")
        
        print(f"\n🎭 STYLES:")
        for style, count in sorted(stats['styles'].items()):
            percentage = (count / stats['total_artworks']) * 100
            print(f"  {style:15} {count:3d} ({percentage:5.1f}%)")

    def validate_categories(self, artworks: List[Dict]) -> Dict:
        """Validate the categorization results"""
        issues = []
        artwork_count = len(artworks)
        
        uncategorized = []
        for artwork in artworks:
            if not artwork.get('categories') or len(artwork['categories']) == 0:
                uncategorized.append(artwork.get('title', 'Untitled'))
        
        if uncategorized:
            issues.append(f"❌ {len(uncategorized)} artworks have no categories: {uncategorized[:5]}")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'uncategorized_count': len(uncategorized),
            'total_count': artwork_count
        }


def main():
    """Main execution function"""
    import sys
    
    print("🎨 Artwork Auto-Categorizer Starting...")
    print("=" * 50)
    
    # Get input file path
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        input_file = input("📂 Enter path to artworks.json file (or press Enter for './data/artworks.json'): ").strip()
        if not input_file:
            input_file = './data/artworks.json'
    
    # Get output file path (optional)
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    else:
        output_file = input("💾 Enter output file path (or press Enter to overwrite original): ").strip()
        if not output_file:
            output_file = input_file  # Overwrite original
    
    # Create categorizer and process file
    categorizer = ArtworkCategorizer()
    categorizer.process_artworks_file(input_file, output_file)
    
    # Validate results if we have the data
    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        artworks = data if isinstance(data, list) else data.get('artworks', [])
        validation = categorizer.validate_categories(artworks)
        
        print(f"\n✅ VALIDATION RESULTS:")
        if validation['valid']:
            print(f"All {validation['total_count']} artworks successfully categorized!")
        else:
            print(f"Found issues:")
            for issue in validation['issues']:
                print(f"  {issue}")
                
    except Exception as e:
        print(f"⚠️  Could not validate results: {e}")

    print(f"\n🎉 Categorization complete!")
    print(f"📝 Next steps:")
    print(f"   1. Review the generated categories")
    print(f"   2. Update your website's artworks.json file")  
    print(f"   3. Test the filtering in your gallery")


if __name__ == "__main__":
    main()
