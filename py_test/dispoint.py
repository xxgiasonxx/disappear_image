import cv2
import numpy as np
from comp import resize_bilinear, resize_bicubic, resize_lanczos3, bicubic_kernel, lanczos_kernel


def backward_bilinear(delta, src_h, src_w):
    """將縮圖的誤差(delta)反向投影回原圖尺寸的像素點上"""
    dst_h, dst_w, channels = delta.shape
    grad = np.zeros((src_h, src_w, channels), dtype=np.float32)
    scale_y, scale_x = src_h / dst_h, src_w / dst_w
    
    for dy in range(dst_h):
        for dx in range(dst_w):
            sx = (dx + 0.5) * scale_x - 0.5
            sy = (dy + 0.5) * scale_y - 0.5
            x1 = max(0, int(np.floor(sx)))
            y1 = max(0, int(np.floor(sy)))
            x2 = min(x1 + 1, src_w - 1)
            y2 = min(y1 + 1, src_h - 1)
            tx, ty = sx - x1, sy - y1
            
            # 計算權重
            w1 = (1 - tx) * (1 - ty)
            w2 = tx * (1 - ty)
            w3 = (1 - tx) * ty
            w4 = tx * ty
            
            for c in range(channels):
                d = delta[dy, dx, c]
                grad[y1, x1, c] += d * w1
                grad[y1, x2, c] += d * w2
                grad[y2, x1, c] += d * w3
                grad[y2, x2, c] += d * w4
    return grad

def backward_bicubic(delta, src_h, src_w):
    dst_h, dst_w, channels = delta.shape
    grad = np.zeros((src_h, src_w, channels), dtype=np.float32)
    scale_y, scale_x = src_h / dst_h, src_w / dst_w
    
    for dy in range(dst_h):
        for dx in range(dst_w):
            sx = (dx + 0.5) * scale_x - 0.5
            sy = (dy + 0.5) * scale_y - 0.5
            fx, fy = int(np.floor(sx)), int(np.floor(sy))
            
            weights_x = [bicubic_kernel(sx - (fx + j)) for j in range(-1, 3)]
            weights_y = [bicubic_kernel(sy - (fy + i)) for i in range(-1, 3)]
            weights_x /= np.sum(weights_x)
            weights_y /= np.sum(weights_y)
            
            for i in range(-1, 3):
                yy = np.clip(fy + i, 0, src_h - 1)
                for j in range(-1, 3):
                    xx = np.clip(fx + j, 0, src_w - 1)
                    w = weights_x[j + 1] * weights_y[i + 1]
                    for c in range(channels):
                        grad[yy, xx, c] += delta[dy, dx, c] * w
    return grad

def backward_lanczos3(delta, src_h, src_w):
    dst_h, dst_w, channels = delta.shape
    grad = np.zeros((src_h, src_w, channels), dtype=np.float32)
    scale_y, scale_x = src_h / dst_h, src_w / dst_w
    
    for dy in range(dst_h):
        for dx in range(dst_w):
            sx = (dx + 0.5) * scale_x - 0.5
            sy = (dy + 0.5) * scale_y - 0.5
            fx, fy = int(np.floor(sx)), int(np.floor(sy))
            
            weights_x = [lanczos_kernel(sx - (fx + j)) for j in range(-2, 4)]
            weights_y = [lanczos_kernel(sy - (fy + i)) for i in range(-2, 4)]
            sum_x, sum_y = np.sum(weights_x), np.sum(weights_y)
            if sum_x != 0: weights_x /= sum_x
            if sum_y != 0: weights_y /= sum_y
            
            for i in range(-2, 4):
                yy = np.clip(fy + i, 0, src_h - 1)
                for j in range(-2, 4):
                    xx = np.clip(fx + j, 0, src_w - 1)
                    w = weights_x[j + 2] * weights_y[i + 2]
                    for c in range(channels):
                        grad[yy, xx, c] += delta[dy, dx, c] * w
    return grad

def generate_adversarial_image(orig_img, target_color, target_w, target_h, iterations=30, lr=0.8, epsilon=15):
    """
    生成抗重採樣的對抗性圖片 (PGD 演算法)
    
    :param orig_img: 原始圖片 (numpy array, RGB)
    :param target_color: 目標縮圖顏色 (0=全黑, 255=全白)
    :param target_w: 縮圖目標寬度
    :param target_h: 縮圖目標高度
    :param iterations: 跌代次數
    :param lr: 學習率 (Learning Rate)
    :param epsilon: 最大容許像素擾動量 (控制肉眼不可見的程度)
    """
    src_h, src_w, channels = orig_img.shape
    
    # 建立目標縮圖矩陣 (全黑或全白)
    target_img = np.full((target_h, target_w, channels), target_color, dtype=np.float32)
    
    # 初始化對抗圖片 (X_adv) 為原圖的 float32 版本
    x_adv = orig_img.astype(np.float32).copy()
    orig_img_float = orig_img.astype(np.float32)
    
    print(f"開始優化... 原圖尺寸: {src_w}x{src_h} -> 目標縮圖: {target_w}x{target_h}")
    
    for i in range(iterations):
        # 為了傳入你原本的 resize 函數，需要將 x_adv 轉為 uint8
        # (雖然這會產生微小的量化誤差，但對於我們的跌代是可接受的)
        current_img = np.clip(x_adv, 0, 255).astype(np.uint8)
        
        # 1. 前向傳播 (Forward) - 取得目前三種演算法的縮圖結果
        out_bil = resize_bilinear(current_img, target_h, target_w).astype(np.float32)
        out_bic = resize_bicubic(current_img, target_h, target_w).astype(np.float32)
        out_lan = resize_lanczos3(current_img, target_h, target_w).astype(np.float32)
        
        # 2. 計算誤差 (Delta)
        delta_bil = out_bil - target_img
        delta_bic = out_bic - target_img
        delta_lan = out_lan - target_img
        
        # 監控 Loss (MSE)
        loss = (np.mean(delta_bil**2) + np.mean(delta_bic**2) + np.mean(delta_lan**2)) / 3
        print(f"Iteration {i+1}/{iterations} | Average MSE Loss: {loss:.2f}")
        
        # 若誤差已經極小，可提早結束
        if loss < 1.0:
            print("Loss 已達標，提早結束優化。")
            break
            
        # 3. 反向傳播 (Backward) - 計算梯度
        grad_bil = backward_bilinear(delta_bil, src_h, src_w)
        grad_bic = backward_bicubic(delta_bic, src_h, src_w)
        grad_lan = backward_lanczos3(delta_lan, src_h, src_w)
        
        # 將三種演算法的梯度平均 (同時兼顧三把「密碼鎖」)
        grad_total = (grad_bil + grad_bic + grad_lan) / 3.0
        
        # 4. 更新像素 (Gradient Descent)
        # 因為我們希望縮小 delta，所以是減去梯度
        x_adv = x_adv - lr * grad_total
        
        # 5. 投影 (Projection) - 確保修改幅度不超過 epsilon，維持原圖視覺品質
        x_adv = np.clip(x_adv, orig_img_float - epsilon, orig_img_float + epsilon)
        x_adv = np.clip(x_adv, 0, 255) # 確保不超出 RGB 色彩範圍

    return np.clip(x_adv, 0, 255).astype(np.uint8)

# ==========================================
# 實際執行範例
# ==========================================

# 1. 讀取原圖 (假設原圖是高畫質美少女或風景照)
img_orig = cv2.imread("example.jpeg")
if img_orig is None:
    # 創建一個測試用假原圖，避免你本地沒有 example.jpeg 報錯
    img_orig = np.random.randint(100, 200, (800, 800, 3), dtype=np.uint8) 

# 2. 計算目標縮圖大小
src_h, src_w = img_orig.shape[:2]
target_w, target_h = calculate_env_target_size(src_w, src_h)

# 3. 執行演算法 (目標為純黑: 0, 或者純白: 255)
# 提醒：由於純 Python 的雙迴圈運算在 CPU 上非常慢，建議先用較小的圖片 (例如 400x400) 測試
TARGET_COLOR = 0  # 0代表要讓縮圖變全黑
adv_image = generate_adversarial_image(
    orig_img=img_orig, 
    target_color=TARGET_COLOR, 
    target_w=target_w, 
    target_h=target_h, 
    iterations=20,  # 可視收斂情況增加
    lr=1.2,         # 學習率可依需求微調
    epsilon=25      # 容許的像素變動值，越大縮圖越黑，但原圖噪點越明顯
)

# 4. 輸出保存
cv2.imwrite("adversarial_original.png", adv_image) # 這是你要散佈的大圖

# 驗證成果：看看各大平台演算法壓縮出來是不是黑的
test_bil = resize_bilinear(adv_image, target_h, target_w)
test_bic = resize_bicubic(adv_image, target_h, target_w)
cv2.imwrite("test_thumbnail_bilinear.png", test_bil)
cv2.imwrite("test_thumbnail_bicubic.png", test_bic)

img = cv2.imread("../public/example.jpeg")
img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

width, height = 1050, 700

bbil = backward_bilinear(img, height, width)
bbic = backward_bicubic(img, height, width)

cv2.imwrite("bbil.jpg", bbil)
cv2.imwrite("bbic.jpg", bbic)

cv2.imwrite("bbil_comp.jpg", resize_bilinear(bbil, height, width))
cv2.imwrite("bbic_comp.jpg", resize_bicubic(bbic, height, width))



