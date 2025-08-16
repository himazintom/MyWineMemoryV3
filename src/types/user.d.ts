export interface User {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: Date;
    updatedAt: Date;
    preferences?: UserPreferences;
    subscription?: UserSubscription;
}
export interface UserPreferences {
    theme: 'light' | 'dark' | 'auto';
    language: 'ja' | 'en';
    notifications: {
        push: boolean;
        email: boolean;
        streakReminder: boolean;
        quizReminder: boolean;
        heartRecovery: boolean;
    };
    privacy: {
        publicProfile: boolean;
        publicRecords: boolean;
        showPrices: boolean;
    };
}
export interface UserSubscription {
    plan: 'free' | 'premium';
    status: 'active' | 'canceled' | 'past_due';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
}
export interface UserStats {
    totalRecords: number;
    totalWines: number;
    averageRating: number;
    favoriteCountry?: string;
    favoriteType?: string;
    level: number;
    xp: number;
    badges: string[];
    streak: number;
    lastActivityDate: Date;
}
