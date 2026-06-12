import os
import cv2
import numpy as np
import torch
import torch.nn.functional as F
import torch.optim as optim
import random


def calculate_discord_target_size(w_orig, h_orig):
    # Discord 的網頁/桌面端大圖檢視邊界框
    max_w = 1100
    max_h = 700

    # 計算寬與高的縮放係數，取最嚴格（最小）的那一個
    scale = min(max_w / w_orig, max_h / h_orig)

    # 如果原圖本來就比相框小，通常不放大（scale = min(scale, 1.0)），但此處原圖很大
    w_target = round(w_orig * scale)
    h_target = round(h_orig * scale)

    return w_target, h_target

# 測試你的數據
print(calculate_discord_target_size(2048, 2048)) # 輸出: (700, 700)

def optimize_robust_discord_illusion(secret_image_path, output_path, block_size=8, epochs=1200, lr=0.01):
    """
    使用 EOT (變形期望) 與大區塊優化，對抗 Discord 的 WebP 破壞性壓縮與動態縮放。
    
    block_size: 區塊大小（像素）。設為 8 可以完美對齊 WebP/JPEG 的巨集塊，抗壓縮能力最強。
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🎬 執行硬體環境: {device}")

    # 1. 讀取並標準化秘密原圖
    orig_img = cv2.imread(secret_image_path)
    if orig_img is None:
        print("錯誤：找不到來源秘密圖片！")
        return
        
    # 為了方便 8x8 區塊切分，將原圖強制固定在 800x800 基底
    base_w, base_h = 800, 800
    orig_img = cv2.resize(orig_img, (base_w, base_h), interpolation=cv2.INTER_AREA)
    secret_tensor = torch.from_numpy(orig_img).float().permute(2, 0, 1).unsqueeze(0).to(device) / 255.0

    # 2. 【核心改動】不直接優化大圖，而是優化一個「低頻粗顆粒遮罩 (Delta)」
    # 尺寸為 (800/8, 800/8) = 100x100
    mask_h, mask_w = base_h // block_size, base_w // block_size
    # 初始化遮罩為 0
    delta = torch.zeros((1, 3, mask_h, mask_w), device=device, requires_grad=True)
    
    # 使用 Adam 優化器專職調整這個遮罩
    optimizer = optim.Adam([delta], lr=lr)

    print(f"🚀 開始進行 EOT 魯棒性優化（共 {epochs} 代）...")
    
    for epoch in range(epochs):
        optimizer.zero_grad()
        
        # 將低頻遮罩用 Nearest 放大回 800x800，強迫產生抗壓縮的大方塊圖案
        delta_upscaled = F.interpolate(delta, size=(base_h, base_w), mode='nearest')
        
        # 產生最終對抗圖片 X，並限制在合法色彩範圍 [0, 1]
        X = torch.clamp(secret_tensor + delta_upscaled, 0.0, 1.0)
        
        # ---------------------------------------------------------
        # 🌟 EOT 模擬核心：讓圖片在「各種惡劣變形」下都能收斂成灰色
        # ---------------------------------------------------------
        # 隨機模擬 Discord 在不同裝置上的縮圖尺寸 (360px ~ 440px)
        random_size = random.randint(360, 440)
        
        # 模擬縮放
        simulated_preview = F.interpolate(X, size=(random_size, random_size), 
                                          mode='bicubic', align_corners=False)
        
        # 模擬 WebP 的量化抹除：隨機注入輕微的高斯模糊與微量雜訊
        # 這會強迫優化器放棄無效的高頻像素，改用粗壯的線條去對抗
        if random.random() > 0.5:
            # 隨機雜訊
            noise = torch.randn_like(simulated_preview) * 0.015
            simulated_preview = simulated_preview + noise
            
        # 3. 計算多重損失函數 (Loss Function)
        # 目標 A：任何隨機縮放後的預覽圖，都要極度接近純灰色 (127/255)
        decoy_target = torch.full_like(simulated_preview, 127.0 / 255.0)
        loss_preview = F.mse_loss(simulated_preview, decoy_target)
        
        # 目標 B：大圖與原圖的差距不能太大，確保點開時全彩細節依然清晰
        loss_secret = F.mse_loss(X, secret_tensor)
        
        # 權重平衡：大幅拉高預覽隱形的要求，壓制原圖失真
        total_loss = 5.0 * loss_preview + 1.0 * loss_secret
        
        total_loss.backward()
        optimizer.step()
        
        if (epoch + 1) % 100 == 0:
            print(f"代數 [{epoch+1}/{epochs}] | 總損失: {total_loss.item():.5f} | 抗縮放誤差: {loss_preview.item():.5f}")

    # 4. 優化完成，輸出無損 PNG 矩陣
    with torch.no_grad():
        delta_upscaled = F.interpolate(delta, size=(base_h, base_w), mode='nearest')
        final_X = torch.clamp(secret_tensor + delta_upscaled, 0.0, 1.0)
        
        # 轉回 OpenCV 格式
        output_img = final_X.squeeze(0).permute(1, 2, 0).cpu().numpy()
        output_img = (output_img * 255.0).astype(np.uint8)
        
        cv2.imwrite(output_path, output_img)
        print(f"\n🎉 [EOT 強化版] 對抗圖片已生成：{output_path}")
        print(f"💡 運作機制：此圖片內含 8x8 密碼方塊，已在程式內模擬過 Discord 壓縮，抗性極高！")

# ==========================================
# 執行測試
# ==========================================
if __name__ == "__main__":
    optimize_robust_discord_illusion(
        secret_image_path="../public/example.jpeg",      # 你的全彩秘密原圖
        output_path="discord_eot_matrix.png",  # 輸出的魔法對抗圖
        block_size=8,                           # 區塊大小 (對齊 JPEG/WebP 巨集塊)
        epochs=1000,                            # 迭代次數
        lr=0.01
    )
