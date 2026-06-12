from PIL import Image
import numpy as np

def create_pure_alpha_stealth(image_path, output_path, factor=0.12):
    """
    透過純粹調整 PNG 的 RGB 與 Alpha 達到隱形效果。
    
    :param image_path: 原始彩色圖片路徑
    :param output_path: 輸出的隱形 PNG 路徑
    :param factor: 隱形係數 (建議 0.08 到 0.15 之間)
                   - 數值越小：在深灰背景下隱形效果越好，但點開時畫面較暗。
                   - 數值越大：點開時色彩越亮，但在深灰背景下會隱約看出輪廓。
    """
    print(f"正在以純 Alpha 調整法處理圖片 (隱形係數: {factor})...")
    try:
        # 1. 載入原始彩色圖片
        img = Image.open(image_path).convert("RGB")
        arr = np.array(img).astype(float)
        
        # 2. 找出每個像素中 R, G, B 的最大值，作為亮度的基準
        max_rgb = np.max(arr, axis=2)
        max_rgb_safe = np.where(max_rgb == 0, 1.0, max_rgb) # 避免除以零
        
        # 3. 重建 RGB 通道：將色彩推到該亮度下的最大飽和度
        # 公式：輸出 RGB = 原始 RGB / 最大亮度 * 255
        out_r = np.clip(arr[:,:,0] / max_rgb_safe * 255.0, 0, 255)
        out_g = np.clip(arr[:,:,1] / max_rgb_safe * 255.0, 0, 255)
        out_b = np.clip(arr[:,:,2] / max_rgb_safe * 255.0, 0, 255)
        
        # 4. 重建 Alpha 通道：將透明度與像素亮度掛鉤，並乘以隱形係數
        # 公式：Alpha = 最大亮度 * factor
        # 這會讓亮處稍微不透明，暗處幾乎完全透明
        out_a = np.clip(max_rgb * factor, 0, 255)
        
        # 5. 合併為 RGBA 陣列並儲存
        rgba = np.dstack((out_r, out_g, out_b, out_a)).astype(np.uint8)
        Image.fromarray(rgba).save(output_path, "PNG")
        
        print(f"✅ 處理完成！已儲存至: {output_path}")
        print(f"💡 當 factor 設為 {factor} 時，圖片在 Discord 深色聊天室中會有極佳的隱形效果。")
        
    except Exception as e:
        print(f"❌ 發生錯誤: {e}")

# ================= 執行區塊 =================
if __name__ == "__main__":
    # 放入你想隱藏的單張彩色圖片
    input_file = "../public/example.jpeg" 
    output_file = "pure_alpha_magic.png"
    
    # 建議先用預設的 0.12 測試，再根據顯示效果微調 factor
    create_pure_alpha_stealth(input_file, output_file, factor=0.12)
