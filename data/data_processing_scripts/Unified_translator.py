#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Unified Translation System for Traditional Chinese Artworks
Handles all translations, conversions, and cleanup in one comprehensive script
"""

import sys
import os
import json
import re
import time
import glob
from datetime import datetime
from openai import OpenAI

# Windows encoding fix
if sys.platform.startswith('win'):
    import codecs
    try:
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())
    except:
        pass
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# Configuration - Add your OpenAI API key here
OPENAI_API_KEY = ""

# Format translation mapping
FORMAT_TRANSLATIONS = {
    "軸": "Hanging Scroll",
    "框": "Framed",
    "鏡片": "Mounted Panel", 
    "橫軸": "Horizontal Scroll",
    "圓框": "Circular Frame",
    "扇面": "Fan",
    "對聯": "Couplet"
}

# Fields to remove (obsolete)
OBSOLETE_FIELDS = ['medium','mediumEn', 'recent', 'category', 'sizeCm', 'sizeInches','tags','exhibitions']

def parse_size_cm(size_string):
    """
    Parse sizeCm string into height and width
    "135×70" or "135x70" -> (135, 70)
    """
    if not size_string:
        return None, None
    
    pattern = r'(\d+)\s*[×x]\s*(\d+)'
    match = re.search(pattern, str(size_string))
    
    if match:
        height = int(match.group(1))
        width = int(match.group(2))
        return height, width
    
    return None, None

def cm_to_inches(cm_value):
    """Convert centimeters to inches (1 cm = 0.393701 inches)"""
    if cm_value is None:
        return None
    return round(cm_value * 0.393701, 1)

def process_dimensions(artwork):
    """Process dimension fields: parse sizeCm, convert to inches, create separate fields"""
    updated = False
    
    # If we have sizeCm but missing individual fields, parse it
    if artwork.get('sizeCm') and not artwork.get('heightCm'):
        height_cm, width_cm = parse_size_cm(artwork['sizeCm'])
        if height_cm and width_cm:
            artwork['heightCm'] = height_cm
            artwork['widthCm'] = width_cm
            artwork['heightInches'] = cm_to_inches(height_cm)
            artwork['widthInches'] = cm_to_inches(width_cm)
            updated = True
    
    # If we have individual cm fields but missing inches
    if artwork.get('heightCm') and not artwork.get('heightInches'):
        artwork['heightInches'] = cm_to_inches(artwork['heightCm'])
        updated = True
    
    if artwork.get('widthCm') and not artwork.get('widthInches'):
        artwork['widthInches'] = cm_to_inches(artwork['widthCm'])
        updated = True
    
    return updated

def prepare_openai_requests(artworks):
    """Prepare batch requests for OpenAI translation"""
    requests = []
    translation_candidates = {
        'titles': [],
        'descriptions': [],
        'curatorNotes': []
    }
    
    print("🔍 Analyzing artworks for translation needs...")
    
    for artwork in artworks:
        artwork_id = artwork['id']
        
        # Check title translation
        if (artwork.get('title') and artwork['title'].strip() and 
            not artwork.get('titleEn')):
            translation_candidates['titles'].append(artwork)
            
            # Build context for title translation
            context_parts = []
            if artwork.get('description'):
                context_parts.append(f"Artwork inscription: {artwork['description']}")
            if artwork.get('year'):
                context_parts.append(f"Year: {artwork['year']}")
            if artwork.get('heightCm') and artwork.get('widthCm'):
                context_parts.append(f"Dimensions: {artwork['heightCm']}×{artwork['widthCm']}cm")
            
            context = "\n".join(context_parts) if context_parts else "No additional context"
            
            request = {
                "custom_id": f"title_{artwork_id}",
                "method": "POST",
                "url": "/v1/chat/completions",
                "body": {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a classical Chinese poetry and literature translation expert. Translate Chinese artwork titles into elegant, concise English that preserves poetic meaning. Provide only the translated title without any extra text, symbols, or commentary."
                        },
                        {
                            "role": "user",
                            "content": f"Translate this traditional Chinese artwork title to English:\n\nTitle: {artwork['title']}\n\nContext:\n{context}\n\nProvide only the English translation, nothing else."
                        }
                    ],
                    "max_tokens": 100,
                    "temperature": 0.3
                }
            }
            requests.append(request)
        
        # Check description translation
        if (artwork.get('description') and artwork['description'].strip() and 
            not artwork.get('descriptionEn')):
            translation_candidates['descriptions'].append(artwork)
            
            request = {
                "custom_id": f"description_{artwork_id}",
                "method": "POST",
                "url": "/v1/chat/completions",
                "body": {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a classical Chinese poetry translation expert. Translate Chinese inscriptions and poems into elegant English that preserves the poetic beauty and meaning. Provide only the translated text without any extra words, symbols, or commentary."
                        },
                        {
                            "role": "user",
                            "content": f"Translate this classical Chinese inscription/poem to English:\n\n{artwork['description']}\n\nProvide only the English translation, preserving the poetic structure and meaning."
                        }
                    ],
                    "max_tokens": 300,
                    "temperature": 0.3
                }
            }
            requests.append(request)
        
        # Check curator note translation
        if (artwork.get('curatorNote') and artwork['curatorNote'].strip() and 
            not artwork.get('curatorNoteEn')):
            translation_candidates['curatorNotes'].append(artwork)
            
            request = {
                "custom_id": f"curator_{artwork_id}",
                "method": "POST",
                "url": "/v1/chat/completions",
                "body": {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an art curator and Chinese culture expert. Translate Chinese curator notes into professional, scholarly English suitable for museum descriptions. Provide only the translated text without any extra words, symbols, or commentary."
                        },
                        {
                            "role": "user",
                            "content": f"Translate this curator note to English:\n\n{artwork['curatorNote']}\n\nProvide only the English translation."
                        }
                    ],
                    "max_tokens": 400,
                    "temperature": 0.3
                }
            }
            requests.append(request)
    
    return requests, translation_candidates

def create_batch_file(requests):
    """Create batch request file for OpenAI"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    batch_filename = f"unified_batch_requests_{timestamp}.jsonl"
    
    with open(batch_filename, 'w', encoding='utf-8') as f:
        for request in requests:
            f.write(json.dumps(request, ensure_ascii=False) + '\n')
    
    return batch_filename

def process_local_translations(artworks):
    """Process translations that don't require OpenAI (formats, dimensions)"""
    print("🔧 Processing local translations and conversions...")
    
    stats = {
        'formats_translated': 0,
        'dimensions_processed': 0,
        'fields_removed': 0
    }
    
    for artwork in artworks:
        artwork_id = artwork.get('id', 'unknown')
        
        # Translate format
        if artwork.get('format') and not artwork.get('formatEn'):
            format_en = FORMAT_TRANSLATIONS.get(artwork['format'])
            if format_en:
                artwork['formatEn'] = format_en
                stats['formats_translated'] += 1
                print(f"  ✅ Format: {artwork['format']} → {format_en}")
        
        # Process dimensions
        if process_dimensions(artwork):
            stats['dimensions_processed'] += 1
            print(f"  ✅ Dimensions processed for {artwork_id}")
        
        # Remove obsolete fields
        removed_fields = []
        for field in OBSOLETE_FIELDS:
            if field in artwork:
                del artwork[field]
                removed_fields.append(field)
                stats['fields_removed'] += 1
        
        if removed_fields:
            print(f"  🗑️  Removed fields: {', '.join(removed_fields)}")
    
    return stats

def run_openai_batch_translation(artworks):
    """Handle OpenAI batch translation process"""
    if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-api-key-here":
        print("❌ Please set your OpenAI API key in the script!")
        return False
    
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    # Prepare batch requests
    requests, candidates = prepare_openai_requests(artworks)
    
    if not requests:
        print("✨ All OpenAI translations are already complete!")
        return True
    
    total_items = len(candidates['titles']) + len(candidates['descriptions']) + len(candidates['curatorNotes'])
    print(f"🎯 Prepared {len(requests)} translation requests for {total_items} items")
    print(f"   - Titles: {len(candidates['titles'])}")
    print(f"   - Descriptions: {len(candidates['descriptions'])}")
    print(f"   - Curator Notes: {len(candidates['curatorNotes'])}")
    print(f"💰 Using Batch API - estimated 50% cost savings!")
    
    # Create and upload batch file
    batch_filename = create_batch_file(requests)
    print(f"📄 Created batch file: {batch_filename}")
    
    try:
        print("☁️  Uploading batch file...")
        with open(batch_filename, 'rb') as f:
            batch_file = client.files.create(file=f, purpose="batch")
        
        print(f"✅ Upload complete: {batch_file.id}")
        
        # Create batch job
        print("🚀 Starting batch translation job...")
        batch_job = client.batches.create(
            input_file_id=batch_file.id,
            endpoint="/v1/chat/completions",
            completion_window="24h"
        )
        
        print(f"✅ Batch job started: {batch_job.id}")
        print(f"📊 Status: {batch_job.status}")
        
        # Save job info
        job_info = {
            "batch_job_id": batch_job.id,
            "batch_file_id": batch_file.id,
            "request_count": len(requests),
            "created_at": datetime.now().isoformat(),
            "candidates": candidates
        }
        
        job_filename = f"unified_batch_job_{batch_job.id}.json"
        with open(job_filename, 'w', encoding='utf-8') as f:
            json.dump(job_info, f, ensure_ascii=False, indent=2)
        
        print(f"💾 Job info saved: {job_filename}")
        
        # Poll for completion
        print("\n⏳ Waiting for completion...")
        print("💡 You can close this program and check progress later")
        
        while True:
            try:
                batch_job = client.batches.retrieve(batch_job.id)
                print(f"📊 Status: {batch_job.status}")
                
                if batch_job.status == "completed":
                    print("🎉 Batch processing complete!")
                    break
                elif batch_job.status in ["failed", "expired", "cancelled"]:
                    print(f"❌ Batch processing failed: {batch_job.status}")
                    return False
                
                time.sleep(60)  # Check every minute
                
            except KeyboardInterrupt:
                print(f"\n⚠️  Program interrupted, but batch job continues in background")
                print(f"Use this ID to check later: {batch_job.id}")
                print(f"Or run: python download_batch_results.py {batch_job.id}")
                return False
            except Exception as e:
                print(f"Error checking status: {e}")
                time.sleep(60)
                continue
        
        # Download and process results
        return download_and_apply_results(client, batch_job, artworks)
        
    except Exception as e:
        print(f"❌ Error in batch translation: {e}")
        return False
    finally:
        # Cleanup
        try:
            if os.path.exists(batch_filename):
                os.remove(batch_filename)
        except:
            pass

def download_and_apply_results(client, batch_job, artworks):
    """Download batch results and apply to artworks"""
    print("📥 Downloading translation results...")
    
    try:
        result_file = client.files.content(batch_job.output_file_id)
        results_filename = f"batch_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl"
        
        with open(results_filename, 'wb') as f:
            f.write(result_file.content)
        
        print(f"✅ Results downloaded: {results_filename}")
        
        # Process results
        artwork_dict = {artwork['id']: artwork for artwork in artworks}
        stats = {'titles': 0, 'descriptions': 0, 'curator_notes': 0, 'failed': 0}
        
        print("🔄 Applying translations...")
        
        with open(results_filename, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    result = json.loads(line)
                    custom_id = result['custom_id']
                    
                    if result['response']['status_code'] == 200:
                        translation = result['response']['body']['choices'][0]['message']['content'].strip()
                        
                        if custom_id.startswith('title_'):
                            artwork_id = custom_id.replace('title_', '')
                            artwork_dict[artwork_id]['titleEn'] = translation
                            stats['titles'] += 1
                            print(f"  ✅ Title: {artwork_id}")
                            
                        elif custom_id.startswith('description_'):
                            artwork_id = custom_id.replace('description_', '')
                            artwork_dict[artwork_id]['descriptionEn'] = translation
                            stats['descriptions'] += 1
                            print(f"  ✅ Description: {artwork_id}")
                            
                        elif custom_id.startswith('curator_'):
                            artwork_id = custom_id.replace('curator_', '')
                            artwork_dict[artwork_id]['curatorNoteEn'] = translation
                            stats['curator_notes'] += 1
                            print(f"  ✅ Curator Note: {artwork_id}")
                    else:
                        stats['failed'] += 1
                        print(f"  ❌ Translation failed: {custom_id}")
                        
                except Exception as e:
                    stats['failed'] += 1
                    print(f"  ❌ Error processing result: {e}")
        
        print(f"\n📊 Translation Results:")
        print(f"   - Titles: {stats['titles']}")
        print(f"   - Descriptions: {stats['descriptions']}")
        print(f"   - Curator Notes: {stats['curator_notes']}")
        print(f"   - Failed: {stats['failed']}")
        
        # Cleanup results file
        try:
            os.remove(results_filename)
        except:
            pass
        
        return True
        
    except Exception as e:
        print(f"❌ Error downloading results: {e}")
        return False

def main():
    """Main execution function"""
    print("🎨 Unified Traditional Chinese Artwork Translation System")
    print("=" * 70)
    
    # Check input file
    input_file = 'data/artworks.json'
    if not os.path.exists(input_file):
        print(f"❌ File not found: {input_file}")
        return
    
    # Load artworks
    with open(input_file, 'r', encoding='utf-8') as f:
        artworks = json.load(f)
    
    print(f"📖 Loaded {len(artworks)} artworks")
    
    # Create backup
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = f'data/artworks_backup_unified_{timestamp}.json'
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(artworks, f, ensure_ascii=False, indent=2)
    print(f"💾 Backup created: {backup_file}")
    
    # Process local translations (formats, dimensions)
    local_stats = process_local_translations(artworks)
    
    # Process OpenAI translations
    openai_success = run_openai_batch_translation(artworks)
    
    # Save updated file
    with open(input_file, 'w', encoding='utf-8') as f:
        json.dump(artworks, f, ensure_ascii=False, indent=2)
    
    # Final summary
    print(f"\n🎉 Processing Complete!")
    print(f"📊 Local Processing:")
    print(f"   - Formats translated: {local_stats['formats_translated']}")
    print(f"   - Dimensions processed: {local_stats['dimensions_processed']}")
    print(f"   - Obsolete fields removed: {local_stats['fields_removed']}")
    print(f"🤖 OpenAI Translation: {'✅ Success' if openai_success else '⚠️  Incomplete'}")
    print(f"💾 Updated file: {input_file}")
    print(f"💾 Backup: {backup_file}")
    
    if not openai_success:
        print("\n💡 If OpenAI translation was interrupted, you can:")
        print("   1. Re-run this script to continue")
        print("   2. Or check for batch job files to resume manually")

if __name__ == "__main__":
    main()
    print("=" * 70)
    print("Complete! 🚀")