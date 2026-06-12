import os
from PIL import Image

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
                out_pixels[x, y] = (r, g, b, 255)
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

    display_path = "../public/example.jpeg" # 這張圖用來在點

    display_img = Image.open(display_path).convert("RGBA")
    display_img = display_img.resize((display_img.width * 2, display_img.height * 2), Image.Resampling.LANCZOS) # 放大到 2048x2048 或更大
    fake_img = Image.new("RGBA", display_img.size, (255, 255, 255, 255)) # 純白底圖（如果需要的話）
    print(display_img.size)
    print(fake_img.size)

    create_twitter_checkerboard_illusion(fake_img, display_img, "x_checkerboard_illusion.png", black_threshold=30)

