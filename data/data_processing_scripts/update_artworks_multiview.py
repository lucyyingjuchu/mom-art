import os
import json
import re

def update_artworks_with_mockups():
    # Define paths
    mockups_folder = "./images/mockups/original"
    large_images_folder = "./images/paintings/large"
    artworks_file = "./data/artworks.json"
    
    # Check if artworks.json exists
    if not os.path.exists(artworks_file):
        print(f"Error: Artworks file '{artworks_file}' not found!")
        return
    
    # Step 1: Scan both folders for artwork files
    print("Scanning folders...")
    
    # Scan mockups folder
    mockup_files = {}
    if os.path.exists(mockups_folder):
        for filename in os.listdir(mockups_folder):
            # Look for files matching pattern: {artid}_orig_mock.jpg or {artid}_orig_mock.png
            match = re.match(r'^(.+)_orig_mock\.(jpg|png)$', filename)
            if match:
                art_id = match.group(1)
                extension = match.group(2)
                mockup_files[art_id] = f"./images/mockups/original/{filename}"
                print(f"Found mockup for artwork ID: {art_id} ({extension})")
    else:
        print(f"Warning: Mockups folder '{mockups_folder}' not found!")
    
    # Scan large images folder
    large_image_files = {}
    if os.path.exists(large_images_folder):
        for filename in os.listdir(large_images_folder):
            # Look for files matching pattern: {artid}_large.jpg or {artid}_large.png
            match = re.match(r'^(.+)_large\.(jpg|png)$', filename)
            if match:
                art_id = match.group(1)
                extension = match.group(2)
                large_image_files[art_id] = f"./images/paintings/large/{filename}"
                print(f"Found large image for artwork ID: {art_id} ({extension})")
    else:
        print(f"Warning: Large images folder '{large_images_folder}' not found!")
    
    # Get all artwork IDs that have at least one file
    all_art_ids = set(mockup_files.keys()) | set(large_image_files.keys())
    
    print(f"\nFound files for {len(all_art_ids)} artworks total")
    
    if not all_art_ids:
        print("No artwork files found matching the expected patterns")
        return
    
    # Step 2: Read and parse artworks.json
    print("\nReading artworks.json...")
    try:
        with open(artworks_file, 'r', encoding='utf-8') as f:
            artworks_data = json.load(f)
    except Exception as e:
        print(f"Error reading artworks.json: {e}")
        return
    
    # Step 3: Update artworks data
    updates_made = 0
    
    for artwork in artworks_data:
        art_id = artwork.get('id')
        
        if art_id in all_art_ids:
            # Check if productViews exists
            if 'productViews' not in artwork:
                artwork['productViews'] = []
            
            # Check what entries already exist
            existing_types = {view.get('type') for view in artwork['productViews']}
            
            entries_added = []
            
            # Add "original" entry if file exists and not already present
            if art_id in large_image_files and 'original' not in existing_types:
                original_entry = {
                    "type": "original",
                    "image": large_image_files[art_id]
                }
                artwork['productViews'].append(original_entry)
                entries_added.append("original")
            
            # Add "original-mockup" entry if file exists and not already present
            if art_id in mockup_files and 'original-mockup' not in existing_types:
                mockup_entry = {
                    "type": "original-mockup",
                    "image": mockup_files[art_id]
                }
                artwork['productViews'].append(mockup_entry)
                entries_added.append("original-mockup")
            
            if entries_added:
                updates_made += 1
                entries_str = " and ".join(entries_added)
                print(f"✓ Added {entries_str} for: {artwork.get('title', art_id)}")
            else:
                # Check what was skipped
                skipped = []
                if art_id in large_image_files and 'original' in existing_types:
                    skipped.append("original")
                if art_id in mockup_files and 'original-mockup' in existing_types:
                    skipped.append("original-mockup")
                
                if skipped:
                    skipped_str = " and ".join(skipped)
                    print(f"→ Skipped {skipped_str} (already exists): {artwork.get('title', art_id)}")
    
    # Step 4: Save updated artworks.json
    if updates_made > 0:
        try:
            with open(artworks_file, 'w', encoding='utf-8') as f:
                json.dump(artworks_data, f, ensure_ascii=False, indent=2)
            print(f"\n✓ Successfully updated artworks.json with {updates_made} new entries!")
        except Exception as e:
            print(f"Error writing artworks.json: {e}")
    else:
        print("\nNo updates were needed - all matching artworks already have the required entries.")

if __name__ == "__main__":
    update_artworks_with_mockups()
