import numpy as np
import cv2

# ==========================================
# 建立「縮圖可見、原圖隱藏」的頻率分離圖層
# 這是訊號處理中的「頻域分離」技術
# ==========================================

def get_downscale_contribution_map(src_h, src_w, dst_h, dst_w, method='bilinear'):
    """
    計算每個原圖像素對縮圖的貢獻權重矩陣
    這是理解 backward pass 的核心工具
    """
    scale_y = src_h / dst_h
    scale_x = src_w / dst_w
    
    # 建立貢獻圖 (src_h x src_w)
    contrib = np.zeros((src_h, src_w), dtype=np.float32)
    
    for dy in range(dst_h):
        for dx in range(dst_w):
            sx = (dx + 0.5) * scale_x - 0.5
            sy = (dy + 0.5) * scale_y - 0.5
            
            if method == 'bilinear':
                x1 = max(0, int(np.floor(sx)))
                y1 = max(0, int(np.floor(sy)))
                x2 = min(x1 + 1, src_w - 1)
                y2 = min(y1 + 1, src_h - 1)
                tx, ty = sx - x1, sy - y1
                
                contrib[y1, x1] += (1-tx)*(1-ty)
                contrib[y1, x2] += tx*(1-ty)
                contrib[y2, x1] += (1-tx)*ty
                contrib[y2, x2] += tx*ty
    
    return contrib


def frequency_domain_analysis(img):
    """
    用 FFT 分析圖片的頻率成分
    高頻成分 = 在縮圖時容易被濾掉的部份
    """
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.float32)
    
    fft = np.fft.fft2(gray)
    fft_shift = np.fft.fftshift(fft)
    magnitude = np.log(np.abs(fft_shift) + 1)
    
    return fft_shift, magnitude


def create_high_frequency_noise_layer(shape, intensity=15):
    """
    建立高頻擾動層（在縮圖時會被低通濾波濾掉）
    這就是「縮圖後消失的訊息」的物理機制
    """
    h, w, c = shape
    noise = np.zeros(shape, dtype=np.float32)
    
    # 建立棋盤格高頻圖案（奈奎斯特頻率，縮圖時必然消失）
    for y in range(h):
        for x in range(w):
            # 棋盤格在 bilinear/bicubic 縮圖時加權和精確為零
            checkerboard_sign = (-1) ** (x + y)
            noise[y, x, :] = checkerboard_sign * intensity
    
    return noise


def embed_low_frequency_signal(img, signal_img, alpha=0.3):
    """
    將一張圖片的低頻成分嵌入另一張圖
    低頻成分 = 縮圖後仍然保留的部份
    """
    h, w = img.shape[:2]
    
    result = np.zeros_like(img, dtype=np.float32)
    for c in range(img.shape[2]):
        # 原圖 FFT
        fft_orig = np.fft.fft2(img[:,:,c].astype(np.float32))
        # 訊號 FFT
        sig_resized = cv2.resize(signal_img[:,:,c] if len(signal_img.shape)==3 
                                  else signal_img, (w, h))
        fft_sig = np.fft.fft2(sig_resized.astype(np.float32))
        
        # 低通濾波器（只保留中央頻率成分）
        lpf = np.zeros((h, w), dtype=np.float32)
        cy, cx = h//2, w//2
        radius = min(h, w) // 8  # 只取最低 1/8 的頻率
        for y in range(h):
            for x in range(w):
                if (y-cy)**2 + (x-cx)**2 < radius**2:
                    lpf[y, x] = 1.0
        
        # 混合：原圖保持高頻，訊號貢獻低頻
        fft_shift_orig = np.fft.fftshift(fft_orig)
        fft_shift_sig = np.fft.fftshift(fft_sig)
        
        combined = fft_shift_orig * (1 - lpf * alpha) + fft_shift_sig * (lpf * alpha)
        
        result[:,:,c] = np.real(np.fft.ifft2(np.fft.ifftshift(combined)))
    
    return np.clip(result, 0, 255).astype(np.uint8)


# ==========================================
# 核心示範：驗證棋盤格高頻的縮圖消失效果
# ==========================================

def demonstrate_frequency_cancellation():
    """
    示範「高頻訊號在縮圖時的物理性消失」
    這是可以用小圖完整驗證的教學範例
    """
    # 建立 8x8 棋盤格（純高頻）
    checkerboard = np.zeros((8, 8), dtype=np.float32)
    for y in range(8):
        for x in range(8):
            checkerboard[y, x] = 255 if (x + y) % 2 == 0 else 0
    
    # 縮小到 4x4（bilinear）
    small = cv2.resize(checkerboard, (4, 4), interpolation=cv2.INTER_LINEAR)
    
    print("原始 8x8 棋盤格（部份）：")
    print(checkerboard)
    print(f"\n縮到 4x4 後（bilinear）：")
    print(small)
    print(f"\n縮圖後均值：{small.mean():.2f}（理論值：127.5，即灰色）")
    # 注意：不是全黑，而是灰色！這是正確的物理結果
    
    return checkerboard, small


if __name__ == "__main__":
    demonstrate_frequency_cancellation()
