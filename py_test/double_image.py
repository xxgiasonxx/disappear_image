import cv2
import numpy as np

def generate_color_mirage_tank(light_preview_path, dark_secret_path, output_png_path):
    """
    純數學矩陣融合：生成全彩色的幻影坦克圖片（不產圖，僅供程式碼編譯）
    
    light_preview_path: 在白色/淺色背景（Discord預覽）想看到的彩色圖
    dark_secret_path:   在黑色背景（Discord點開大圖）想看到的彩色秘密圖
    """
    # 1. 讀取兩張全彩圖片 (OpenCV 預設為 BGR 格式)
    img_light = cv2.imread(light_preview_path).astype(np.float32)
    img_dark = cv2.imread(dark_secret_path).astype(np.float32)
    
    # 確保兩張圖的解析度完全一致
    h, w, _ = img_light.shape
    img_dark = cv2.resize(img_dark, (w, h), interpolation=cv2.INTER_AREA)
    
    # 2. 【核心數學公式】動態範圍壓縮
    # 為了讓單一 Alpha 通道能同時容納兩張全彩圖的方程式，
    # 必須將預覽圖限縮在高光區 [128, 255]，秘密圖限縮在低光區 [0, 128]
    img_light = 128.0 + img_light * 0.5
    img_dark = img_dark * 0.5
    
    # 3. 計算 B、G、R 三個通道各自獨立的理想 Alpha 值
    # 公式衍生自：Output = PNG * Alpha + Background * (1 - Alpha)
    a_b = 1.0 - (img_light[:, :, 0] - img_dark[:, :, 0]) / 255.0
    a_g = 1.0 - (img_light[:, :, 1] - img_dark[:, :, 1]) / 255.0
    a_r = 1.0 - (img_light[:, :, 2] - img_dark[:, :, 2]) / 255.0
    
    # 4. 取三軌平均值，作為 PNG 唯一的 Alpha 通道（這是最完美的數學妥協點）
    alpha = (a_b + a_g + a_r) / 3.0
    alpha = np.clip(alpha, 0.02, 1.0)  # 避免除以 0 導致無限大
    
    # 5. 反向推導出該 PNG 像素本身應有的全彩 RGB 數值
    # 依據黑底渲染公式：Output_Dark = PNG_RGB * Alpha
    b_png = img_dark[:, :, 0] / alpha
    g_png = img_dark[:, :, 1] / alpha
    r_png = img_dark[:, :, 2] / alpha
    
    # 6. 限制數值在合法色彩區間 [0, 255] 並轉回無損 8-bit 矩陣
    b_png = np.clip(b_png, 0, 255).astype(np.uint8)
    g_png = np.clip(g_png, 0, 255).astype(np.uint8)
    r_png = np.clip(r_png, 0, 255).astype(np.uint8)
    a_png = (alpha * 255.0).astype(np.uint8)
    
    # 7. 合成 BGRA 四通道無損 PNG
    rgba_tank = cv2.merge([b_png, g_png, r_png, a_png])
    
    # 儲存結果
    cv2.imwrite(output_png_path, rgba_tank)
    print(f"融合成功！全彩色幻影坦克已儲存至：{output_png_path}")

if __name__ == "__main__":
    generate_color_mirage_tank(
        light_preview_path="../public/wdakf9dunnya1.jpg",  # 縮圖看到的彩色風景
        dark_secret_path="../public/example.jpeg", # 點開看到的彩色秘密
        output_png_path="color_illusion_matrix.png"    # 最終輸出的全彩魔術圖
    )
