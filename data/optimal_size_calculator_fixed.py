#!/usr/bin/env python3
"""
中國傳統畫最適展示尺寸計算器
專為 Finerworks 精確尺寸設計
不處理圖片，只計算最佳展示比例
"""

import json
import math
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OptimalSizeCalculator:
    def __init__(self):
        """初始化尺寸計算器"""
        pass
        
    def parse_size_cm(self, size_str):
        """解析尺寸字串，返回 (height_cm, width_cm)"""
        if not size_str:
            return None, None
        
        size_str = size_str.replace('×', 'x').replace('X', 'x').replace(' ', '')
        
        if 'x' in size_str:
            parts = size_str.split('x')
            if len(parts) == 2:
                try:
                    height = float(parts[0])
                    width = float(parts[1])
                    return height, width
                except ValueError:
                    pass
        return None, None

    def cm_to_inches(self, cm):
        """轉換公分到英寸"""
        return cm / 2.54

    def analyze_artwork_characteristics(self, artwork):
        """分析畫作特性，決定適合的展示風格"""
        title = artwork.get('title', '')
        title_en = artwork.get('titleEn', '')
        description = artwork.get('description', '')
        
        # 判斷畫作類型
        artwork_type = 'general'
        viewing_style = 'comfortable'
        
        # 山水畫 - 適合較大尺寸，氣勢展示
        if any(keyword in title for keyword in ['山', '水', '峽', '瀑', '雲', '海']):
            artwork_type = 'landscape'
            viewing_style = 'dramatic'
            
        # 花鳥畫 - 適合中等尺寸，細節欣賞
        elif any(keyword in title for keyword in ['花', '鳥', '梅', '竹', '菊', '蘭']):
            artwork_type = 'flower_bird'
            viewing_style = 'comfortable'
            
        # 書法 - 適合較小尺寸，近距離欣賞
        elif any(keyword in title for keyword in ['書', '字', '經', '詩', '序']):
            artwork_type = 'calligraphy'
            viewing_style = 'intimate'
            
        # 人物、動物 - 適中尺寸
        elif any(keyword in title for keyword in ['人', '母', '熊', '雀', '鳥']):
            artwork_type = 'figure_animal'
            viewing_style = 'comfortable'
            
        return artwork_type, viewing_style

    def get_size_preferences(self, artwork_type, viewing_style):
        """根據畫作類型獲得尺寸偏好"""
        base_preferences = {
            'small': {'min': 8, 'max': 12},
            'medium': {'min': 12, 'max': 18},
            'large': {'min': 18, 'max': 24}
        }
        
        # 根據畫作類型調整
        if artwork_type == 'landscape':
            # 山水畫傾向於更大尺寸
            base_preferences = {
                'medium': {'min': 12, 'max': 18},
                'large': {'min': 18, 'max': 24},
                'statement': {'min': 24, 'max': 36}
            }
            
        elif artwork_type == 'calligraphy':
            # 書法傾向於較小精緻尺寸
            base_preferences = {
                'small': {'min': 8, 'max': 12},
                'medium': {'min': 12, 'max': 18}
            }
            
        return base_preferences

    def calculate_recommendation_score(self, width, height, original_ratio):
        """計算推薦分數 (1-100)"""
        score = 50  # 基礎分數
        
        # 尺寸適中性 (不要太小也不要太大)
        max_dim = max(width, height)
        if 12 <= max_dim <= 20:
            score += 30  # 最受歡迎的尺寸範圍
        elif 8 <= max_dim <= 24:
            score += 20
        elif max_dim > 30:
            score -= 10  # 太大可能不實用
        
        # 比例協調性
        calculated_ratio = width / height
        ratio_diff = abs(calculated_ratio - original_ratio)
        if ratio_diff < 0.05:
            score += 20  # 完全保持原比例
        elif ratio_diff < 0.1:
            score += 10
        
        # 尺寸的實用性 (避免太奇怪的尺寸)
        if min(width, height) < 6:
            score -= 20  # 太窄不好看
        
        return max(0, min(100, score))

    def calculate_optimal_sizes(self, artwork):
        """計算最適合的展示尺寸"""
        height_cm, width_cm = self.parse_size_cm(artwork.get('sizeCm', ''))
        
        if not height_cm or not width_cm:
            logger.warning(f"無法解析尺寸: {artwork.get('id', 'unknown')}")
            return []
        
        # 轉換為英寸
        height_in = self.cm_to_inches(height_cm)
        width_in = self.cm_to_inches(width_cm)
        original_ratio = width_in / height_in
        
        # 分析畫作特性
        artwork_type, viewing_style = self.analyze_artwork_characteristics(artwork)
        
        # 根據畫作類型調整尺寸偏好
        size_preferences = self.get_size_preferences(artwork_type, viewing_style)
        
        all_sizes = []
        
        # 為每個尺寸範圍生成候選尺寸
        for size_category, size_range in size_preferences.items():
            min_size = size_range['min']
            max_size = size_range['max']
            
            # 嘗試該範圍內的幾個目標尺寸
            for target_size in [min_size, (min_size + max_size) / 2, max_size]:
                if original_ratio > 1:
                    # 橫向畫作 (寬 > 高)
                    width = target_size
                    height = width / original_ratio
                else:
                    # 直向畫作 (高 > 寬)
                    height = target_size
                    width = height * original_ratio
                
                # 保持精確比例的四捨五入
                width_rounded = round(width)
                height_rounded = round(height)
                
                # 驗證比例是否保持一致
                new_ratio = width_rounded / height_rounded
                if abs(new_ratio - original_ratio) > 0.1:
                    # 如果比例偏差太大，調整一個維度
                    if original_ratio > 1:
                        height_rounded = round(width_rounded / original_ratio)
                    else:
                        width_rounded = round(height_rounded * original_ratio)
                
                # 檢查是否在合理範圍內
                if (min_size <= max(width_rounded, height_rounded) <= max_size and
                    min(width_rounded, height_rounded) >= 6):
                    
                    score = self.calculate_recommendation_score(width_rounded, height_rounded, original_ratio)
                    
                    all_sizes.append({
                        'width_inches': width_rounded,
                        'height_inches': height_rounded,
                        'score': score
                    })
        
        # 去除重複尺寸
        unique_sizes = {}
        for size in all_sizes:
            key = f"{size['width_inches']}x{size['height_inches']}"
            if key not in unique_sizes or size['score'] > unique_sizes[key]['score']:
                unique_sizes[key] = size
        
        # 按分數排序，取前2-3個
        sorted_sizes = sorted(unique_sizes.values(), key=lambda x: x['score'], reverse=True)
        
        # 返回最多3個最佳尺寸，移除分數
        result = []
        for i, size in enumerate(sorted_sizes[:3]):
            result.append({
                'width_inches': size['width_inches'],
                'height_inches': size['height_inches']
            })
        
        return result

    def generate_size_recommendations(self, artworks_file):
        """為所有畫作生成尺寸建議"""
        
        try:
            with open(artworks_file, 'r', encoding='utf-8') as f:
                artworks = json.load(f)
        except FileNotFoundError:
            logger.error(f"找不到文件: {artworks_file}")
            return {}
        
        recommendations = {}
        
        logger.info(f"分析 {len(artworks)} 幅畫作...")
        
        for artwork in artworks:
            art_id = artwork['id']
            title = artwork.get('title', 'Unknown')
            
            logger.info(f"分析: {title}")
            
            optimal_sizes = self.calculate_optimal_sizes(artwork)
            
            if optimal_sizes:
                recommendations[art_id] = {
                    'artwork_info': {
                        'id': art_id,
                        'title': title,
                        'title_en': artwork.get('titleEn', ''),
                        'original_size_cm': artwork.get('sizeCm', '')
                    },
                    'recommended_sizes': optimal_sizes
                }
            else:
                logger.warning(f"無法為 {title} 計算尺寸")
        
        return recommendations

    def save_recommendations(self, recommendations, output_file):
        """保存建議到JSON文件"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(recommendations, f, indent=2, ensure_ascii=False)
        
        logger.info(f"建議已保存到: {output_file}")

    def print_summary(self, recommendations):
        """打印摘要報告"""
        print("\n" + "="*80)
        print("📏 尺寸建議摘要報告")
        print("="*80)
        
        total_artworks = len(recommendations)
        print(f"總計畫作: {total_artworks}")
        
        # 顯示幾個代表性例子
        print(f"\n🎨 代表性建議:")
        count = 0
        for art_id, rec in recommendations.items():
            if count >= 5:
                break
            
            info = rec['artwork_info']
            sizes = rec['recommended_sizes']
            
            print(f"\n  {info['title']}")
            print(f"    原始: {info['original_size_cm']} cm")
            
            for i, size_info in enumerate(sizes):
                width = size_info['width_inches']
                height = size_info['height_inches']
                print(f"    size{i+1}: {width}×{height}\"")
            
            count += 1

def main():
    """主執行函數"""
    calculator = OptimalSizeCalculator()
    
    # 設定文件路徑
    artworks_file = "data/artworks.json"
    output_file = "finerworks_size_recommendations.json"
    
    print("🎨 中國傳統畫最適展示尺寸計算器")
    print("專為 Finerworks 精確尺寸設計")
    print("="*60)
    print(f"讀取: {artworks_file}")
    print(f"輸出: {output_file}")
    print()
    
    # 生成建議
    recommendations = calculator.generate_size_recommendations(artworks_file)
    
    if recommendations:
        # 保存結果
        calculator.save_recommendations(recommendations, output_file)
        
        # 顯示摘要
        calculator.print_summary(recommendations)
        
        print(f"\n✅ 完成！{len(recommendations)} 幅畫作的尺寸建議已生成")
        print(f"🔧 可直接用於 Finerworks API 整合")
        
    else:
        print("❌ 沒有生成任何建議，請檢查數據文件")

if __name__ == "__main__":
    main()