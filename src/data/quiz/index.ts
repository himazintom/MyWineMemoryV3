import type { QuizQuestion } from '../../types';

// レベル定義
export const QUIZ_LEVELS = [
  { level: 1, name: 'ワインの基本', description: '赤・白・ロゼ・スパークリング' },
  { level: 2, name: '主要ブドウ品種', description: '国際品種中心' },
  { level: 3, name: '基本的なテイスティング技法', description: 'テイスティングの基礎' },
  { level: 4, name: 'ワインサービスとマナー', description: 'サービスの基本' },
  { level: 5, name: '基本的なフードペアリング', description: '料理との相性' },
  { level: 6, name: 'フランスワイン基礎', description: '主要産地' },
  { level: 7, name: 'イタリア・ドイツ・スペインワイン', description: '欧州三大産地' },
  { level: 8, name: '新世界ワイン', description: 'アメリカ・オーストラリア等' },
  { level: 9, name: 'ワイン製造技術詳細', description: '醸造プロセス' },
  { level: 10, name: 'ヴィンテージと熟成', description: '年代と熟成' },
  { level: 11, name: 'フランス各地方詳細', description: 'ボルドー・ブルゴーニュ' },
  { level: 12, name: '世界各国のワイン法規制', description: '法律と規制' },
  { level: 13, name: 'プロテイスティング・ブラインド技法', description: '上級テイスティング' },
  { level: 14, name: '稀少品種・マイナー産地', description: '珍しい品種と産地' },
  { level: 15, name: 'ワインビジネス・流通', description: 'ビジネス側面' },
  { level: 16, name: '歴史的ヴィンテージ・伝説的ワイン', description: '歴史と伝説' },
  { level: 17, name: '最新醸造技術・イノベーション', description: '技術革新' },
  { level: 18, name: 'ワイン投資・ビジネス理論', description: '投資と経営' },
  { level: 19, name: '総合酒類知識', description: '日本酒・ウイスキー等' },
  { level: 20, name: 'ワイン哲学・心理学・文化論', description: '文化と心理' },
] as const;

// 動的インポート用のマップ
const levelImportMap: Record<number, () => Promise<{ default: QuizQuestion[] }>> = {
  1: async () => {
    const { level01Questions } = await import('./levels/level01-basic');
    return { default: level01Questions };
  },
  2: async () => {
    const { level02Questions } = await import('./levels/level02-grapes');
    return { default: level02Questions };
  },
  3: async () => {
    const { level03Questions } = await import('./levels/level03-tasting');
    return { default: level03Questions };
  },
  4: async () => {
    const { level04Questions } = await import('./levels/level04-service');
    return { default: level04Questions };
  },
  5: async () => {
    const { level05Questions } = await import('./levels/level05-pairing');
    return { default: level05Questions };
  },
  6: async () => {
    const { level06Questions } = await import('./levels/level06-france');
    return { default: level06Questions };
  },
  7: async () => {
    const { level07Questions } = await import('./levels/level07-europe');
    return { default: level07Questions };
  },
  8: async () => {
    const { level08Questions } = await import('./levels/level08-newworld');
    return { default: level08Questions };
  },
  9: async () => {
    const { level09Questions } = await import('./levels/level09-production');
    return { default: level09Questions };
  },
  10: async () => {
    const { level10Questions } = await import('./levels/level10-vintage');
    return { default: level10Questions };
  },
  11: async () => {
    const { level11Questions } = await import('./levels/level11-france-detail');
    return { default: level11Questions };
  },
  12: async () => {
    const { level12Questions } = await import('./levels/level12-regulations');
    return { default: level12Questions };
  },
  13: async () => {
    const { level13Questions } = await import('./levels/level13-pro-tasting');
    return { default: level13Questions };
  },
  14: async () => {
    const { level14Questions } = await import('./levels/level14-rare');
    return { default: level14Questions };
  },
  15: async () => {
    const { level15Questions } = await import('./levels/level15-business');
    return { default: level15Questions };
  },
  16: async () => {
    const { level16Questions } = await import('./levels/level16-history');
    return { default: level16Questions };
  },
  17: async () => {
    const { level17Questions } = await import('./levels/level17-innovation');
    return { default: level17Questions };
  },
  18: async () => {
    const { level18Questions } = await import('./levels/level18-investment');
    return { default: level18Questions };
  },
  19: async () => {
    const { level19Questions } = await import('./levels/level19-spirits');
    return { default: level19Questions };
  },
  20: async () => {
    const { level20Questions } = await import('./levels/level20-philosophy');
    return { default: level20Questions };
  },
};

// キャッシュ用
const questionCache: Map<number, QuizQuestion[]> = new Map();

/**
 * 指定レベルの問題を動的に読み込む
 * @param level レベル番号 (1-20)
 * @returns 問題配列
 */
export async function loadQuestionsByLevel(level: number): Promise<QuizQuestion[]> {
  // キャッシュチェック
  if (questionCache.has(level)) {
    return questionCache.get(level)!;
  }

  // 動的インポート
  const importer = levelImportMap[level];
  if (!importer) {
    console.warn(`Level ${level} not found, returning empty array`);
    return [];
  }

  try {
    const module = await importer();
    const questions = module.default;
    
    // キャッシュに保存
    questionCache.set(level, questions);
    
    return questions;
  } catch (error) {
    console.error(`Failed to load level ${level}:`, error);
    return [];
  }
}

/**
 * 複数レベルの問題を読み込む
 * @param levels レベル番号の配列
 * @returns 統合された問題配列
 */
export async function loadQuestionsByLevels(levels: number[]): Promise<QuizQuestion[]> {
  const allQuestions = await Promise.all(
    levels.map(level => loadQuestionsByLevel(level))
  );
  
  return allQuestions.flat();
}

/**
 * 指定難易度範囲の問題を読み込む
 * @param minLevel 最小レベル
 * @param maxLevel 最大レベル
 * @returns 統合された問題配列
 */
export async function loadQuestionsByRange(
  minLevel: number,
  maxLevel: number
): Promise<QuizQuestion[]> {
  const levels = Array.from(
    { length: maxLevel - minLevel + 1 },
    (_, i) => minLevel + i
  );
  
  return loadQuestionsByLevels(levels);
}

/**
 * キャッシュをクリア
 */
export function clearQuestionCache(): void {
  questionCache.clear();
}

// 後方互換性のため、既存コンポーネント用のエクスポート
// 初期は空配列、必要に応じて動的に読み込む
export let SAMPLE_QUIZ_QUESTIONS: QuizQuestion[] = [];

// 初期化関数（アプリ起動時に呼ぶ）
export async function initializeQuizQuestions(): Promise<void> {
  // 最初はレベル1のみ読み込む（初心者向け）
  SAMPLE_QUIZ_QUESTIONS = await loadQuestionsByLevel(1);
}