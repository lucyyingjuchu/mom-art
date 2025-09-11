import os
import json
import re

def update_artworks_with_mockups():
    # Define paths
    mockups_folder = "./images/mockups/original"
    artworks_file = "./data/artworks.json"
    
    # Check if folders and files exist
    if not os.path.exists(mockups_folder):
        print(f"Error: Mockups folder '{mockups_folder}' not found!")
        return
    
    if not os.path.exists(artworks_file):
        print(f"Error: Artworks file '{artworks_file}' not found!")
        return
    
    # Step 1: Scan mockups folder for artwork IDs
    print("Scanning mockups folder...")
    mockup_files = {}
    
    for filename in os.listdir(mockups_folder):
        # Look for files matching pattern: {artid}_orig_mock.jpg or {artid}_orig_mock.png
        match = re.match(r'^(.+)_orig_mock\.(jpg|png)$', filename)
        if match:
            art_id = match.group(1)
            extension = match.group(2)
            mockup_files[art_id] = f"./images/mockups/original/{filename}"
            print(f"Found mockup for artwork ID: {art_id} ({extension})")
    
    if not mockup_files:
        print("No mockup files found matching the pattern {artid}_orig_mock.jpg/png")
        return
    
    print(f"\nFound {len(mockup_files)} mockup files")
    
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
        
        if art_id in mockup_files:
            # Check if productViews exists
            if 'productViews' not in artwork:
                artwork['productViews'] = []
            
            # Check if original-mockup already exists
            has_original_mockup = any(
                view.get('type') == 'original-mockup' 
                for view in artwork['productViews']
            )
            
            if not has_original_mockup:
                # Add the original-mockup entry
                mockup_entry = {
                    "type": "original-mockup",
                    "image": mockup_files[art_id]
                }
                artwork['productViews'].append(mockup_entry)
                updates_made += 1
                print(f"✓ Added original-mockup for: {artwork.get('title', art_id)}")
            else:
                print(f"→ Skipped (already has original-mockup): {artwork.get('title', art_id)}")
    
    # Step 4: Save updated artworks.json
    if updates_made > 0:
        try:
            with open(artworks_file, 'w', encoding='utf-8') as f:
                json.dump(artworks_data, f, ensure_ascii=False, indent=2)
            print(f"\n✓ Successfully updated artworks.json with {updates_made} new original-mockup entries!")
        except Exception as e:
            print(f"Error writing artworks.json: {e}")
    else:
        print("\nNo updates were needed - all matching artworks already have original-mockup entries.")

if __name__ == "__main__":
    update_artworks_with_mockups()
