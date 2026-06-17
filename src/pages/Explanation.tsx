import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Step {
  title: string;
  description: string;
  details?: string[];
}

const OVERVIEW = {
  title: '西洋棋盤 PNG 演算法',
  content: '這段程式碼的目的，是把圖片轉成「西洋棋盤狀」的半透明 PNG——奇數格完全透明、偶數格保留色彩——這是社群上常見繞過 X(Twitter) 圖片再壓縮機制的技巧，讓上傳的圖在 1MB 以內仍保有不錯的畫質。',
};

const ANALYTICAL_STEPS: Step[] = [
  {
    title: '1. 色彩量化（Median-cut 演算法）',
    description: '將圖片顏色數量減少到指定數量（如 32 色），使用經典的 Median-cut 演算法。',
    details: [
      'buildColorHistogram：掃過所有像素，把重複的顏色合併成 {r, g, b, count}，避免重複計算',
      'computeBoxStats：把顏色包成「色彩空間中的盒子」，記錄 R/G/B 各自的最小最大範圍',
      'splitBoxAtMedian：找出盒子裡範圍最大的色版，依該色版排序顏色，再依「像素數量」找出加權中位數位置切開',
      'findBoxToSplit：選總像素數最多的盒子優先切，優先細分「最常見」的顏色區域',
      'applyQuantization：對每個像素做最近鄰比對（歐式距離平方），找調色盤裡距離最近的顏色替換',
    ],
  },
  {
    title: '2. 棋盤格化（Checkerboard）',
    description: '將量化後的圖片轉換成西洋棋盤格式。',
    details: [
      '(x+y) 為偶數的格子：保留色彩、alpha=255',
      '(x+y) 為奇數的格子：強制設成完全透明的白色',
      '這是繞過社群平台再壓縮的關鍵技巧',
    ],
  },
  {
    title: '3. 圖片放大（Upscale）',
    description: '用 canvas 將過小的圖放大到至少 1000px。',
    details: [
      '保證棋盤格化後肉眼看起來夠細緻',
      '使用雙線性插值進行平滑放大',
    ],
  },
  {
    title: '4. 主流程：貪婪搜尋',
    description: '從 numColors=32、scale=1.0 開始，逐步調整參數找符合 1MB 的組合。',
    details: [
      '先檢查：量化→套用→棋盤格化→編碼 PNG，檔案是否 ≤ 1MB',
      '太大就先減顏色數：32→16→8→4→2',
      '顏色數降到 2 還是太大，才開始縮小解析度（每次 scale 減 0.1）',
      'scale 降到 0.3 以下還是不行，回傳失敗',
      '這是單一路徑、貪婪式的搜尋，找到就停',
    ],
  },
];

const BRUTEFORCE_STEPS: Step[] = [
  {
    title: '1. 枚舉所有組合',
    description: '暴力窮舉所有可能的參數組合。',
    details: [
      'scaleOptions = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3]（8 個）',
      'colorOptions = [32, 16, 8, 4, 2]（5 個）',
      '兩兩配對共 40 種組合',
      '每種都完整跑一次：縮放→量化→套用→棋盤格化→編碼 PNG',
    ],
  },
  {
    title: '2. 收集合格候選',
    description: '只保留檔案大小 ≤ 1MB 的組合。',
    details: [
      '40 種組合全部跑完後過濾',
      '用 originalOrderIndex 給每個候選排序優先度',
    ],
  },
  {
    title: '3. 選擇最終結果',
    description: '根據優先順序選擇最好的組合。',
    details: [
      'scale === 1.0 時，依顏色數 32→16→8→4→2 給予 0~4 的索引（畫質最佳優先）',
      'scale !== 1.0 但 numColors === 2 時，索引是 4 + round((1-scale)*10)',
      '其他組合索引維持 Infinity，等於被排到最後',
    ],
  },
];

const COMPARISON = [
  {
    title: '優先順序一致',
    description: '兩者的選擇邏輯相同：先用最大解析度試遍 32→2 色，不行才降解析度（且只用 2 色）。',
    type: 'neutral' as const,
  },
  {
    title: '計算成本',
    description: '優化解最好情況只跑 1 次，最差約 12 次。暴力解固定跑滿 40 次。',
    type: 'warning' as const,
  },
  {
    title: '暴力解的「全面性」',
    description: '暴力解的候選清單包含優化解不會嘗試的組合（如 16 色 + 0.7 縮放），但以目前排序邏輯，這些幾乎不會被選中。',
    type: 'info' as const,
  },
];

function AlgorithmSection({ 
  title, 
  steps, 
  isHighlighted = false,
  bgColor = 'bg-base-200'
}: { 
  title: string; 
  steps: Step[];
  isHighlighted?: boolean;
  bgColor?: string;
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = useCallback((index: number) => {
    setExpandedIndex(prev => prev === index ? null : index);
  }, []);

  return (
    <div className={`${bgColor} rounded-xl p-4 sm:p-6 ${isHighlighted ? 'ring-2 ring-primary' : ''}`}>
      <h3 className={`text-lg sm:text-xl font-bold mb-4 ${isHighlighted ? 'text-primary' : 'text-secondary'}`}>
        {title}
      </h3>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="bg-base-300 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleExpand(index)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <span className="text-base-content font-medium text-sm sm:text-base">{step.title}</span>
              <svg 
                className={`w-4 h-4 text-base-content transition-transform duration-200 ${expandedIndex === index ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedIndex === index && (
              <div className="px-4 pb-4">
                <p className="text-base-content/70 text-sm mb-3">{step.description}</p>
                {step.details && (
                  <ul className="space-y-1.5">
                    {step.details.map((detail, i) => (
                      <li key={i} className="text-base-content/60 text-xs sm:text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Explanation() {
  const [showAnalytical, setShowAnalytical] = useState(true);
  const [showBruteForce, setShowBruteForce] = useState(true);

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-10 md:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-base-content mb-3 sm:mb-4">
            演算法說明
          </h1>
          <p className="text-base-content/70 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
            了解如何將圖片轉換成「西洋棋盤狀」的半透明 PNG，繞過社群平台的圖片再壓縮機制
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-base-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <h2 className="text-lg sm:text-xl font-bold text-primary mb-3">{OVERVIEW.title}</h2>
          <p className="text-base-content/80 text-sm sm:text-base leading-relaxed">
            {OVERVIEW.content}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
            <button
              onClick={() => setShowAnalytical(!showAnalytical)}
              className={`btn btn-sm ${showAnalytical ? 'btn-primary' : 'btn-ghost'}`}
            >
              優化解（Analytical）
            </button>
            <button
              onClick={() => setShowBruteForce(!showBruteForce)}
              className={`btn btn-sm ${showBruteForce ? 'btn-secondary' : 'btn-ghost'}`}
            >
              暴力解（Brute Force）
            </button>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {showAnalytical && (
              <AlgorithmSection
                title="優化解（Analytical / processImageForX）"
                steps={ANALYTICAL_STEPS}
                isHighlighted={true}
                bgColor="bg-primary/10"
              />
            )}
            {showBruteForce && (
              <AlgorithmSection
                title="暴力解（Brute Force / bruteForceXProcess）"
                steps={BRUTEFORCE_STEPS}
                bgColor="bg-secondary/10"
              />
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-base-200 rounded-xl p-4 sm:p-6"
        >
          <h2 className="text-lg sm:text-xl font-bold text-base-content mb-4">兩者比較</h2>
          <div className="space-y-3 sm:space-y-4">
            {COMPARISON.map((item, index) => (
              <div 
                key={index} 
                className={`rounded-lg p-3 sm:p-4 ${
                  item.type === 'warning' ? 'bg-warning/30 border border-warning/50' :
                  item.type === 'info' ? 'bg-info/30 border border-info/50' :
                  'bg-base-300'
                }`}
              >
                <h3 className={`font-semibold mb-2 ${
                  item.type === 'warning' ? 'text-warning' :
                  item.type === 'info' ? 'text-info' :
                  'text-base-content'
                }`}>
                  {item.title}
                </h3>
                <p className="text-base-content/70 text-sm">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-base-300 rounded-lg">
            <h3 className="text-primary font-semibold mb-3">結論</h3>
            <p className="text-base-content/70 text-sm leading-relaxed">
              暴力解是用 40 倍運算量去換一個跟優化解幾乎相同的結果。以目前的排序邏輯來看，
              暴力解窮舉的 40 種組合裡，大部分（尤其是中間顏色數搭配縮小解析度的組合）
              即使算出來合法也幾乎不會被真正採用，純粹是陪跑。
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 sm:mt-8 text-center text-base-content/70 text-xs sm:text-sm"
        >
          <p>核心原理：利用社群平台的圖片縮放演算法特性，透過西洋棋盤格式保留視覺品質</p>
        </motion.div>
      </div>
    </div>
  );
}