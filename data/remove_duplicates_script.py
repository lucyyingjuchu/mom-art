#!/usr/bin/env python3
"""
Script to remove duplicate artworks based on title from JSON file.
Keeps the first occurrence of each title and removes subsequent duplicates.
"""

import json
import sys
from pathlib import Path

def remove_duplicates_by_title(artworks):
    """
    Remove duplicate artworks based on title.
    
    Args:
        artworks (list): List of artwork dictionaries
        
    Returns:
        tuple: (unique_artworks, removed_duplicates)
    """
    seen_titles = set()
    unique_artworks = []
    removed_duplicates = []
    
    for artwork in artworks:
        title = artwork.get('title', '').strip()
        
        if not title:
            # Keep artworks without titles
            unique_artworks.append(artwork)
            print(f"Warning: Artwork with ID '{artwork.get('id', 'unknown')}' has no title")
        elif title not in seen_titles:
            # First occurrence of this title
            seen_titles.add(title)
            unique_artworks.append(artwork)
        else:
            # Duplicate found
            removed_duplicates.append({
                'id': artwork.get('id'),
                'title': artwork.get('title'),
                'year': artwork.get('year'),
                'reason': 'Duplicate title'
            })
            print(f"Removing duplicate: ID '{artwork.get('id')}' - '{title}' ({artwork.get('year')})")
    
    return unique_artworks, removed_duplicates

def analyze_duplicates(artworks):
    """
    Analyze and report on duplicate titles before removal.
    
    Args:
        artworks (list): List of artwork dictionaries
    """
    title_counts = {}
    title_entries = {}
    
    for artwork in artworks:
        title = artwork.get('title', '').strip()
        if title:
            if title not in title_counts:
                title_counts[title] = 0
                title_entries[title] = []
            title_counts[title] += 1
            title_entries[title].append({
                'id': artwork.get('id'),
                'year': artwork.get('year'),
                'format': artwork.get('format'),
                'sizeCm': artwork.get('sizeCm')
            })
    
    duplicates = {title: entries for title, entries in title_entries.items() if title_counts[title] > 1}
    
    if duplicates:
        print(f"\nFound {len(duplicates)} titles with duplicates:")
        print("=" * 60)
        for title, entries in duplicates.items():
            print(f"\nTitle: '{title}' ({len(entries)} occurrences)")
            for i, entry in enumerate(entries):
                status = "KEEPING" if i == 0 else "REMOVING"
                print(f"  {status}: ID {entry['id']} ({entry['year']}) - {entry['format']} - {entry['sizeCm']}")
    else:
        print("No duplicates found!")
    
    return duplicates

def main():
    """Main function to process the artwork JSON file."""
    
    # Check command line arguments
    if len(sys.argv) != 2:
        print("Usage: python remove_duplicates.py <input_json_file>")
        print("Example: python remove_duplicates.py artworks.json")
        sys.exit(1)
    
    input_file = Path(sys.argv[1])
    
    # Check if input file exists
    if not input_file.exists():
        print(f"Error: File '{input_file}' not found!")
        sys.exit(1)
    
    # Read the JSON file
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            artworks = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON format in '{input_file}': {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file '{input_file}': {e}")
        sys.exit(1)
    
    print(f"Loaded {len(artworks)} artworks from '{input_file}'")
    
    # Analyze duplicates before removal
    print("\n" + "="*60)
    print("DUPLICATE ANALYSIS")
    print("="*60)
    duplicates_info = analyze_duplicates(artworks)
    
    # Remove duplicates
    print("\n" + "="*60)
    print("REMOVING DUPLICATES")
    print("="*60)
    unique_artworks, removed_duplicates = remove_duplicates_by_title(artworks)
    
    # Create output filenames
    output_file = input_file.stem + "_cleaned" + input_file.suffix
    removed_file = input_file.stem + "_removed_duplicates.json"
    
    # Save cleaned artworks
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(unique_artworks, f, ensure_ascii=False, indent=2)
        print(f"\nCleaned artworks saved to: '{output_file}'")
    except Exception as e:
        print(f"Error saving cleaned file: {e}")
        sys.exit(1)
    
    # Save removed duplicates for reference
    if removed_duplicates:
        try:
            with open(removed_file, 'w', encoding='utf-8') as f:
                json.dump(removed_duplicates, f, ensure_ascii=False, indent=2)
            print(f"Removed duplicates logged to: '{removed_file}'")
        except Exception as e:
            print(f"Warning: Could not save removed duplicates log: {e}")
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Original artworks: {len(artworks)}")
    print(f"Unique artworks: {len(unique_artworks)}")
    print(f"Duplicates removed: {len(removed_duplicates)}")
    print(f"Duplicate titles found: {len(duplicates_info)}")
    
    if removed_duplicates:
        print(f"\nRemoved duplicates:")
        for dup in removed_duplicates:
            print(f"  - ID {dup['id']}: '{dup['title']}' ({dup['year']})")

if __name__ == "__main__":
    main()
