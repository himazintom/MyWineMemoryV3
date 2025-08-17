interface StatsChartsProps {
    monthlyRecords: Array<{
        month: string;
        count: number;
    }>;
    favoriteCountries: Array<{
        country: string;
        count: number;
    }>;
    favoriteTypes: Array<{
        type: string;
        count: number;
    }>;
    ratingDistribution: Array<{
        range: string;
        count: number;
    }>;
    recentActivity: Array<{
        date: string;
        count: number;
    }>;
}
export default function StatsCharts({ monthlyRecords, favoriteCountries, favoriteTypes, ratingDistribution, recentActivity }: StatsChartsProps): any;
export {};
