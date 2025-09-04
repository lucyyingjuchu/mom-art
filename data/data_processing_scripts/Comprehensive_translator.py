#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comprehensive translation and cleanup script for artworks.json
Handles: titles, formats, dimensions, and removes obsolete fields
"""

import sys
import os
import json
import re
from datetime import datetime

# Windows 編碼修正
if sys.platform.startswith('win'):
    import codecs
    try:
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())
    except:
        pass
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# 格式翻譯映射表
FORMAT_TRANSLATIONS = {
    "軸": "Hanging Scroll",
    "框": "Framed",
    "鏡片": "Mounted Panel", 
    "橫軸": "Horizontal Scroll",
    "圓框": "Circular Frame",
    "扇面": "Fan",
    "對聯": "Couplet"
}

# 要刪除的廢棄字段
OBSOLETE_FIELDS = ['medium', 'recent', 'category']



def convert_cm_to_inches(cm_string):
    """
    轉換厘米到英寸
    "135×70" -> "53.1×27.6 inches"
    """
    if not cm_string:
        return ""
    
    # 找到數字
    pattern = r'(\d+)\s*[×x]\s*(\d+)'
    match = re.search(pattern, cm_string)
    
    if match:
        height_cm = int(match.group(1))
        width_cm = int(match.group(2))
        
        # 轉換 (1 cm = 0.393701 inches)
        height_in = round(height_cm * 0.393701, 1)
        width_in = round(width_cm * 0.393701, 1)
        
        return f"{height_in}×{width_in} inches"
    
    return ""

def process_comprehensive_translation():
    input_file = 'data/artworks.json'
    backup_file = f'data/artworks_backup_comprehensive_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    
    if not os.path.exists(input_file):
        print(f"❌ 找不到文件：{input_file}")
        return
    
    # 讀取文件
    with open(input_file, 'r', encoding='utf-8') as f:
        artworks = json.load(f)
    
    print(f"📖 載入了 {len(artworks)} 個作品")
    
    # 創建備份
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(artworks, f, ensure_ascii=False, indent=2)
    print(f"💾 備份創建：{backup_file}")
    
    # 統計信息
    stats = {
        'formats_translated': 0,
        'dimensions_converted': 0,
        'fields_removed': 0
    }
    
    # 處理每個作品
    for i, artwork in enumerate(artworks):
        artwork_id = artwork.get('id', f'artwork_{i}')
        print(f"🎨 處理 {artwork_id}")
        
        # 2. 翻譯格式
        if artwork.get('format') and not artwork.get('formatEn'):
            format_en = FORMAT_TRANSLATIONS.get(artwork['format'])
            if format_en:
                artwork['formatEn'] = format_en
                stats['formats_translated'] += 1
                print(f"  ✅ 格式翻譯：{artwork['format']} -> {format_en}")
        
        # 3. 轉換尺寸
        if artwork.get('sizeCm') and not artwork.get('sizeInches'):
            size_inches = convert_cm_to_inches(artwork['sizeCm'])
            if size_inches:
                artwork['sizeInches'] = size_inches
                stats['dimensions_converted'] += 1
                print(f"  ✅ 尺寸轉換：{artwork['sizeCm']} -> {size_inches}")
        
        # 4. 移除廢棄字段
        removed_fields = []
        for field in OBSOLETE_FIELDS:
            if field in artwork:
                del artwork[field]
                removed_fields.append(field)
                stats['fields_removed'] += 1
        
        if removed_fields:
            print(f"  🗑️  移除字段：{', '.join(removed_fields)}")
    
    # 保存更新的文件
    with open(input_file, 'w', encoding='utf-8') as f:
        json.dump(artworks, f, ensure_ascii=False, indent=2)
    
    # 顯示統計
    print(f"\n🎉 處理完成！")
    print(f"📊 統計信息：")
    print(f"  格式翻譯：{stats['formats_translated']}")
    print(f"  尺寸轉換：{stats['dimensions_converted']}")
    print(f"  移除字段：{stats['fields_removed']}")
    print(f"💾 備份文件：{backup_file}")

if __name__ == "__main__":
    print("🔧 綜合翻譯和清理工具")
    print("="*50)
    process_comprehensive_translation()
    print("="*50)
    print("完成！🚀")