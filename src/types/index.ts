export interface Store {
    id: string;
    nameJP: string;
    nameCH: string;
    descriptionJP?: string;
    descriptionCH?: string;
    lat: number;
    lng: number;
    genres: string[]; // Up to 4
    images: string[]; // Up to 6
    videos: string[]; // YouTube links, up to 5
    customIconUrl?: string;
    addressJP?: string;
    addressCH?: string;
    website?: string;
    instagram?: string;
    buyUrl?: string;
}

export interface Genre {
    id: string;
    nameJP: string;
    nameCH: string;
    iconUrl: string; // Used for the emoji/icon string
    color: string;   // Hex color for background
}

export interface UserStats {
    visited: string[]; // IDs
    favorites: string[]; // IDs
}
