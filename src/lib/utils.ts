/**
 * 二つの緯度経度間の直線距離（メートル）を計算する（ハバーシン公式）
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // 地球の半径 (メートル)
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // メートル単位
}

/**
 * 距離を人間が読みやすい文字列にフォーマットする
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Googleドライブなどの画像URLを最適化されたサムネイルURLに変換する
 */
export function getOptimizedImageUrl(url: string, size = 600): string {
    if (!url) return "";
    
    // Google Drive のプレビューURLをWebフレンドリーなサムネイルURLに変換
    if (url.includes("drive.google.com/uc") || url.includes("drive.google.com/open")) {
        const match = url.match(/id=([^&]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w${size}`;
        }
    }
    
    // 他の画像サービスやファイルパスはそのまま返す
    return url;
}

/**
 * 台湾のエリア（地域）定義
 */
export interface Area {
    id: string;
    name: string;
    keywords: string[];
    center: { lat: number; lng: number };
    zoom: number;
}

export const AREAS: Area[] = [
    { id: "all", name: "台湾全土", keywords: [], center: { lat: 23.6, lng: 121.0 }, zoom: 7.8 },
    { id: "taipei", name: "台北・桃園", keywords: ["台北", "新北", "基隆", "桃園"], center: { lat: 25.0330, lng: 121.5654 }, zoom: 12 },
    { id: "taichung", name: "台中", keywords: ["台中", "彰化", "南投", "苗栗"], center: { lat: 24.1477, lng: 120.6736 }, zoom: 12 },
    { id: "tainan", name: "台南・嘉義", keywords: ["台南", "嘉義", "雲林"], center: { lat: 23.0000, lng: 120.2000 }, zoom: 12 },
    { id: "kaohsiung", name: "高雄・屏東", keywords: ["高雄", "屏東"], center: { lat: 22.6273, lng: 120.3014 }, zoom: 12 },
    { id: "hualien", name: "宜蘭・花蓮・台東", keywords: ["花蓮", "宜蘭", "台東"], center: { lat: 23.9756, lng: 121.6046 }, zoom: 10 },
];

/**
 * 店舗の住所から属するエリアIDを判定する（緯度経度によるフォールバック付き）
 */
export function getStoreAreaId(store: { addressJP?: string; addressCH?: string; lat?: number; lng?: number }): string {
    const address = `${store.addressCH || ""} ${store.addressJP || ""}`.toLowerCase();
    for (const area of AREAS) {
        if (area.id === "all") continue;
        if (area.keywords.some(keyword => address.includes(keyword.toLowerCase()))) {
            return area.id;
        }
    }

    // フォールバック: 緯度経度から大まかなエリアを判定する
    if (store.lat !== undefined && store.lng !== undefined) {
        const lat = store.lat;
        const lng = store.lng;
        if (lat > 24.8) return "taipei"; // 台北・桃園
        if (lat > 23.8 && lat <= 24.8 && lng < 121.2) return "taichung"; // 台中
        if (lat > 22.9 && lat <= 23.8 && lng < 120.6) return "tainan"; // 台南・嘉義
        if (lat <= 22.9 && lng < 120.9) return "kaohsiung"; // 高雄・屏東
        if (lng >= 120.9) return "hualien"; // 東部（宜蘭・花蓮・台東）
    }

    return "other"; // 該当しない場合
}

