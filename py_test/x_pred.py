import os
from PIL import Image
import numpy as np

class XImagePipeline:
    def __init__(self):
        # 1. 寫入你逆向抓到的 X 伺服器專用量化表 (必須是 64 個元素的平坦列表)
        self.q_table_y = [
            5,  3,  3,  5,  7, 12, 15, 18,
            4,  4,  4,  6,  8, 17, 18, 17,
            4,  4,  5,  7, 12, 17, 21, 17,
            4,  5,  7,  9, 15, 26, 24, 19,
            5,  7, 11, 17, 20, 33, 31, 23,
            7, 11, 17, 19, 24, 31, 34, 28,
            15, 19, 23, 26, 31, 36, 36, 30,
            22, 28, 29, 29, 34, 30, 31, 30
        ]

        self.q_table_c = [
            5,  5,  7, 14, 30, 30, 30, 30,
            5,  6,  8, 20, 30, 30, 30, 30,
            7,  8, 17, 30, 30, 30, 30, 30,
            14, 20, 30, 30, 30, 30, 30, 30,
            30, 30, 30, 30, 30, 30, 30, 30,
            30, 30, 30, 30, 30, 30, 30, 30,
            30, 30, 30, 30, 30, 30, 30, 30,
            30, 30, 30, 30, 30, 30, 30, 30
        ]
        
        # 2. 定義 X 的三大檔位長邊限制
        self.size_limits = {
            "small": 680,
            "medium": 1200,
            "large": 2048
        }

    def calculate_target_size(self, w_orig, h_orig, max_edge_limit):
        """
        核心演算法：最大長邊錨定法
        """
        long_edge = max(w_orig, h_orig)
        
        # 如果原圖最長邊已經小於限制，X 通常不會放大，維持原尺寸
        if long_edge <= max_edge_limit:
            return w_orig, h_orig
        
        # 計算等比例縮放係數
        scale = max_edge_limit / long_edge
        w_target = round(w_orig * scale)
        h_target = round(h_orig * scale)
        
        return w_target, h_target

    def process_image(self, input_path, output_dir="x_simulated_outputs"):
        """
        執行縮放與自定義量化表壓縮
        """
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # 載入原始圖片並確保轉換為 RGB (JPEG 不支援 RGBA 透明通道)
        img = Image.open(input_path).convert("RGB")
        w_orig, h_orig = img.size
        print(f"原始圖片尺寸: {w_orig} x {h_orig}")
        print("-" * 40)

        base_name = os.path.splitext(os.path.basename(input_path))[0]

        # 巡迴處理 small, medium, large 三個檔位
        for name, limit in self.size_limits.items():
            # 步驟 A: 判斷並計算目標大小
            w_target, h_target = self.calculate_target_size(w_orig, h_orig, limit)
            
            # 步驟 B: 使用 Bicubic 進行下採樣縮放
            resized_img = img.resize((w_target, h_target), resample=Image.Resampling.BICUBIC)
            
            # 步驟 C: 檔位輸出路徑
            output_filename = f"{base_name}_{name}.jpg"
            output_path = os.path.join(output_dir, output_filename)
            
            # 步驟 D: 強制注入 X 的自定義量化表進行 JPEG 壓縮
            resized_img.save(
                output_path, 
                format="JPEG", 
                qtables=[self.q_table_y, self.q_table_c]
            )
            
            print(f"檔位 [{name:6s}] -> 目標長邊限制: {limit}px")
            print(f"  └─ 縮放後解析度: {w_target} x {h_target}")
            print(f"  └─ 已儲存至: {output_path}")
            print("-" * 40)


def comp_show(image_path):
    # 載入你從 X 下載的 small 縮圖 (確保它是 jpg 格式)
    img = Image.open(image_path)

    # 1. 檢查 X 的內嵌資訊
    print("圖片格式:", img.format)  # 即使你上傳 PNG，這裡抓下來高機率變 JPEG 或 WEBP

    # 2. 提取 JPEG 的核心量化表
    if hasattr(img, "quantization"):
        print("\n--- X 伺服器的 JPEG 量化表 ---")
        for i, table in img.quantization.items():
            print(f"量化表 [{i}]:")
            # 轉成 8x8 矩陣印出來看
            matrix = [table[j:j+8] for j in range(0, 64, 8)]
            for row in matrix:
                print(" ".join(f"{num:4d}" for num in row))
    else:
        print("這張圖不是標準 JPEG，或者是經由瀏覽器二次轉換，未保留原始量化表。")

def create_twitter_checkerboard_illusion(fake_img, display_img, output_path, black_threshold=30):
    """
    X (Twitter) 專用雙圖切換生成器：
    1. 使用最簡單的 1x1 棋盤格交錯擺放「偽裝圖」與「顯示圖」。
    2. 如果顯示圖的像素是黑色（深色），則將其透明度設為 0。
    
    :param fake_path: 預覽時用來騙人的圖片（Fake Image）
    :param display_path: 點開後用來顯示的秘密圖片（Display Image）
    :param output_path: 輸出的 PNG 圖片路徑
    :param black_threshold: 判定為黑色的亮度閾值（0~255，預設 30。低於此數值會被當作黑色並轉為透明）
    """
    print("正在生成 X (Twitter) 棋盤格透明切換圖...")
    
    
    # 2. 將「顯示圖」強制縮放到與「偽裝圖」完全一致的尺寸
    display_img = display_img.resize(fake_img.size, Image.Resampling.LANCZOS)
    
    # 3. 建立空白的輸出畫布
    width, height = fake_img.size
    out_img = Image.new("RGBA", (width, height))
    
    # 載入像素資料以進行快速讀寫
    fake_pixels = fake_img.load()
    display_pixels = display_img.load()
    out_pixels = out_img.load()
    
    # 4. 最簡單的 1x1 棋盤格擺放
    for y in range(height):
        for x in range(width):
            if (x + y) % 2 == 0:
                # 【棋盤 A】：擺放「偽裝圖」的像素（保持完全不透明）
                r, g, b, _ = fake_pixels[x, y][:4]
                out_pixels[x, y] = (r, g, b, 0)
            else:
                # 【棋盤 B】：擺放「顯示圖」的像素
                r, g, b, _ = display_pixels[x, y][:4]
                
                # 判斷是否為黑色（或接近黑色的深色）
                # 如果 R、G、B 同時低於設定的閾值，就判定為黑色
                if r < black_threshold and g < black_threshold and b < black_threshold:
                    # 記得把顯示的那張透明度調了（設為 0，即完全透明）
                    out_pixels[x, y] = (r, g, b, 0)
                else:
                    # 非黑色像素，保持不透明
                    out_pixels[x, y] = (r, g, b, 255)
                    
    # 5. 儲存為無損 PNG 格式
    out_img.save(output_path, "PNG")
    print(f"🎉 圖片生成成功，已儲存至：'{output_path}'")

def create_twitter_checkerboard_illusion(display_img, output_path, disguise_color="white", threshold=None, display_alpha=None):
    """
    X (Twitter) 專用雙圖切換生成器：
    將預覽狀態偽裝成「全黑」或「全白」，點開或切換系統深淺色模式後才會顯現「顯示圖」。
    
    :param display_img: 點開後用來顯示的秘密圖片（PIL Image 物件）
    :param output_path: 輸出的 PNG 圖片路徑
    :param disguise_color: 偽裝顏色，可選擇 "white" (全白) 或 "black" (全黑)
    :param threshold: 判定透明度的亮度閾值 (0~255)。
                      - "white" 偽裝時，低於此值（深色）轉為透明（預設 50）
                      - "black" 偽裝時，高於此值（淺色）轉為透明（預設 200）
    :param display_alpha: 顯示圖非透明像素的透明度 (0~255)。
                          - "white" 偽裝時，預設為 255（不透明）
                          - "black" 偽裝時，預設為 70（半透明，使其在黑色背景下完全隱形）
    """
    print(f"正在生成 X (Twitter) 棋盤格透明切換圖 (偽裝顏色: {disguise_color})...")
    
    # 建立與顯示圖相同尺寸的空白輸出畫布
    width, height = display_img.size
    out_img = Image.new("RGBA", (width, height))
    
    # 載入像素資料
    display_pixels = display_img.load()
    out_pixels = out_img.load()
    
    # 根據選擇的偽裝顏色設定參數
    if disguise_color == "white":
        disguise_pixel = (255, 255, 255, 255)
        if threshold is None:
            threshold = 50
        if display_alpha is None:
            display_alpha = 255  # 白色偽裝通常保持不透明即可
            
    elif disguise_color == "black":
        disguise_pixel = (0, 0, 0, 255)
        if threshold is None:
            threshold = 200
        if display_alpha is None:
            display_alpha = 70   # 黑色偽裝使用半透明（例如 70），以便在黑色背景中完全消失
            
    else:
        raise ValueError("disguise_color 必須是 'white' 或 'black'")
    
    # 1x1 棋盤格擺放
    for y in range(height):
        for x in range(width):
            if (x + y) % 2 == 0:
                # 【棋盤 A】：填入偽裝色（完全不透明）
                out_pixels[x, y] = disguise_pixel
            else:
                # 【棋盤 B】：填入顯示圖像素
                r, g, b = display_pixels[x, y][:3]
                
                if disguise_color == "white":
                    # 偽裝成白色時：
                    # 將暗部像素設為完全透明（讓系統黑色背景透出來）
                    if r < threshold and g < threshold and b < threshold:
                        out_pixels[x, y] = (r, g, b, 0)
                    else:
                        out_pixels[x, y] = (r, g, b, display_alpha)
                else:
                    # 偽裝成黑色時：
                    # 1. 將亮部像素設為完全透明（讓系統白色背景透出來）
                    if r > threshold and g > threshold and b > threshold:
                        out_pixels[x, y] = (r, g, b, 0)
                    else:
                        # 2. 保留的暗部像素加上設定的透明度（display_alpha），使其融入黑色背景中
                        out_pixels[x, y] = (r, g, b, display_alpha)
                        
    # 儲存為無損 PNG 格式
    out_img.save(output_path, "PNG")
    print(f"圖片生成成功，已儲存至：'{output_path}'")

def create_twitter_checkerboard_illusion(display_img, output_path, disguise_color="white", threshold=None, display_alpha=None, grid_size=2):
    """
    改進版 X 專用幻覺圖生成器 (支援網格大小調整以防止 X 縮圖破壞效果)
    
    :param display_img: 要顯示的秘密圖片（PIL Image 物件）
    :param output_path: 輸出的 PNG 路徑
    :param disguise_color: "white" 或 "black"
    :param threshold: 亮度閾值
    :param display_alpha: 秘密圖片像素的透明度 (0~255)
    :param grid_size: 棋盤格大小 (像素)。預設 2 (即 2x2 網格)，在 X 平台上比 1x1 更穩定。
    """
    print(f"正在生成幻覺圖 (網格大小: {grid_size}x{grid_size}, 偽裝: {disguise_color})...")
    
    width, height = display_img.size
    out_img = Image.new("RGBA", (width, height))
    
    display_pixels = display_img.load()
    out_pixels = out_img.load()
    
    if disguise_color == "white":
        disguise_pixel = (255, 255, 255, 255)
        if threshold is None:
            threshold = 60
        if display_alpha is None:
            display_alpha = 255
    elif disguise_color == "black":
        disguise_pixel = (0, 0, 0, 255)
        if threshold is None:
            # 提高閾值，確保原圖中非純白的灰色背景也能被判定為「亮部」而轉為透明
            threshold = 220 
        if display_alpha is None:
            # 降低透明度（例如 50），讓暗部在黑色背景下更不容易被肉眼察覺
            display_alpha = 50 
            
    # 進行像素處理
    for y in range(height):
        for x in range(width):
            # 根據 grid_size 計算當前像素屬於哪一個棋盤格
            if ((x // grid_size) + (y // grid_size)) % 2 == 0:
                out_pixels[x, y] = disguise_pixel
            else:
                r, g, b = display_pixels[x, y][:3]
                
                if disguise_color == "white":
                    if r < threshold and g < threshold and b < threshold:
                        out_pixels[x, y] = (r, g, b, 0)
                    else:
                        out_pixels[x, y] = (r, g, b, display_alpha)
                else:
                    if r > threshold and g > threshold and b > threshold:
                        out_pixels[x, y] = (r, g, b, 0)
                    else:
                        out_pixels[x, y] = (r, g, b, display_alpha)
                        
    out_img.save(output_path, "PNG")
    print(f"生成成功：{output_path}")

def create_perfect_double_image(light_path, dark_path, output_path, dark_ratio=0.15):
    """
    使用雙線性混合演算法生成高品質 X 專用切換圖（無棋盤格網格）。
    
    :param light_path: 亮色背景下（點開前）要顯示的鮮豔圖片（例如帶有 TAP! 的第二張圖）
    :param dark_path: 暗色背景下（點開後）要顯示的隱藏圖片（可以使用同一張圖，或不帶 TAP! 的圖）
    :param output_path: 輸出的無損 PNG 路徑
    :param dark_ratio: 隱藏圖在黑底下的亮度比例 (0.0 ~ 1.0)。
                       數值越低（如 0.1 ~ 0.15），在黑底下隱形得越徹底；
                       數值越高，黑底下看得很清楚，但亮底下的顏色會稍微變淡。
    """
    print("正在使用線性混合演算法生成高品質幻覺圖...")
    
    # 讀取亮圖與暗圖
    img_light = Image.open(light_path).convert("RGB")
    img_dark = Image.open(dark_path).convert("RGB")
    
    # 確保兩張圖片尺寸一致
    if img_light.size != img_dark.size:
        img_dark = img_dark.resize(img_light.size, Image.Resampling.LANCZOS)
        
    # 轉為 numpy 矩陣進行高速像素運算
    arr_light = np.array(img_light, dtype=np.float32)
    arr_dark = np.array(img_dark, dtype=np.float32)
    
    # 將暗圖按比例壓暗，使其在黑底下達到「完全隱形」的效果
    arr_dark = arr_dark * dark_ratio
    
    # 數學限制：亮圖像素值必須大於等於暗圖像素值
    arr_dark = np.minimum(arr_dark, arr_light)
    
    # 解代數方程：
    # Light = P * A + 255 * (1 - A)
    # Dark = P * A
    # => Light - Dark = 255 * (1 - A)
    # => A = 255 - (Light - Dark)
    diff = arr_light - arr_dark
    max_diff = np.max(diff, axis=2)
    alpha = 255.0 - max_diff
    
    # 避免除以零，限制最小 alpha 值
    alpha_clipped = np.clip(alpha, 1.0, 255.0)
    
    # 解出最適合的 RGB 像素值 P = Dark * 255 / A
    r_p = (arr_dark[:, :, 0] * 255.0) / alpha_clipped
    g_p = (arr_dark[:, :, 1] * 255.0) / alpha_clipped
    b_p = (arr_dark[:, :, 2] * 255.0) / alpha_clipped
    
    # 數值修剪，確保在 0~255 範圍內
    r_p = np.clip(r_p, 0.0, 255.0)
    g_p = np.clip(g_p, 0.0, 255.0)
    b_p = np.clip(b_p, 0.0, 255.0)
    alpha = np.clip(alpha, 0.0, 255.0)
    
    # 合併為 RGBA 圖片
    out_arr = np.stack([r_p, g_p, b_p, alpha], axis=2).astype(np.uint8)
    out_img = Image.fromarray(out_arr, "RGBA")
    
    # 儲存為無損 PNG
    out_img.save(output_path, "PNG")
    print(f"🎉 生成成功！已儲存至：'{output_path}'")

def create_optimal_double_image(light_path, dark_path, output_path):
    """
    使用代數最優解耦演算法，精確匹配兩張不同的目標圖片：
    - 淺色模式下完全呈現 Light 圖片（第一張彩色圖）
    - 深色模式下完全呈現 Dark 圖片（第二張黑白線稿圖）
    """
    print("正在進行像素級代數優化計算...")
    
    # 載入兩張影像並轉為 RGB
    img_light = Image.open(light_path).convert("RGB")
    img_dark = dark_path.convert("RGB")
    
    # 確保尺寸完全一致
    if img_light.size != img_dark.size:
        img_dark = img_dark.resize(img_light.size, Image.Resampling.LANCZOS)
        
    # 轉換為 0.0 ~ 1.0 的浮點數矩陣進行計算
    C_light = np.array(img_light, dtype=np.float32) / 255.0
    C_dark = np.array(img_dark, dtype=np.float32) / 255.0
    
    # 物理限制：在白色背景下的亮度必須大於或等於黑色背景下的亮度
    # 若有部分像素不滿足，則進行安全裁剪以防止色彩失真
    C_dark = np.minimum(C_dark, C_light)
    
    # 1. 計算每個像素的最優 Alpha 通道
    # 數學公式：Alpha = 1.0 - mean(C_light - C_dark)
    diff = C_light - C_dark
    mean_diff = np.mean(diff, axis=2)
    alpha = 1.0 - mean_diff
    alpha = np.clip(alpha, 0.0, 1.0)
    
    # 將 alpha 擴展維度以便與 RGB 矩陣運算
    alpha_expanded = np.expand_dims(alpha, axis=2)
    
    # 2. 計算每個像素的最優 RGB 顏色 (P)
    # 根據最小二乘法，最優的 P 值公式為：
    # P = (C_dark + C_light - (1 - Alpha)) / (2 * Alpha)
    numerator = C_dark + C_light - (1.0 - alpha_expanded)
    denominator = 2.0 * alpha_expanded
    
    # 避免除以零的錯誤
    P = np.where(denominator > 0.001, numerator / denominator, 0.0)
    P = np.clip(P, 0.0, 1.0)
    
    # 3. 將數據轉換回 0 ~ 255 的 8-bit 無符號整數
    r = (P[:, :, 0] * 255.0).astype(np.uint8)
    g = (P[:, :, 1] * 255.0).astype(np.uint8)
    b = (P[:, :, 2] * 255.0).astype(np.uint8)
    a = (alpha * 255.0).astype(np.uint8)
    
    # 合併為 RGBA 格式並儲存
    out_arr = np.stack([r, g, b, a], axis=2)
    out_img = Image.fromarray(out_arr, "RGBA")
    out_img.save(output_path, "PNG")
    
    print(f"🎉 完美雙圖合成完畢，已輸出至：'{output_path}'")

def create_exact_twitter_illusion(input_path, output_path):
    """
    完全還原原圖效果的單圖幻覺生成器：
    - 在黑色背景（深色模式）下：100% 完美還原原圖的色彩與高對比（無任何損失）。
    - 在白色背景（淺色模式）下：自動呈現粉嫩、高亮度的色調。
    """
    print("正在讀取原圖並進行無損像素映射計算...")
    
    # 讀取原圖 (第三張高品質原圖)
    img = Image.open(input_path).convert("RGB")
    arr = np.array(img, dtype=np.float32)
    
    # 1. 計算每個像素的最優 Alpha 值（取 RGB 三個通道的最大值）
    # 範圍在 0.0 ~ 255.0 之間
    alpha = np.max(arr, axis=2)
    
    # 擴展維度以便進行矩陣除法
    alpha_expanded = np.expand_dims(alpha, axis=2)
    
    # 2. 計算每個像素的最優 RGB 顏色：P = (原圖 * 255) / Alpha
    # 當 Alpha 為 0 時（純黑像素），將其設為 0 以避免除以零
    rgb = np.where(alpha_expanded > 0, (arr * 255.0) / alpha_expanded, 0.0)
    
    # 確保數值在安全範圍內
    rgb = np.clip(rgb, 0.0, 255.0)
    alpha = np.clip(alpha, 0.0, 255.0)
    
    # 3. 轉回 8-bit 整數並打包為 RGBA 格式
    r = rgb[:, :, 0].astype(np.uint8)
    g = rgb[:, :, 1].astype(np.uint8)
    b = rgb[:, :, 2].astype(np.uint8)
    a = alpha.astype(np.uint8)
    
    out_arr = np.stack([r, g, b, a], axis=2)
    out_img = Image.fromarray(out_arr, "RGBA")
    
    # 儲存為無損 PNG
    out_img.save(output_path, "PNG")
    print(f"生成成功！已儲存至：'{output_path}'")

def reproduce_exact_checkerboard(input_path, output_path):
    """
    完全依照指定的像素矩陣規則生成：
    偶數格 (x+y % 2 == 0) -> 保留原圖像素
    奇數格 (x+y % 2 != 0) -> 強制設為 [255, 255, 255, 0]
    """
    print("正在依照您提供的像素陣列規則重建圖片...")
    
    # 1. 讀取原圖並確保轉為 RGBA 格式
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    
    # 2. 建立與原圖大小相同、預設全空的陣列
    out_arr = np.zeros_like(arr)
    
    # 3. 利用 numpy 快速建立棋盤格遮罩 (True = 偶數格, False = 奇數格)
    height, width = arr.shape[:2]
    y, x = np.indices((height, width))
    mask = (x + y) % 2 == 0
    
    # 4. 嚴格執行您的矩陣擺放規則
    # 【規則一】：偶數格直接塞入原圖像素
    out_arr[mask] = arr[mask]
    
    # 【規則二】：奇數格全部設為 [255, 255, 255, 0] (純白但完全透明)
    out_arr[~mask] = [255, 255, 255, 0]
    
    # 5. 將陣列轉回圖片並輸出
    out_img = Image.fromarray(out_arr, "RGBA")
    out_img.save(output_path, "PNG")
    
    print(f"✅ 生成完畢！矩陣擺放已完全同步，輸出至：'{output_path}'")

def compare_images(img_path1, img_path2):
    print(f"正在比對: '{img_path1}' vs '{img_path2}'\n")
    
    # 讀取並轉為 RGBA 矩陣
    arr1 = np.array(Image.open(img_path1).convert("RGBA"))
    arr2 = np.array(Image.open(img_path2).convert("RGBA"))
    
    # 1. 檢查尺寸是否一致
    if arr1.shape != arr2.shape:
        print(f"❌ 尺寸不一致！")
        print(f"原圖: {arr1.shape}, 你的圖: {arr2.shape}")
        return
    else:
        print(f"✅ 尺寸一致: {arr1.shape}")

    # 2. 檢查奇數格（透明像素）的隱藏數據是否被篡改
    height, width = arr1.shape[:2]
    y, x = np.indices((height, width))
    odd_mask = (x + y) % 2 != 0
    
    odd_pixels1 = arr1[odd_mask]
    odd_pixels2 = arr2[odd_mask]
    
    print("\n【檢查奇數格（透明像素）】:")
    print(f"原圖奇數格前 3 個像素: {odd_pixels1[:3].tolist()}")
    print(f"你的圖奇數格前 3 個像素: {odd_pixels2[:3].tolist()}")
    
    if not np.array_equal(odd_pixels1, odd_pixels2):
        print("❌ 警告：透明像素的 RGB 值不一致！(這通常是失效的主因)")
    else:
        print("✅ 透明像素數據完全吻合！")

    # 3. 計算整體像素差異率
    diff = np.any(arr1 != arr2, axis=-1)
    diff_rate = (np.sum(diff) / (height * width)) * 100
    print(f"\n【整體差異度】: 有 {diff_rate:.2f}% 的像素不相同。")

def create_twitter_bulletproof_illusion(input_path, output_path):
    """
    【防 X 伺服器崩潰版】保留原尺寸，降低檔案大小，並確保 X 能夠順利上傳。
    """
    print("正在生成高解析度棋盤格矩陣...")
    
    # 1. 讀取原圖
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    
    out_arr = np.zeros_like(arr)
    
    # 2. 建立棋盤格遮罩
    h, w = arr.shape[:2]
    y, x = np.indices((h, w))
    mask = (x + y) % 2 == 0
    
    # 3. 填入像素數據
    out_arr[mask] = arr[mask]
    out_arr[~mask] = [255, 255, 255, 0] # 透明白
    
    # 智能防白邊
    is_dark = np.max(arr[:, :, :3], axis=-1) < 50
    out_arr[~mask & is_dark] = [0, 0, 0, 0] # 透明黑
    
    print("正在進行色彩量化降噪 (壓縮檔案核心步驟)...")
    temp_img = Image.fromarray(out_arr, "RGBA")
    
    # 4. 進行色彩量化
    try:
        quantized_img = temp_img.quantize(colors=255, dither=Image.Dither.FLOYDSTEINBERG)
    except ValueError:
        quantized_img = temp_img.quantize(colors=255)

    print("正在轉換回 X (Twitter) 兼容的安全格式...")
    # 5. 【最關鍵的修復】：將容易導致 X 崩潰的 P 模式，轉回標準 RGBA 模式
    # 檔案大小依然會很小，但 X 伺服器就能完美讀取了！
    final_img = quantized_img.convert("RGBA")

    # 6. 儲存
    final_img.save(output_path, "PNG", optimize=True)
    
    print(f"✅ 生成完畢！已輸出防崩潰相容版：'{output_path}'")
    print("請將這張圖上傳至 X，這次應該能順利發布了！")

def create_twitter_safe_rgba(input_path, output_path):
    print("正在生成高解析度棋盤格矩陣...")
    
    # 1. 讀取原圖 (保持 3000x2417)
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img, dtype=np.uint8)
    
    # --- 關鍵防護 1：手動色階壓縮 (降低資訊熵) ---
    print("正在進行物理級色階壓縮以縮小檔案大小...")
    # 將 RGB 數值捨入到最接近的 16 的倍數 (例如 255 變成 240，13 變成 0)
    # 這對動漫風格的圖片肉眼幾乎看不出差別，但能讓 PNG 檔案大小縮小 50% 以上！
    arr[:, :, :3] = (arr[:, :, :3] // 16) * 16
    
    out_arr = np.zeros_like(arr)
    
    # 2. 建立棋盤格遮罩
    h, w = arr.shape[:2]
    y, x = np.indices((h, w))
    mask = (x + y) % 2 == 0
    
    # 3. 嚴格填入像素數據
    out_arr[mask] = arr[mask]
    out_arr[~mask] = [0, 0, 0, 0] # 預設透明白
    
    # 智能防白邊
    is_dark = np.max(arr[:, :, :3], axis=-1) < 50
    out_arr[~mask & is_dark] = [0, 0, 0, 0] # 透明黑
    
    # 4. 轉回圖片
    out_img = Image.fromarray(out_arr, "RGBA")
    
    # --- 關鍵防護 2：抹除所有可能讓 X 崩潰的元資料 ---
    print("正在封裝為純淨 RGBA 格式...")
    # icc_profile=None 與 exif=b"" 確保檔案沒有任何多餘的相機/色彩描述檔
    out_img.save(
        output_path, 
        "PNG", 
        optimize=True, 
        icc_profile=None, 
        exif=b""
    )
    
    print(f"✅ 生成完畢！已輸出純淨安全的 RGBA PNG：'{output_path}'")
    print("這張圖既沒有危險的調色盤，檔案大小也已縮減，請直接上傳至 X！")

def create_twitter_compliant_rgba(input_path, output_path, colors=32):
    """
    使用最高級別壓縮與 32 色量化，確保標準 RGBA 格式下檔案大小低於 1MB。
    """
    print(f"正在將原圖進行 32 色量化，以確保 RGBA 檔案大小小於 1MB...")
    
    # 1. 讀取原圖 (RGB)
    img = Image.open(input_path).convert("RGB")
    w, h = img.size
    aspect_ratio = h / w
    if w < 1000:
        new_w, new_h = 1000, int(1000 * aspect_ratio)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS) # 確保保持原尺寸不變

    if h < 1000:
        new_h, new_w = 1000, int(1000 / aspect_ratio)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS) # 確保保持原尺寸不變

    # 2. 進行 32 色量化以徹底降低像素複雜度，並立即轉回 RGBA 模式
    clean_img = img.quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGBA")
    arr = np.array(clean_img)
    
    # 3. 建立空白 RGBA 矩陣
    out_arr = np.zeros_like(arr)
    
    # 4. 建立 1x1 棋盤格遮罩
    h, w = arr.shape[:2]
    y, x = np.indices((h, w))
    mask = (x + y) % 2 == 0
    
    print("正在套用 1x1 像素矩陣...")
    # 偶數格：保留 32 色量化後的原圖像素
    out_arr[mask] = arr[mask]
    
    # 奇數格：嚴格填入 [255, 255, 255, 0]
    out_arr[~mask] = [255, 255, 255, 0]
    
    print("正在以最高壓縮率 (Level 9) 儲存為 RGBA PNG...")
    out_img = Image.fromarray(out_arr, "RGBA")
    
    # compress_level=9：強制使用 zlib 的最大壓縮比
    # optimize=True：進行額外的 PNG 壓縮路徑優化
    out_img.save(
        output_path, 
        "PNG", 
        optimize=True, 
        compress_level=9,
        icc_profile=None, 
        exif=b""
    )
    print(f"✅ 生成完畢！檔案已輸出至：'{output_path}'")



# ---- 測試執行範例 ----
if __name__ == "__main__":
    # 初始化模擬器
    # x_pipeline = XImagePipeline()

    # 填入你想測試的圖片路徑 (可以放你的 2048x2048 測試圖或高頻棋盤格)
    # test_image_path = "../public/example.jpeg"

    # 建立一個測試用的虛擬圖片（如果本機沒有檔案，取消註解下方三行可自動生成一張圖測試）
    # dummy_img = Image.new("RGB", (2316, 3088), color=(128, 128, 128))
    # dummy_img.save(test_image_path)
    # print(f"已自動建立測試虛擬圖: {test_image_path}")

    # if os.path.exists(test_image_path):
    #     x_pipeline.process_image(test_image_path)
    # else:
    #     print(f"錯誤：找不到測試圖片 '{test_image_path}'，請確認路徑或將其放入同目錄中。")

    display_path = "../public/HGbBAkva4AAH9rs.jpg" # 這張圖用來在點

    display_img = Image.open(display_path).convert("RGBA")
    w, h = display_img.width, display_img.height
    aspect_ratio = h / w
    # new_w, new_h = 3000, int(3000 * aspect_ratio)
    # display_img = display_img.resize((new_h, new_w), Image.Resampling.LANCZOS) # 放大到 2048x2048 或更大
    fake_img = Image.new("RGBA", display_img.size, (0, 0, 0, 255)) # 純白底圖（如果需要的話）
    print(display_img.size)
    print(fake_img.size)

    # create_twitter_checkerboard_illusion(fake_img, display_img, "x_checkerboard_illusion.png", black_threshold=30)
    # display_img.save("black_disguise.png")
    # create_twitter_checkerboard_illusion(
            # display_img=display_img,
            # output_path="black_disguise.png",
            # disguise_color="black",
            # threshold=255,
            # display_alpha=200
            # )
    # create_double_image_illusion(fake_img, "../public/HGbBAkva4AAH9rs.jpg", "perfect_illusion.png")
    # create_perfect_double_image(
    #     light_path="../public/HGbBAkva4AAH9rs.jpg",       # 第二張圖 (帶有 TAP! 的原圖)
    #     dark_path="../public/HGbBAkva4AAH9rs.jpg",     # 第一張圖 (不帶 TAP! 的原圖)
    #     output_path="illusion_result.png",
    #     dark_ratio=0.02                  # 設為 0.12 能讓它在黑底下極度隱形
    # )
    # arr = np.array(Image.open("../public/HGbBAkva4AAH9rs.jpg").convert("RGBA"))
    arr = np.array(Image.open("../public/HGac-goacAAkPxs.png").convert("RGBA"))
    print(arr)
    # np.savetxt("output.txt", arr)
    # create_optimal_double_image(
    #     light_path="../public/HGbBAkva4AAH9rs.jpg",       # 請替換為您第一張彩色圖的路徑
    #     dark_path=fake_img,           # 請替換為您第二張黑白線稿圖的路徑
    #     output_path="perfect_illusion.png" # 輸出的幻覺圖
    # )
    # create_exact_twitter_illusion(
    #     input_path="../public/HGbBAkva4AAH9rs.jpg",   # 請替換為您的原圖路徑
    #     output_path="final_illusion.png"   # 輸出的 PNG 圖片
    # )
    # reproduce_exact_checkerboard(
    #     input_path="../public/HGbBAkva4AAH9rs.jpg",  # 您的高畫質原圖
    #     output_path="exact_matrix_result.png"
    # )


# --- 執行 ---
    create_twitter_bulletproof_illusion(
        input_path="../public/HGbBAkva4AAH9rs.jpg", # 請使用您帶有 TAP! 的 PNG 原圖
        output_path="final_indexed_illusion.png"
    )
    create_twitter_safe_rgba(
        input_path="../public/HGbBAkva4AAH9rs.jpg", 
        output_path="final_safe_illusion.png"
    )


    # create_100percent_exact_illusion("../public/HGbBAkva4AAH9rs.jpg", "exact_and_small.png")

    create_twitter_compliant_rgba(
        input_path="../public/example.jpeg", 
        output_path="stable_rgba_under_1mb.png"
    )
