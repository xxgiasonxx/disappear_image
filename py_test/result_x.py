def create_twitter_compliant_rgba(input_path, output_path, colors=32):
    """
    使用最高級別壓縮與 32 色量化，確保標準 RGBA 格式下檔案大小低於 1MB。
    """
    print(f"正在將原圖進行 32 色量化，以確保 RGBA 檔案大小小於 1MB...")
    
    # 1. 讀取原圖 (RGB)
    img = Image.open(input_path).convert("RGB")
    
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

if __name__ == "__main__":
    create_twitter_compliant_rgba(
        input_path="../public/HGbBAkva4AAH9rs.jpg", 
        output_path="stable_rgba_under_1mb.png"
    )
