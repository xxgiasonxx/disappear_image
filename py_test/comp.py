import numpy as np
import cv2

# ==========================================
# 1. 權重核心函數 (Kernels)
# ==========================================

def bicubic_kernel(x, a=-0.5):
    """Bicubic 卷積核 (標準 Catmull-Rom 樣條)"""
    x = abs(x)
    if x <= 1:
        return (a + 2) * (x**3) - (a + 3) * (x**2) + 1
    elif x < 2:
        return a * (x**3) - 5 * a * (x**2) + 8 * a * x - 4 * a
    return 0.0

def lanczos_kernel(x, a=3):
    """Lanczos-3 卷積核 (半徑 a = 3)"""
    if x == 0: 
        return 1.0
    if abs(x) >= a: 
        return 0.0
    pi_x = np.pi * x
    return (np.sin(pi_x) / pi_x) * (np.sin(pi_x / a) / (pi_x / a))

# ==========================================
# 2. 三大壓縮算法主程式
# ==========================================

def resize_bilinear(img, dst_h, dst_w):
    """雙線性插值壓縮 (參考鄰近 2x2 像素)"""
    src_h, src_w, channels = img.shape
    dst = np.zeros((dst_h, dst_w, channels), dtype=np.uint8)
    
    scale_y = src_h / dst_h
    scale_x = src_w / dst_w
    
    for dy in range(dst_h):
        for dx in range(dst_w):
            # 1. 映射回原圖幾何中心座標
            sx = (dx + 0.5) * scale_x - 0.5
            sy = (dy + 0.5) * scale_y - 0.5
            
            # 2. 尋找左上角的整數像素點
            x1 = int(np.floor(sx))
            y1 = int(np.floor(sy))
            x2 = min(x1 + 1, src_w - 1)
            y2 = min(y1 + 1, src_h - 1)
            x1, y1 = max(0, x1), max(0, y1)
            
            # 3. 計算距離權重
            tx = sx - x1
            ty = sy - y1
            
            # 4. 2x2 矩陣內進行雙向線性內插
            for c in range(channels):
                p1 = img[y1, x1, c]
                p2 = img[y1, x2, c]
                p3 = img[y2, x1, c]
                p4 = img[y2, x2, c]
                
                # 橫向插值
                inter_top = p1 + tx * (p2 - p1)
                inter_bottom = p3 + tx * (p4 - p3)
                # 縱向插值
                dst[dy, dx, c] = np.clip(inter_top + ty * (inter_bottom - inter_top), 0, 255)
    return dst


def resize_bicubic(img, dst_h, dst_w):
    """雙三次插值壓縮 (參考鄰近 4x4 像素)"""
    src_h, src_w, channels = img.shape
    dst = np.zeros((dst_h, dst_w, channels), dtype=np.uint8)
    
    scale_y = src_h / dst_h
    scale_x = src_w / dst_w
    
    for dy in range(dst_h):
        for dx in range(dst_w):
            sx = (dx + 0.5) * scale_x - 0.5
            sy = (dy + 0.5) * scale_y - 0.5
            
            fx = int(np.floor(sx))
            fy = int(np.floor(sy))
            
            # 收集 X 與 Y 方向的 4 個連續點的卷積權重
            weights_x = [bicubic_kernel(sx - (fx + i)) for i in range(-1, 3)]
            weights_y = [bicubic_kernel(sy - (fy + i)) for i in range(-1, 3)]
            
            # 確保權重總和為 1 (歸一化避免亮度失真)
            weights_x /= np.sum(weights_x)
            weights_y /= np.sum(weights_y)
            
            for c in range(channels):
                val = 0.0
                # 4x4 鄰域加權求和
                for i in range(-1, 3):
                    yy = np.clip(fy + i, 0, src_h - 1)
                    for j in range(-1, 3):
                        xx = np.clip(fx + j, 0, src_w - 1)
                        val += img[yy, xx, c] * weights_x[j + 1] * weights_y[i + 1]
                
                dst[dy, dx, c] = np.clip(val, 0, 255)
    return dst


def resize_lanczos3(img, dst_h, dst_w):
    """Lanczos-3 插值壓縮 (參考鄰近 6x6 像素)"""
    src_h, src_w, channels = img.shape
    dst = np.zeros((dst_h, dst_w, channels), dtype=np.uint8)
    
    scale_y = src_h / dst_h
    scale_x = src_w / dst_w
    
    for dy in range(dst_h):
        for dx in range(dst_w):
            sx = (dx + 0.5) * scale_x - 0.5
            sy = (dy + 0.5) * scale_y - 0.5
            
            fx = int(np.floor(sx))
            fy = int(np.floor(sy))
            
            # Lanczos3 窗函數半徑為 3，探查範圍為 -2 到 +3 (共 6 個像素)
            weights_x = [lanczos_kernel(sx - (fx + i)) for i in range(-2, 4)]
            weights_y = [lanczos_kernel(sy - (fy + i)) for i in range(-2, 4)]
            
            # 歸一化權重
            sum_x = np.sum(weights_x)
            sum_y = np.sum(weights_y)
            if sum_x != 0: weights_x /= sum_x
            if sum_y != 0: weights_y /= sum_y
            
            for c in range(channels):
                val = 0.0
                # 6x6 鄰域加權求和
                for i in range(-2, 4):
                    yy = np.clip(fy + i, 0, src_h - 1)
                    for j in range(-2, 4):
                        xx = np.clip(fx + j, 0, src_w - 1)
                        val += img[yy, xx, c] * weights_x[j + 2] * weights_y[i + 2]
                
                dst[dy, dx, c] = np.clip(val, 0, 255)
    return dst

# ==========================================
# 3. 測試驗證流程
# ==========================================
if __name__ == "__main__":
    # 讀取你做好的高頻魔術 PNG 圖片（假設是 1500x1500）
    magic_img = cv2.imread('./magic_result.jpg', cv2.IMREAD_COLOR)
    
    if magic_img is not None:
        # 設定目標縮圖尺寸（假設縮小 5 倍變成 300x300）
        t_h, t_w = 700, 1050
        
        print("正在模擬 Bilinear 壓縮...")
        res_bilinear = resize_bilinear(magic_img, t_h, t_w)
        cv2.imwrite('result_bilinear.png', res_bilinear)
        
        print("正在模擬 Bicubic 壓縮...")
        res_bicubic = resize_bicubic(magic_img, t_h, t_w)
        cv2.imwrite('result_bicubic.png', res_bicubic)
        
        print("正在模擬 Lanczos3 壓縮...")
        res_lanczos = resize_lanczos3(magic_img, t_h, t_w)
        cv2.imwrite('result_lanczos.png', res_lanczos)
        
        print("所有演算法模擬完成！請檢查生成的三張縮圖是否完美達成了全黑或全白。")
