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
        
        # 一般大眾喜歡的牆面尺寸範圍 (英寸)
        self.popular_size_ranges = {
            'small': {'min': 8, 'max': 12, 'ideal_for': '書房、床頭、小空間'},
            'medium': {'min': 12, 'max': 18, 'ideal_for': '客廳、臥室主牆'},
            'large': {'min': 18, 'max': 24, 'ideal_for': '大客廳、玄關'},
            'statement': {'min': 24, 'max': 36, 'ideal_for': '藝廊、豪宅、商業空間'}
        }
        
        # 中國傳統畫的理想觀賞距離比例
        self.viewing_distance_ratios = {
            'intimate': 1.5,  # 近距離欣賞 (書法、細節)
            'comfortable': 2.0,  # 舒適觀賞 (一般繪畫)
            'dramatic': 2.5   # 氣勢展示 (大山水)
        }
        
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
        
        optimal_sizes = []
        
        for size_category, target_range in size_preferences.items():
            # 計算該範圍內的最適尺寸
            sizes_in_range = self.calculate_sizes_in_range(
                original_ratio, target_range, size_category
            )
            optimal_sizes.extend(sizes_in_range)
        
        # 排序：優先顯示最推薦的尺寸
        optimal_sizes.sort(key=lambda x: x['recommendation_score'], reverse=True)
        
        return optimal_sizes

    def get_size_preferences(self, artwork_type, viewing_style):
        """根據畫作類型獲得尺寸偏好"""
        base_preferences = {
            'small': self.popular_size_ranges['small'],
            'medium': self.popular_size_ranges['medium'],
            'large': self.popular_size_ranges['large']
        }
        
        # 根據畫作類型調整
        if artwork_type == 'landscape':
            # 山水畫傾向於更大尺寸
            base_preferences['large'] = self.popular_size_ranges['large']
            base_preferences['statement'] = self.popular_size_ranges['statement']
            del base_preferences['small']
            
        elif artwork_type == 'calligraphy':
            # 書法傾向於較小精緻尺寸
            base_preferences = {
                'small': self.popular_size_ranges['small'],
                'medium': self.popular_size_ranges['medium']
            }
            
        elif artwork_type == 'flower_bird':
            # 花鳥畫適合各種尺寸
            pass  # 保持原有設定
            
        return base_preferences

    def calculate_sizes_in_range(self, original_ratio, size_range, category):
        """在指定範圍內計算最適尺寸"""
        min_size = size_range['min']
        max_size = size_range['max']
        ideal_for = size_range['ideal_for']
        
        sizes = []
        
        # 計算以長邊為基準的尺寸
        for long_side in [min_size, (min_size + max_size) / 2, max_size]:
            if original_ratio > 1:
                # 橫向畫作
                width = long_side
                height = width / original_ratio
            else:
                # 直向畫作
                height = long_side
                width = height * original_ratio
            
            # 四捨五入到最近整數
            width_rounded = round(width)
            height_rounded = round(height)
            
            # 檢查是否在合理範圍內
            if (min_size <= max(width_rounded, height_rounded) <= max_size and
                min(width_rounded, height_rounded) >= 6):  # 最小邊至少6英寸
                
                # 計算推薦分數
                score = self.calculate_recommendation_score(
                    width_rounded, height_rounded, category, original_ratio
                )
                
                sizes.append({
                    'width_inches': width_rounded,
                    'height_inches': height_rounded,
                    'category': category,
                    'ideal_for': ideal_for,
                    'original_ratio': original_ratio,
                    'recommendation_score': score,
                    'aspect_ratio': width_rounded / height_rounded
                })
        
        return sizes

    def calculate_recommendation_score(self, width, height, category, original_ratio):
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
        
        # 整數的美觀性
        if width == height:
            score += 5  # 方形有特殊美感
        
        return max(0, min(100, score))

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
                        'original_size_cm': artwork.get('sizeCm', ''),
                        'format': artwork.get('formatEn', artwork.get('format', ''))
                    },
                    'recommended_sizes': optimal_sizes[:5],  # 只保留前5個最佳尺寸
                    'size_analysis': {
                        'artwork_type': self.analyze_artwork_characteristics(artwork)[0],
                        'viewing_style': self.analyze_artwork_characteristics(artwork)[1],
                        'aspect_ratio': optimal_sizes[0]['original_ratio'] if optimal_sizes else None
                    }
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
        
        # 統計最受歡迎的尺寸
        size_counts = {}
        for rec in recommendations.values():
            for size in rec['recommended_sizes']:
                size_key = f"{size['width_inches']}×{size['height_inches']}"
                size_counts[size_key] = size_counts.get(size_key, 0) + 1
        
        print(f"\n📊 最受歡迎的建議尺寸:")
        sorted_sizes = sorted(size_counts.items(), key=lambda x: x[1], reverse=True)
        for size, count in sorted_sizes[:10]:
            print(f"  {size}\": {count} 幅畫作")
        
        # 顯示幾個代表性例子
        print(f"\n🎨 代表性建議:")
        count = 0
        for art_id, rec in recommendations.items():
            if count >= 5:
                break
            
            info = rec['artwork_info']
            best_size = rec['recommended_sizes'][0]
            
            print(f"\n  {info['title']}")
            print(f"    原始: {info['original_size_cm']} cm")
            print(f"    建議: {best_size['width_inches']}×{best_size['height_inches']}\" ({best_size['ideal_for']})")
            print(f"    分數: {best_size['recommendation_score']}/100")
            
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
