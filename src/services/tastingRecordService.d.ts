import { QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import type { TastingRecord, WineMatch, PopularWine } from '../types';
/**
 * テイスティング記録管理サービス
 * Firestore操作の抽象化とビジネスロジックの実装
 */
declare class TastingRecordService {
    private static instance;
    private readonly collectionName;
    private constructor();
    static getInstance(): TastingRecordService;
    /**
     * テイスティング記録の作成
     */
    createRecord(userId: string, recordData: Omit<TastingRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<TastingRecord>;
    /**
     * テイスティング記録の取得
     */
    getRecord(recordId: string): Promise<TastingRecord | null>;
    /**
     * テイスティング記録の更新
     */
    updateRecord(recordId: string, updates: Partial<Omit<TastingRecord, 'id' | 'userId' | 'createdAt'>>): Promise<void>;
    /**
     * テイスティング記録の削除
     */
    deleteRecord(recordId: string): Promise<void>;
    /**
     * ユーザーの全テイスティング記録を取得
     */
    getUserRecords(userId: string, options?: {
        limitCount?: number;
        lastRecord?: QueryDocumentSnapshot<DocumentData>;
        orderByField?: 'tastingDate' | 'createdAt' | 'rating';
        orderDirection?: 'asc' | 'desc';
    }): Promise<{
        records: TastingRecord[];
        lastDocument: QueryDocumentSnapshot<DocumentData> | null;
        hasMore: boolean;
    }>;
    /**
     * 条件付きでユーザー記録をフィルタリング
     */
    getFilteredRecords(userId: string, filters: {
        country?: string;
        region?: string;
        type?: string;
        minRating?: number;
        maxRating?: number;
        startDate?: Date;
        endDate?: Date;
        wineName?: string;
        producer?: string;
    }, options?: {
        limitCount?: number;
        orderByField?: 'tastingDate' | 'createdAt' | 'rating';
        orderDirection?: 'asc' | 'desc';
    }): Promise<TastingRecord[]>;
    /**
     * ユーザーのテイスティング統計
     */
    getUserStatistics(userId: string): Promise<{
        totalRecords: number;
        averageRating: number;
        favoriteCountry: string | null;
        favoriteType: string | null;
        recordsByMonth: {
            [key: string]: number;
        };
        ratingDistribution: {
            [key: string]: number;
        };
    }>;
    /**
     * 類似ワインの検索（重複検出用）
     */
    findSimilarWines(userId: string, searchCriteria: {
        wineName: string;
        producer: string;
        vintage?: number;
    }): Promise<WineMatch[]>;
    /**
     * ワイン名で検索
     */
    searchWines(searchTerm: string, userId?: string): Promise<PopularWine[]>;
    /**
     * ユーザー統計情報を取得
     */
    getUserStats(userId: string): Promise<{
        totalRecords: number;
        averageRating: number;
        favoriteCountries: Array<{
            country: string;
            count: number;
        }>;
        favoriteTypes: Array<{
            type: string;
            count: number;
        }>;
        monthlyRecords: Array<{
            month: string;
            count: number;
        }>;
        ratingDistribution: Array<{
            range: string;
            count: number;
        }>;
        priceDistribution: Array<{
            range: string;
            count: number;
            avgRating: number;
        }>;
        recentActivity: Array<{
            date: string;
            count: number;
        }>;
    }>;
}
export declare const tastingRecordService: TastingRecordService;
export default tastingRecordService;
