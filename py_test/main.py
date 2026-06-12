import cv2
import numpy as np
import matplotlib.pyplot as plt

def generate_null_space_image(secret_path, target_b=250, contrast_scale=0.4):
    # 1. 讀取彩色秘密圖
    img = cv2.imread(secret_path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32)
    h, w, c = img.shape
    
    # 確保長寬為偶數
    h, w = h - (h % 2), w - (w % 2)
    img = img[:h, :w]

    # 2. 壓縮動態範圍，避免 P = 2B - S 超過 255
    # 我們讓 S 圍繞著 target_b 震盪，但振幅縮小
    # S_prime = target_b + (S - average_S) * contrast_scale
    img_avg = np.mean(img, axis=(0, 1))
    s_prime = target_b + (img - img_avg) * contrast_scale
    s_prime = np.clip(s_prime, 0, 255)
    
    # 3. 計算補數像素 (Anti-Phase Pixel)
    # 根據公式 P_complement = 2 * target_b - s_prime
    # 這樣 (s_prime + p_complement) / 2 = target_b
    p_comp = 2 * target_b - s_prime
    p_comp = np.clip(p_comp, 0, 255)

    # 4. 建立 2x2 相位對銷陣列
    # 佈局方案: 
    # [ S_prime, P_comp ]
    # [ P_comp,  S_prime ]
    final_img = np.zeros((h, w, c), dtype=np.uint8)
    
    # 利用 NumPy 切片進行高效布點
    # 這裡假設我們要將原圖尺寸維持，所以 S_prime 是從縮小後的圖擴張而來
    # 如果要 100% 清晰，建議輸入 secret 已經是目標尺寸的一半
    
    # 假設輸入的 secret 已經縮小過，我們要生成 2x 尺寸的原圖
    output_h, output_w = h * 2, w * 2
    canvas = np.zeros((output_h, output_w, c), dtype=np.uint8)
    
    canvas[0::2, 0::2] = s_prime.astype(np.uint8) # 左上
    canvas[1::2, 1::2] = s_prime.astype(np.uint8) # 右下
    canvas[0::2, 1::2] = p_comp.astype(np.uint8)  # 右上
    canvas[1::2, 0::2] = p_comp.astype(np.uint8)  # 左下
    
    return canvas
# 執行

def create_color_hidden_image(secret_path, output_path="result.png"):
    # 1. 讀取彩色秘密圖片 (BGR)
    secret = cv2.imread(secret_path)
    if secret is None:
        raise ValueError("無法讀取圖片，請確認路徑。")
    
    # 轉為 RGB 方便 plt 顯示
    secret = cv2.cvtColor(secret, cv2.COLOR_BGR2RGB)
    h, w, c = secret.shape
    
    # 2. 建立一個兩倍大的畫布（或者維持原大但取樣）
    # 這裡我們採用「擴張法」，讓每個原圖像素佔據 2x2 空間中的一格
    # 這樣能保證點開後的清晰度是最高的
    canvas = np.ones((h * 2, w * 2, 3), dtype=np.uint8) * 255
    
    # 3. 演算法核心：將原圖像素精確放在 (0,0) 位置，其餘 (0,1), (1,0), (1,1) 留白
    # 縮圖平均值 = (Secret + 255 + 255 + 255) / 4 -> 非常接近 255 (白色)
    canvas[0::2, 0::2] = secret
    
    # 4. 為了讓原圖更清晰，可以根據需要調整剩下三格的數值
    # 如果要讓縮圖徹底消失，剩下三格必須是 255
    
    return canvas, secret

def simulate_x_thumb(image, scale=0.25):
    # 模擬 X 的縮圖（Area 插值最接近社群平台的平均演算法）
    h, w, _ = image.shape
    new_size = (int(w * scale), int(h * scale))
    return cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)

if __name__ == "__main__":
    # 使用你的圖片
    INPUT_PATH = "../public/example.jpeg" 

    original = cv2.imread(INPUT_PATH)

    hidden_result = generate_null_space_image(INPUT_PATH)

    #
    # hidden_result, original = create_color_hidden_image(INPUT_PATH)
    
    # 模擬縮圖 (縮小 4 倍，相當於將 2x2 平均成 1 像素)
    thumbnail = simulate_x_thumb(hidden_result, scale=0.25)
    
    # 顯示結果
    plt.figure(figsize=(18, 6))
    
    plt.subplot(1, 3, 1)
    plt.title("Original (Secret)")
    plt.imshow(original)
    plt.axis('off')
    
    plt.subplot(1, 3, 2)
    plt.title("Final PNG (Look closely at 100% size)")
    plt.imshow(hidden_result)
    plt.axis('off')
    
    plt.subplot(1, 3, 3)
    plt.title("X Thumbnail Simulation (Hidden)")
    plt.imshow(thumbnail)
    plt.axis('off')
    
    plt.tight_layout()
    plt.show()

    # 存檔：務必使用 PNG
    # cv2.imwrite("hidden_color.png", cv2.cvtColor(hidden_result, cv2.COLOR_RGB2BGR))

import torch
import torch.nn.functional as F
import torchvision.transforms as transforms
from PIL import Image

# 1. 載入影像並轉為 Tensor
orig_img = Image.open("../public/example.jpeg").convert("RGB")
# 假設平台縮圖目標尺寸是 200x200
w_target, h_target = 200, 200 

transform = transforms.ToTensor()
I_orig = transform(orig_img).unsqueeze(0) # 轉為 (1, 3, H, W)

# 建立目標縮圖（純黑陷阱）
T_trap = torch.zeros((1, 3, h_target, w_target))

# 2. 初始化我們要優化的圖片（從原圖開始改）
I_attack = I_orig.clone().detach().requires_grad_(True)

# 3. 定義優化器
optimizer = torch.optim.Adam([I_attack], lr=0.005)

# 4. 迭代優化
for epoch in range(500):
    optimizer.zero_grad()
    
    # 模擬平台的雙三次插值縮放 (D)
    # 注意：實際開發時，需根據平台微調 align_corners 或使用特定的縮放函式庫
    I_downsampled = F.interpolate(I_attack, size=(h_target, w_target), mode='bicubic', align_corners=False)
    
    # 計算 Loss
    loss_trap = F.mse_loss(I_downsampled, T_trap)
    loss_visual = F.mse_loss(I_attack, I_orig)
    
    loss = 2.0 * loss_trap + 1.0 * loss_visual
    
    loss.backward()
    optimizer.step()
    
    # 確保像素值保持在 0.0 ~ 1.0 之間
    with torch.no_grad():
        I_attack.clamp_(0.0, 1.0)
        
    if epoch % 100 == 0:
        print(f"Epoch {epoch}: Loss = {loss.item():.6f}")

# 5. 儲存結果
output_img = transforms.ToPILImage()(I_attack.squeeze(0))
output_img.save("attack_trap.png")

