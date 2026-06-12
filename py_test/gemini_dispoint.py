import numpy as np
import cv2

def calculate_env_target_size(w_orig, h_orig):
    max_w = 1100
    max_h = 700
    scale = min(max_w / w_orig, max_h / h_orig)
    w_target = round(w_orig * scale)
    h_target = round(h_orig * scale)
    return w_target, h_target


def generate_bilinear_checkerboard(img_orig, dst_w, dst_h):
    """
    【修正版】直接接收最終縮圖的目標寬高 (dst_w, dst_h)
    確保 2048 大圖上的黑點棋盤，能精準卡死最後 Bilinear 的採樣相位。
    """
    src_h, src_w, channels = img_orig.shape
    
    # 核心修正：使用最終縮圖的尺寸來計算精確步長 (Stride)
    stride_x = src_w / dst_w
    stride_y = src_h / dst_h
    
    # 1. 根據縮圖的整數座標，直接用矩陣生成對應的原圖核心取樣點
    dx = np.arange(dst_w)
    dy = np.arange(dst_h)
    
    # 2. 運用映射公式：sx = (dx + 0.5) * stride - 0.5
    sx = (dx + 0.5) * stride_x - 0.5
    sy = (dy + 0.5) * stride_y - 0.5
    # 3. 取整數（Bilinear 的基準左上角格子）
    fx = np.floor(sx).astype(np.int32)
    fy = np.floor(sy).astype(np.int32)
    
    # 4. 建立 2x2 核心網格的偏移量
    offsets = [(0, 0), (0, 1), (1, 0), (1, 1)]
    
    stego_img = img_orig.copy()
    
    # 5. 使用 Meshgrid 瞬間鎖定全圖規律座標
    mesh_x, mesh_y = np.meshgrid(fx, fy)
    
    for ox, oy in offsets:
        target_x = np.clip(mesh_x + ox, 0, src_w - 1)
        target_y = np.clip(mesh_y + oy, 0, src_h - 1)
        
        # 規律格殺：直接將這些符合數學規律的坐標點強行染黑
        stego_img[target_y, target_x] = [0, 0, 0]
        
    return stego_img

def generate_bicubic_checkerboard(img_orig, dst_w, dst_h):
    """
    不使用迴圈，純靠數學公式（規律週期）
    直接計算出與縮放演算法相位 100% 對齊的黑點棋盤網格。
    
    註：此 2x2 核心填黑策略對於 Bilinear、Bicubic、Lanczos 均有效，
    因為它消除了卷積核的正權重核心，並利用高階算法的負權重側葉製造 Clip 歸零。
    """
    src_h, src_w, channels = img_orig.shape
    
    # 規律的核心：計算精確的分數步長 (Stride)
    stride_x = src_w / dst_w
    stride_y = src_h / dst_h
    
    # 1. 根據縮圖的整數座標，直接用矩陣生成對應的原圖核心取樣點
    dx = np.arange(dst_w)
    dy = np.arange(dst_h)
    
    # 2. 運用映射公式：sx = (dx + 0.5) * stride - 0.5
    sx = (dx + 0.5) * stride_x - 0.5
    sy = (dy + 0.5) * stride_y - 0.5
    
    # 3. 取整數（Bilinear/Bicubic 的基準左上角格子）
    fx = np.floor(sx).astype(np.int32)
    fy = np.floor(sy).astype(np.int32)
    
    # 4. 建立 2x2 核心網格的偏移量 (Bicubic 正權重核心)
    offsets = [(0, 0), (0, 1), (1, 0), (1, 1)]
    
    stego_img = img_orig.copy()
    
    # 5. 使用 Numpy 的廣播與網格機制 (Meshgrid)，瞬間鎖定全圖規律座標
    mesh_x, mesh_y = np.meshgrid(fx, fy)
    
    print(f"正在針對 {dst_w}x{dst_h} 目標鋪設對抗棋盤相位...")
    
    for ox, oy in offsets:
        # 計算偏移後的規律座標，並確保不超出原圖邊界
        target_x = np.clip(mesh_x + ox, 0, src_w - 1)
        target_y = np.clip(mesh_y + oy, 0, src_h - 1)
        
        # 規律格殺：直接將這些符合數學規律的坐標點強行染黑 [0, 0, 0]
        stego_img[target_y, target_x] = [0, 0, 0]
        
    return stego_img

def generate_lanczos_checkerboard(img_orig, dst_w, dst_h):
    """
    純數學規律擺放法。
    精確鎖定 Lanczos 卷積核的核心相位，利用 $2 \times 2$ 填黑與 $8 \times 8$ 負權重截斷機制，
    讓 Lanczos 縮圖全面崩塌為純黑。
    """
    src_h, src_w, channels = img_orig.shape
    
    # 計算分數步長 (Stride)
    stride_x = src_w / dst_w
    stride_y = src_h / dst_h
    
    # 1. 根據縮圖座標生成一維矩陣
    dx = np.arange(dst_w)
    dy = np.arange(dst_h)
    
    # 2. 幾何中心映射公式
    sx = (dx + 0.5) * stride_x - 0.5
    sy = (dy + 0.5) * stride_y - 0.5
    
    # 3. 取得基準左上角整數座標
    fx = np.floor(sx).astype(np.int32)
    fy = np.floor(sy).astype(np.int32)
    
    # 4. 定義 2x2 核心正權重破壞點
    offsets = [(0, 0), (0, 1), (1, 0), (1, 1)]
    
    stego_img = img_orig.copy()
    
    # 5. 用 Meshgrid 矩陣廣播，瞬間定位全圖數十萬個核心相位
    mesh_x, mesh_y = np.meshgrid(fx, fy)
    
    print(f"⚡ 正在針對 Lanczos 進行幾何棋盤佈局 (目標: {dst_w}x{dst_h})...")
    
    for ox, oy in offsets:
        target_x = np.clip(mesh_x + ox, 0, src_w - 1)
        target_y = np.clip(mesh_y + oy, 0, src_h - 1)
        
        # 依規律強行穿插黑色像素
        stego_img[target_y, target_x] = [0, 0, 0]
        
    return stego_img

# ==========================================
# 實際測試
# ==========================================
if __name__ == "__main__":
    # 1. 讀取你的測試原圖
    img = cv2.imread("../public/example.jpeg")
    
    # 2. 計算這張圖「最終在環境中」應該要變成多大的縮圖 (w, h)
    w, h = calculate_env_target_size(img.shape[1], img.shape[0])
    print(f"🎯 最終縮圖的目標尺寸確定為: {w} x {h}")
    
    # 3. 模擬你把圖片強制墊高到 2048x2048 的大圖基底
    img_large = cv2.resize(img, (2048, 2048), interpolation=cv2.INTER_AREA)


    w, h = calculate_env_target_size(img_large.shape[1], img_large.shape[0])
    print("🎯 最終縮圖的目標尺寸確定為: {} x {}".format(w, h))
    
    # 4. 【關鍵修正】傳入 (w, h)，讓 2048 大圖的棋盤點完美對齊最終的縮放目標
    stego_res_bilinear = generate_bilinear_checkerboard(img_large, w, h)
    stego_res_bicubic = generate_bicubic_checkerboard(img_large, w, h)
    stego_res_lanczos = generate_lanczos_checkerboard(img_large, w, h)
    
    # 5. 儲存大圖 (請保持無損 PNG)
    cv2.imwrite("law_stego_pattern_bilinear.png", stego_res_bilinear)
    cv2.imwrite("law_stego_pattern_bicubic.png", stego_res_bicubic)
    cv2.imwrite("law_stego_pattern_lanczos.png", stego_res_lanczos)
    print("🎯 已生成對抗大圖：'law_stego_pattern_bilinear.png'、'law_stego_pattern_bicubic.png'、'law_stego_pattern_lanczos.png'，請確認大圖上的黑點棋盤是否已經完美規律分布！")

    # 6. 執行 Bilinear 縮圖驗證
    stego_bilinear = cv2.resize(stego_res_bilinear, (w, h), interpolation=cv2.INTER_LINEAR)
    stego_bicubic = cv2.resize(stego_res_bicubic, (w, h), interpolation=cv2.INTER_CUBIC)
    stego_lanczos = cv2.resize(stego_res_lanczos, (w, h), interpolation=cv2.INTER_LANCZOS4)
    cv2.imwrite("law_stego_bilinear.png", stego_bilinear)
    cv2.imwrite("law_stego_bicubic.png", stego_bicubic)
    cv2.imwrite("law_stego_lanczos.png", stego_lanczos)
    print("🎯 已生成縮圖驗證結果：'law_stego_bilinear.png'、'law_stego_bicubic.png'、'law_stego_lanczos.png'，請確認縮圖是否已經完全變黑！")
