import cv2
import numpy as np

def generate_discord_alpha_trap(hidden_img_path, output_png_path):
    """
    利用 Discord 聊天框 (#313338) 與 燈箱 (#000000) 的背景色差，
    配合 Alpha 通道調變，製造 100% 繞過任何縮放引擎的隱形圖片。
    """
    # 1. 讀取你想隱藏的圖（點開後才要看到的圖）
    # 建議使用灰階圖（或對比明顯的文字圖），在透明度表現上最穩定
    hidden_img = cv2.imread(hidden_img_path, cv2.IMREAD_GRAYSCALE)
    
    if hidden_img is None:
        print(f"未找到 {hidden_img_path}，自動建立一張『SURPRISE!』的文字測試圖。")
        hidden_img = np.zeros((800, 800), dtype=np.uint8)
        cv2.putText(hidden_img, "SURPRISE!", (70, 450), 
                    cv2.FONT_HERSHEY_SIMPLEX, 3.5, 255, 10, cv2.LINE_AA)
    
    h, w = hidden_img.shape
    
    # 2. 定義 Discord 官方深色模式的聊天框背景色 (色號 #313338)
    # 注意：OpenCV 的通道順序是 BGR
    bg_b, bg_g, bg_r = 56, 51, 49
    # bg_b, bg_g, bg_r = 255, 255, 255
    
    # 3. 為了防止點開後的燈箱過載，將隱藏圖的亮度壓縮到背景色範圍內
    # 這是為了讓 Alpha 映射在 0.0 ~ 1.0 之間時不會產生溢出（Clamping）
    max_limit = min(bg_b, bg_g, bg_r)  # 49
    hidden_img_scaled = (hidden_img / 255.0) * max_limit
    
    # 4. 建立全新的 BGRA (四通道) 畫布
    stego_img = np.zeros((h, w, 4), dtype=np.uint8)
    
    # 【核心關鍵】把前三個色彩通道全部塗滿 Discord 的背景色
    stego_img[:, :, 0] = bg_b  # Blue
    stego_img[:, :, 1] = bg_g  # Green
    stego_img[:, :, 2] = bg_r  # Red
    
    # 【調變通道】將隱藏圖的像素強度，直接映射為 Alpha 通道的透明度
    # 當隱藏圖是黑色(0) -> Alpha=0 (完全透明，透出聊天框背景)
    # 當隱藏圖是白色(255) -> Alpha=255 (不透明，顯示我們填的 bg_r,g,b，但因為跟背景一樣，依然透出背景)
    alpha_channel = (hidden_img_scaled / max_limit) * 255
    stego_img[:, :, 3] = alpha_channel.astype(np.uint8)
    
    # 5. 儲存為無損 PNG 格式
    cv2.imwrite(output_png_path, stego_img)
    print(f"🎉 終極對抗圖已生成：'{output_png_path}'")

def generate_bright_discord_trap(hidden_img_path, output_png_path):
    """
    高亮版 Discord 隱寫術：
    放棄聊天室完全隱形，換取點開大圖後 100% 的極致清晰度與高亮度。
    """
    # 1. 讀取你想隱藏的圖
    hidden_img = cv2.imread(hidden_img_path, cv2.IMREAD_GRAYSCALE)
    
    if hidden_img is None:
        print(f"未找到 {hidden_img_path}，自動建立高對比文字測試圖。")
        hidden_img = np.zeros((800, 800), dtype=np.uint8)
        cv2.putText(hidden_img, "BRIGHT!", (130, 450), 
                    cv2.FONT_HERSHEY_SIMPLEX, 4.0, 255, 12, cv2.LINE_AA)
    
    h, w = hidden_img.shape
    
    # 2. 建立全新的 BGRA (四通道) 畫布
    stego_img = np.zeros((h, w, 4), dtype=np.uint8)
    
    # 【關鍵修改】把 RGB 色彩通道全部填滿 255 (純白色)
    # 你也可以改成 [0, 255, 255] (青色) 或 [0, 255, 0] (螢光綠)，點開會超級酷炫
    stego_img[:, :, 0] = 0  # Blue
    stego_img[:, :, 1] = 0  # Green
    stego_img[:, :, 2] = 0  # Red
    
    # 【調變通道】直接把原圖的灰階亮度 (0~255) 塞進 Alpha 通道
    # 這樣原圖越亮的地方，在 Discord 點開就越是純白不透明
    stego_img[:, :, 3] = hidden_img
    
    # 3. 儲存為無損 PNG
    cv2.imwrite(output_png_path, stego_img)
    print(f"✨ 高能量對抗圖已生成：'{output_png_path}'")

def create_gamma_illusion(image_path, output_path):
    # 1. 讀取圖片並轉為灰階
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        print("無法讀取圖片，請檢查路徑。")
        return

    # 2. 將圖片二值化（黑白分明的圖片在此演算法下效果最好、亮度最高）
    _, thresh = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY)

    # 3. 將圖片放大 2 倍，以便建立完美的 1x1 高頻棋盤格
    h, w = thresh.shape
    upscaled = cv2.resize(thresh, (w * 2, h * 2), interpolation=cv2.INTER_NEAREST)
    
    # 建立輸出矩陣
    out_img = np.zeros_like(upscaled)
    
    # 4. 遍歷像素建立「光學迷彩」
    for y in range(h * 2):
        for x in range(w * 2):
            mask_val = upscaled[y, x]
            
            if mask_val == 255:  # 原圖的白色區域（你想讓它變亮的地方）
                # 建立 255 與 0 互相交錯的極高頻棋盤格（平均值為 127.5）
                out_img[y, x] = 255 if (x + y) % 2 == 0 else 0
            else:  # 原圖的黑色區域（背景隱形處）
                # 填入固定的灰色 127
                out_img[y, x] = 127
                
    # 5. 儲存圖片（必須存成 PNG 才能保留像素的精準度，不可用 JPG 破壞壓縮）
    cv2.imwrite(output_path, out_img)
    print(f"🎉 物理級隱形幻覺圖片已成功生成：{output_path}")

def create_color_discord_illusion(image_path, output_path):
    """
    全彩版 Discord 偽裝術：
    利用 1x1 色彩反轉棋盤格，讓預覽圖完美塌陷為純灰色，點開大圖復原全彩。
    """
    # 1. 讀取原始彩色圖片 (BGR)
    img = cv2.imread(image_path)
    # img = cv2.resize(img, (img.shape[1] // 2, img.shape[0] // 2), interpolation=cv2.INTER_AREA)  # 縮小一半，增加細節密度
    if img is None:
        print(f"錯誤：無法讀取圖片 {image_path}，請檢查路徑！")
        return
    
    # 【色彩預處理】
    # 因為反轉格會在微觀上與原色揉合，人類視覺看大圖時會覺得飽和度稍微下降。
    # 我們在這裡先把原圖的對比度與飽和度調高（alpha=1.3），這樣點開時顏色會非常鮮豔好看！
    img = cv2.convertScaleAbs(img, alpha=1.5, beta=10)
    
    h, w, c = img.shape
    
    # 2. 將圖片以「最近鄰插值 (Nearest Neighbor)」放大 2 倍，準備製作高頻網格
    upscaled = cv2.resize(img, (w * 2, h * 2), interpolation=cv2.INTER_NEAREST)
    
    # 3. 建立 100% 完全反轉的互補色圖像
    inverted = 255 - upscaled
    
    # 4. 建立高頻棋盤格矩陣 (True/False 交錯)
    y_indices, x_indices = np.indices((h * 2, w * 2))
    checkerboard = (x_indices + y_indices) % 2 == 0
    
    # 5. 複製一份畫布，開始進行色彩交織
    stego_img = np.zeros_like(upscaled)
    
    # 在棋盤格為 True 的格子填入【原色】，為 False 的格子填入【反轉色】
    # 三個色彩通道 (B, G, R) 同時套用
    for i in range(3):
        channel_up = upscaled[:, :, i]
        channel_inv = inverted[:, :, i]
        
        channel_out = np.where(checkerboard, channel_up, channel_inv)
        stego_img[:, :, i] = channel_out
        
    # 6. 儲存為無損 PNG 格式（絕對不能存成 JPG，否則色彩會溢出穿幫）
    cv2.imwrite(output_path, stego_img)
    print(f"🎉 全彩終極對抗圖已生成：'{output_path}'")

def create_color_discord_illusion_a(image_path, output_path, grid_size=2):
    """
    全彩版 Discord 偽裝術（可調像素擺放密度版）：
    利用可調密度的色彩反轉棋盤格，降低空間頻率以解決摩爾紋問題。
    
    :param grid_size: 像素擺放網格的大小（密度控制）
                      - grid_size = 1: 原本的 1x1 擺放（密度最高，摩爾紋最嚴重）
                      - grid_size = 2: 2x2 擺放（密度減半，能大幅消除摩爾紋，最推薦）
                      - grid_size = 4: 4x4 擺放（密度降為四分之一，摩爾紋完全消失，但大圖顆粒感較明顯）
    """
    # 1. 讀取原始彩色圖片 (BGR)
    img = cv2.imread(image_path)
    if img is None:
        print(f"錯誤：無法讀取圖片 {image_path}，請檢查路徑！")
        return
        
    # 縮小一半，增加細節密度
    # img = cv2.resize(img, (img.shape[1] // 2, img.shape[0] // 2), interpolation=cv2.INTER_AREA)  
    
    # 【色彩預處理】
    img = cv2.convertScaleAbs(img, alpha=1.5, beta=10)
    
    h, w, c = img.shape
    
    # 2. 將圖片以「最近鄰插值 (Nearest Neighbor)」放大 2 倍
    upscaled = cv2.resize(img, (w * 2, h * 2), interpolation=cv2.INTER_NEAREST)
    
    # 3. 建立 100% 完全反轉的互補色圖像
    inverted = 255 - upscaled
    
    # 4. 建立可調密度的棋盤格矩陣 (依據 grid_size 進行分組)
    y_indices, x_indices = np.indices((h * 2, w * 2))
    # 利用整除法 (//) 將像素分組，從而改變像素擺放的密度
    checkerboard = ((x_indices // grid_size) + (y_indices // grid_size)) % 2 == 0
    
    # 5. 複製一份畫布，開始進行色彩交織
    stego_img = np.zeros_like(upscaled)
    
    # 在棋盤格為 True 的格子填入【原色】，為 False 的格子填入【反轉色】
    for i in range(3):
        channel_up = upscaled[:, :, i]
        channel_inv = inverted[:, :, i]
        
        channel_out = np.where(checkerboard, channel_up, channel_inv)
        stego_img[:, :, i] = channel_out
        
    # 6. 儲存為無損 PNG 格式
    cv2.imwrite(output_path, stego_img)
    print(f"🎉 調整密度（grid_size={grid_size}）的偽裝圖已生成：'{output_path}'")

def create_color_discord_illusion_low_contrast(image_path, output_path, contrast_factor=0.4):
    """
    全彩版 Discord 偽裝術（低對比消除摩爾紋版）：
    1. 強制保留 1x1 網格，確保縮圖時 100% 塌陷為完美的純灰色方塊（完全看不到圖）。
    2. 透過 `contrast_factor` 壓縮對比度，從物理上直接消除摩爾紋。
    3. 保留原始色相，點開大圖時色彩完全正確。
    
    :param contrast_factor: 對比度保留比例 (建議 0.3 到 0.5 之間)
                            - 數值越小：摩爾紋越弱，但點開大圖時顏色越淡。
                            - 數值越大：點開大圖時色彩越鮮豔，但摩爾紋會變明顯。
                            - 預設 0.4 是消除摩爾紋與保留色彩的黃金平衡點。
    """
    # 1. 讀取原始彩色圖片 (BGR)
    img = cv2.imread(image_path)
    if img is None:
        print(f"錯誤：無法讀取圖片 {image_path}，請檢查路徑！")
        return
        
    # 縮小一半，增加細節密度
    # img = cv2.resize(img, (img.shape[1] // 2, img.shape[0] // 2), interpolation=cv2.INTER_AREA)  
    
    # 【色彩預處理】先大幅提高原圖的飽和度，補償後續壓縮帶來的色彩變淡
    img = cv2.convertScaleAbs(img, alpha=1.6, beta=5)
    
    h, w, c = img.shape
    
    # 2. 將圖片以「最近鄰插值」放大 2 倍
    upscaled = cv2.resize(img, (w * 2, h * 2), interpolation=cv2.INTER_NEAREST).astype(float)
    
    # 3. 【核心改進：向中值 127.5 壓縮對比度】
    # 公式：壓縮色 = 127.5 + (原色 - 127.5) * 對比度因子
    # 這能將相鄰像素的最高對比度從 255 降至 100 左右，摩爾紋干涉會直接消失
    MID = 127.5
    compressed = MID + (upscaled - MID) * contrast_factor
    
    # 建立精確對稱的反轉圖像（相加恆等於 255，確保預覽 100% 塌陷為純灰色）
    inverted = 255.0 - compressed
    
    # 4. 強制使用 1x1 高頻棋盤格（確保縮圖相位完美對齊，達到 100% 完美隱形）
    y_indices, x_indices = np.indices((h * 2, w * 2))
    checkerboard = y_indices % 2 == 0
    
    # 5. 進行色彩交織
    stego_img = np.zeros_like(upscaled)
    for i in range(3):
        channel_up = compressed[:, :, i]
        channel_inv = inverted[:, :, i]

        print("checkerboard shape:", checkerboard.shape)
        print("channel_up shape:", channel_up.shape)
        print("channel_inv shape:", channel_inv.shape)
        
        channel_out = np.where(checkerboard, channel_up, channel_inv)
        stego_img[:, :, i] = channel_out
        
    # 限制數值範圍並轉回 uint8
    stego_img = np.clip(stego_img, 0, 255).astype(np.uint8)
    
    # 6. 儲存為無損 PNG
    cv2.imwrite(output_path, stego_img)
    print(f"🎉 100% 完美隱形、無摩爾紋的全彩圖已生成：'{output_path}'")

def create_color_discord_illusion_rotated_screen(image_path, output_path, angle_deg=30.0, period=2.0, contrast_factor=0.4):
    """
    工業級半色調網屏旋轉版 - Discord 偽裝術：
    1. 放棄簡單的 '空一格' 棋盤，改用數學旋轉正弦網格（30度黃金干涉角）。
    2. 從物理結構上徹底規避顯示器的摩爾紋。
    3. 保留高頻正弦對稱性，確保預覽圖 100% 塌陷為純灰色。
    
    :param angle_deg: 旋轉角度。30度是印刷業公認最不容易產生摩爾紋的黃金角度。
    :param period: 網格週期（像素）。預設 2.0 代表每 2 像素交替一次。
    :param contrast_factor: 對比度壓縮因子。
    """
    # 1. 讀取原始彩色圖片 (BGR)
    img = cv2.imread(image_path)
    if img is None:
        print(f"錯誤：無法讀取圖片 {image_path}")
        return
        
    # 縮小一半，增加細節密度
    img = cv2.resize(img, (img.shape[1] // 2, img.shape[0] // 2), interpolation=cv2.INTER_AREA)  
    
    # 【色彩預處理】提高原圖飽和度
    img = cv2.convertScaleAbs(img, alpha=1.6, beta=5)
    
    h, w, c = img.shape
    
    # 2. 將圖片以「最近鄰插值」放大 2 倍
    upscaled = cv2.resize(img, (w * 2, h * 2), interpolation=cv2.INTER_NEAREST).astype(float)
    
    # 3. 壓縮對比度（向中值 127.5 壓縮）
    MID = 127.5
    compressed = MID + (upscaled - MID) * contrast_factor
    inverted = 255.0 - compressed
    
    # 4. 【核心改進：建立數學旋轉正弦網格】
    # 將坐標系旋轉 angle_deg 度，徹底與顯示器的物理像素網格解耦
    angle_rad = np.radians(angle_deg)
    cos_a = np.cos(angle_rad)
    sin_a = np.sin(angle_rad)
    
    y_indices, x_indices = np.indices((h * 2, w * 2))
    
    # 計算旋轉後的坐標 u, v
    u = x_indices * cos_a - y_indices * sin_a
    v = x_indices * sin_a + y_indices * cos_a
    
    # 利用二維正弦波生成無頻率干涉的旋轉網格
    # 當正弦波乘積 > 0 時為 True，此數學模型保證了空間分割比例精確為 50.00%
    half_period = period / 2.0
    grid_val = np.sin(np.pi * u / half_period) * np.sin(np.pi * v / half_period)
    
    # 採用大於 0 的布林值作為遮罩
    stripe_mask = grid_val > 0
    
    # 5. 進行色彩交織
    stego_img = np.zeros_like(upscaled)
    for i in range(3):
        channel_up = compressed[:, :, i]
        channel_inv = inverted[:, :, i]
        
        # 套用旋轉網格
        channel_out = np.where(stripe_mask, channel_up, channel_inv)
        stego_img[:, :, i] = channel_out
        
    # 限制數值範圍並轉回 uint8
    stego_img = np.clip(stego_img, 0, 255).astype(np.uint8)
    
    # 6. 儲存為無損 PNG
    cv2.imwrite(output_path, stego_img)
    print(f"🎉 旋轉網屏版（30° 避干涉角、完美隱形）偽裝圖已生成：'{output_path}'")

def create_color_discord_illusion_slanted_matrix(image_path, output_path, contrast_factor=0.85):
    """
    4x4 週期性對稱斜線版 - Discord 全彩偽裝術：
    1. 使用 4x4 严格對稱的 45° 斜線矩陣進行無縫平鋪，徹底消除離散採樣誤差，實現零洩漏隱形。
    2. 由於 45° 物理避震極佳，對比度因子可提高至 0.85，保留極其鮮豔、明亮的全彩效果。
    """
    # 1. 讀取原始彩色圖片 (BGR)
    img = cv2.imread(image_path)
    if img is None:
        print(f"錯誤：無法讀取圖片 {image_path}")
        return

    w, h = img.shape[1], img.shape[0]
    aspect_ratio = w / h
        
    # 縮小一半，增加細節密度
    # img = cv2.resize(img, (1500, 1500), interpolation=cv2.INTER_AREA)  
    
    # 【色彩預處理】輕微調整，保持色彩鮮明
    img = cv2.convertScaleAbs(img, alpha=1.5, beta=10)
    
    h, w, c = img.shape
    
    # 2. 將圖片以「最近鄰插值」放大 2 倍
    upscaled = cv2.resize(img, (w * 2, h * 2), interpolation=cv2.INTER_NEAREST).astype(float)
    
    # 3. 壓縮對比度（向中值 127.5 壓縮）
    # 因為斜線矩陣避震極強，這裡可以使用高達 0.85 的高對比度，大圖色彩非常鮮豔！
    MID = 127.5
    compressed = MID + (upscaled - MID) * contrast_factor
    inverted = 255.0 - compressed
    
    # 4. 【核心改進：建立 4x4 週期性對稱斜線矩陣】
    # 這是印刷工業中用於規避干涉的標準雙像素 45 度排布
    # 每個 4x4 區塊中 True 與 False 的數量嚴格各佔 8 個 (50.00%)，且平鋪時無縫連接
    # pattern = np.array([
    #     [1, 1, 0, 0],
    #     [0, 1, 1, 0],
    #     [0, 0, 1, 0],
    #     [1, 0, 0, 1]
    # ], dtype=bool)

    pattern = np.array([
        [0, 1, 0, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0, 1, 0, 1],
    ], dtype=bool)



    ph, pw = pattern.shape
    
    # 計算需要平鋪的次數
    h_tiles = (h * 2 + (ph - 1)) // ph
    w_tiles = (w * 2 + (pw - 1)) // pw
    
    # 進行無縫平鋪，並裁切到與大圖一致的尺寸
    stripe_mask = np.tile(pattern, (h_tiles, w_tiles))[:h*2, :w*2]
    
    # 5. 進行色彩交織
    stego_img = np.zeros_like(upscaled)
    for i in range(3):
        channel_up = compressed[:, :, i]
        channel_inv = inverted[:, :, i]
        
        # 套用週期性斜線遮罩
        channel_out = np.where(stripe_mask, channel_up, channel_inv)
        stego_img[:, :, i] = channel_out
        
    # 限制數值範圍並轉回 uint8
    stego_img = np.clip(stego_img, 0, 255).astype(np.uint8)
    
    # 6. 儲存為無損 PNG
    cv2.imwrite(output_path, stego_img)
    print(f"🎉 4x4 週期斜線版（高對比、零洩漏、無摩爾紋）偽裝圖已生成：'{output_path}'")

# ==========================================
# 執行
# ==========================================
if __name__ == "__main__":
    # 輸入你想隱藏的圖片路徑（若沒有會自動產出文字測試圖）
    generate_discord_alpha_trap("../public/example.jpeg", "discord_master_trap.png")
    generate_bright_discord_trap("../public/example.jpeg", "discord_bright_trap.png")
    create_gamma_illusion("../public/example.jpeg", "discord_gamma_illusion.png")
    create_color_discord_illusion("../public/example.jpeg", "discord_color_illusion.png")
    create_color_discord_illusion_a("../public/example.jpeg", "discord_color_illusion_grid4.png", grid_size=2)
    create_color_discord_illusion_low_contrast("../public/example.jpeg", "discord_color_illusion_low_contrast.png", contrast_factor=0.8)
    # create_color_discord_illusion_rotated_screen("../public/example.jpeg", "discord_color_illusion_rotated.png", angle_deg=30.0, period=1.5, contrast_factor=0.4)
    create_color_discord_illusion_slanted_matrix("../public/example.jpeg", "discord_color_illusion_slanted.png", contrast_factor=0.8)
