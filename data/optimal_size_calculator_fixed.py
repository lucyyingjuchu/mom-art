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

    def get_area_preferences(self, artwork_type, viewing_style):
        """根據畫作類型獲得面積偏好"""
        base_preferences = {
            'small': {'min': 60, 'max': 110},
            'medium': {'min': 111, 'max': 160},
            'large': {'min': 161, 'max': 210}
        }
        
        # 根據畫作類型調整
        if artwork_type == 'landscape':
            # 山水畫傾向於更大尺寸
            base_preferences = {
                'medium': {'min': 111, 'max': 160},
                'large': {'min': 161, 'max': 210},
                'statement': {'min': 211, 'max': 300}
            }
            
        elif artwork_type == 'calligraphy':
            # 書法傾向於較小精緻尺寸
            base_preferences = {
                'small': {'min': 60, 'max': 110},
                'medium': {'min': 111, 'max': 160}
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

    def find_best_integer_combinations(self, target_areas, original_ratio):
        """找到最接近目標面積且比例一致的整數組合"""
        all_combinations = []
        
        # 為每個目標面積找到候選的整數組合
        for target_area in target_areas:
            # 估算大概的尺寸範圍
            estimated_height = math.sqrt(target_area / original_ratio)
            estimated_width = math.sqrt(target_area * original_ratio)
            
            # 在估算尺寸附近搜索整數組合
            height_range = range(max(6, int(estimated_height) - 3), int(estimated_height) + 4)
            width_range = range(max(6, int(estimated_width) - 3), int(estimated_width) + 4)
            
            for h in height_range:
                for w in width_range:
                    area = w * h
                    ratio = w / h
                    area_diff = abs(area - target_area)
                    ratio_diff = abs(ratio - original_ratio)
                    
                    # 只考慮面積差異在合理範圍內的組合
                    if area_diff <= target_area * 0.4:
                        all_combinations.append({
                            'width': w,
                            'height': h,
                            'area': area,
                            'ratio': ratio,
                            'target_area': target_area,
                            'area_diff': area_diff,
                            'ratio_diff': ratio_diff
                        })
        
        if not all_combinations:
            return []
        
        # 直接按比例差異排序，找到比例最接近的組合
        all_combinations.sort(key=lambda x: x['ratio_diff'])
        
        # 選擇前幾個比例最好的組合，確保覆蓋不同面積
        selected = []
        used_dimensions = set()
        target_areas_sorted = sorted(set(target_areas))
        
        # 首先嘗試為每個目標面積找到最佳比例的組合
        for target_area in target_areas_sorted:
            if len(selected) >= 3:
                break
                
            # 找到面積接近且比例最好的組合
            candidates = [combo for combo in all_combinations 
                         if abs(combo['area'] - target_area) <= target_area * 0.4
                         and f"{combo['width']}x{combo['height']}" not in used_dimensions]
            
            if candidates:
                # 選擇比例最好的
                best_candidate = min(candidates, key=lambda x: x['ratio_diff'])
                selected.append(best_candidate)
                used_dimensions.add(f"{best_candidate['width']}x{best_candidate['height']}")
        
        # 如果還沒有3個，從剩余比例最好的組合中補充
        remaining_candidates = [combo for combo in all_combinations 
                               if f"{combo['width']}x{combo['height']}" not in used_dimensions]
        
        for combo in remaining_candidates:
            if len(selected) >= 3:
                break
            selected.append(combo)
            used_dimensions.add(f"{combo['width']}x{combo['height']}")
        
        # 按面積排序最終結果
        selected.sort(key=lambda x: x['area'])
        
        return selected

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
        
        # 根據畫作類型調整面積偏好
        area_preferences = self.get_area_preferences(artwork_type, viewing_style)
        
        # 收集所有目標面積
        all_target_areas = []
        for area_range in area_preferences.values():
            min_area = area_range['min']
            max_area = area_range['max']
            all_target_areas.extend([min_area, (min_area + max_area) / 2, max_area])
        
        # 找到最佳的整數組合
        best_combinations = self.find_best_integer_combinations(all_target_areas, original_ratio)
        
        # 轉換為結果格式
        result = []
        for combo in best_combinations:
            result.append({
                'width_inches': combo['width'],
                'height_inches': combo['height']
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