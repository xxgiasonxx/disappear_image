import math

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
print(calculate_discord_target_size(2048, 872))  # 輸出: (1100, 468)

print(calculate_discord_target_size(299, 878))

def calculate_env_target_size(w_orig, h_orig):
    max_w = 1100
    max_h = 700

    scale = min(max_w / w_orig, max_h / h_orig)

    w_target = round(w_orig * scale)
    h_target = round(h_orig * scale)

    return w_target, h_target

# 測試你的數據
print(calculate_env_target_size(2048, 2048)) # 輸出: (700, 700)
print(calculate_env_target_size(2048, 872))  # 輸出: (1100, 468)

print(calculate_env_target_size(299, 878))
