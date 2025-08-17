export interface Wine {
    id: string;
    name: string;
    producer: string;
    region: string;
    country: string;
    vintage: number;
    type: WineType;
    color: WineColor;
    alcoholContent: number;
    price?: number;
    purchaseDate?: Date;
    rating?: number;
    notes?: string;
    imageUrl?: string;
    tastingNotes?: TastingNotes;
    createdAt: Date;
    updatedAt: Date;
}
export interface TastingNotes {
    appearance?: string;
    aroma?: string;
    taste?: string;
    finish?: string;
    overall?: string;
}
export declare const WineType: {
    readonly RED: "red";
    readonly WHITE: "white";
    readonly ROSE: "rose";
    readonly SPARKLING: "sparkling";
    readonly FORTIFIED: "fortified";
    readonly DESSERT: "dessert";
};
export type WineType = typeof WineType[keyof typeof WineType];
export declare const WineColor: {
    readonly LIGHT: "light";
    readonly MEDIUM: "medium";
    readonly DEEP: "deep";
};
export type WineColor = typeof WineColor[keyof typeof WineColor];
export interface WineFilters {
    type?: WineType;
    country?: string;
    region?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    maxRating?: number;
    vintage?: number;
}
export interface PopularWine {
    wineName: string;
    producer: string;
    country: string;
    region?: string;
    type: WineType;
    color: WineColor;
    vintage?: number;
    alcoholContent?: number;
    price?: number;
    recordCount: number;
    averageRating: number;
    lastTasted: Date;
}
