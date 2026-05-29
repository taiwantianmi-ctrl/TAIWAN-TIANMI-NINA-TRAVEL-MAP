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
