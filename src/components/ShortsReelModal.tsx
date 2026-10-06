"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Store, Genre, UserStats } from "@/types";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Heart, CheckCircle, MapPin, Share2, Volume2, VolumeX, ChevronUp, ChevronDown, Shuffle, ExternalLink } from "lucide-react";
import { calculateDistance, formatDistance } from "@/lib/utils";
import { toast } from "react-hot-toast";

interface ShortsReelModalProps {
  stores: Store[];
  genres: Genre[];
  userStats: UserStats;
  onClose: () => void;
  onStoreSelect: (store: Store) => void;
  onViewOnMap: (store: Store) => void;
  onToggleStat: (type: "visited" | "favorites", id: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  initialStoreId?: string;
}

interface ReelItem {
  id: string;
  store: Store;
  videoId: string;
  videoIndex: number;
}

function getYouTubeId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/);
  return match && match[2].length === 11 ? match[2] : null;
}

export function ShortsReelModal({
  stores,
  genres,
  userStats,
  onClose,
  onStoreSelect,
  onViewOnMap,
  onToggleStat,
  userLocation,
  initialStoreId,
}: ShortsReelModalProps) {
  // 1. Build flattened list of videos across all stores
  const rawItems = useMemo<ReelItem[]>(() => {
    const list: ReelItem[] = [];
    stores.forEach((store) => {
      if (store.videos && store.videos.length > 0) {
        store.videos.forEach((vUrl, vIdx) => {
          const vId = getYouTubeId(vUrl);
          if (vId) {
            list.push({
              id: `${store.id}-${vId}`,
              store,
              videoId: vId,
              videoIndex: vIdx,
            });
          }
        });
      }
    });
    return list;
  }, [stores]);

  const [isShuffled, setIsShuffled] = useState(false);
  const [items, setItems] = useState<ReelItem[]>(rawItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isMuted, setIsMuted] = useState(true);
  const isWheelCooling = useRef(false);

  // Sync items when rawItems changes
  useEffect(() => {
    if (isShuffled) {
      const shuffled = [...rawItems].sort(() => Math.random() - 0.5);
      setItems(shuffled);
    } else {
      setItems(rawItems);
    }
  }, [rawItems, isShuffled]);

  // Set initial store index if provided
  useEffect(() => {
    if (initialStoreId && items.length > 0) {
      const idx = items.findIndex((it) => it.store.id === initialStoreId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [initialStoreId, items]);

  const currentItem = items[currentIndex];

  const handleNext = useCallback(() => {
    if (items.length <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  const handlePrev = useCallback(() => {
    if (items.length <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  const handleShuffleToggle = () => {
    setIsShuffled((prev) => !prev);
    setCurrentIndex(0);
    toast.success(isShuffled ? "通常順に切り替えました" : "シャッフル再生に切り替えました", {
      icon: "🔀",
      style: {
        borderRadius: "1rem",
        background: "#5D4037",
        color: "#fff",
        fontWeight: "bold",
      },
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  // Mouse wheel navigation on PC
  const handleWheel = (e: React.WheelEvent) => {
    if (isWheelCooling.current) return;
    if (Math.abs(e.deltaY) > 40) {
      isWheelCooling.current = true;
      if (e.deltaY > 0) {
        handleNext();
      } else {
        handlePrev();
      }
      setTimeout(() => {
        isWheelCooling.current = false;
      }, 500);
    }
  };

  // Drag / Swipe handling
  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 60;
    const velocity = 200;
    if (info.offset.y < -threshold || info.velocity.y < -velocity) {
      handleNext();
    } else if (info.offset.y > threshold || info.velocity.y > velocity) {
      handlePrev();
    }
  };

  const handleShare = () => {
    if (!currentItem) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?favs=${currentItem.store.id}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success(`「${currentItem.store.nameJP}」のリンクをコピーしました！`, {
          icon: "🔗",
          style: {
            borderRadius: "1rem",
            background: "#5D4037",
            color: "#fff",
            fontWeight: "bold",
          },
        });
      })
      .catch(() => toast.error("リンクのコピーに失敗しました"));
  };

  if (!currentItem) {
    return (
      <div className="fixed inset-0 z-[90] bg-black/90 flex flex-col items-center justify-center text-white p-6">
        <p className="text-lg font-bold mb-4">動画が登録されている店舗がありません</p>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold transition-all"
        >
          地図に戻る
        </button>
      </div>
    );
  }

  const store = currentItem.store;
  const isFav = userStats.favorites.includes(store.id);
  const isVis = userStats.visited.includes(store.id);
  const genre = store.genres?.[0] ? genres.find((g) => g.id === store.genres[0]) : null;

  return (
    <div
      onWheel={handleWheel}
      className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-xl flex items-center justify-center select-none overflow-hidden"
    >
      {/* Background Ambience Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute -top-[20%] -left-[20%] w-[70vw] h-[70vw] bg-pink-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[20%] w-[70vw] h-[70vw] bg-orange-500/20 rounded-full blur-[120px]" />
      </div>

      {/* Top Header Bar */}
      <div className="absolute top-0 inset-x-0 z-30 p-4 md:p-6 flex items-center justify-between text-white bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-black tracking-wide">
            <span className="text-pink-400">🎬</span>
            <span>スイーツリール</span>
          </div>
          <span className="text-xs font-black text-white/70 tracking-wider">
            {currentIndex + 1} / {items.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute Toggle */}
          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/10 text-white"
            title={isMuted ? "音声をオンにする" : "音声をミュート"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} className="text-pink-400" />}
          </button>

          {/* Shuffle Toggle */}
          <button
            onClick={handleShuffleToggle}
            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/10 ${
              isShuffled ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title={isShuffled ? "シャッフル中" : "シャッフル再生"}
          >
            <Shuffle size={18} />
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/10 text-white hover:text-pink-400 ml-1"
            title="閉じる (Esc)"
          >
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Main Reel Card Container */}
      <div className="relative w-full h-full max-w-md max-h-[92vh] md:max-h-[88vh] flex items-center justify-center overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/10 bg-black">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentItem.id}
            custom={direction}
            initial={{ opacity: 0, y: direction * 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction * -100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.25}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 w-full h-full flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing"
          >
            {/* Embedded YouTube Player */}
            <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center pointer-events-auto">
              <iframe
                key={`${currentItem.videoId}-${isMuted}`}
                src={`https://www.youtube.com/embed/${currentItem.videoId}?autoplay=1&mute=${
                  isMuted ? 1 : 0
                }&controls=1&modestbranding=1&loop=1&playlist=${currentItem.videoId}&playsinline=1&rel=0&iv_load_policy=3`}
                className="w-full h-full object-cover border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Click-through helper overlay for swipe detection if needed */}
            <div className="absolute top-16 left-0 right-16 bottom-40 z-10 pointer-events-none" />

            {/* Right Action Bar (TikTok Style) */}
            <div className="absolute right-3.5 bottom-28 z-20 flex flex-col items-center gap-4 pointer-events-auto">
              {/* Favorite Button */}
              <button
                onClick={() => onToggleStat("favorites", store.id)}
                className="flex flex-col items-center gap-1 group cursor-pointer"
                title="御用達店に登録"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-all duration-300 border ${
                    isFav
                      ? "bg-pink-500 text-white border-pink-400 scale-110 shadow-pink-500/40"
                      : "bg-black/50 text-white border-white/20 hover:bg-black/70 hover:scale-105"
                  }`}
                >
                  <Heart size={22} fill={isFav ? "currentColor" : "none"} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-white/90 drop-shadow">
                  {isFav ? "登録中" : "保存"}
                </span>
              </button>

              {/* Visited / Wishlist Button */}
              <button
                onClick={() => onToggleStat("visited", store.id)}
                className="flex flex-col items-center gap-1 group cursor-pointer"
                title="行ってみたいリストに登録"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-all duration-300 border ${
                    isVis
                      ? "bg-orange-500 text-white border-orange-400 scale-110 shadow-orange-500/40"
                      : "bg-black/50 text-white border-white/20 hover:bg-black/70 hover:scale-105"
                  }`}
                >
                  <CheckCircle size={22} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-white/90 drop-shadow">
                  {isVis ? "行きたい" : "行きたい"}
                </span>
              </button>

              {/* View on Map Button */}
              <button
                onClick={() => {
                  onViewOnMap(store);
                  onClose();
                }}
                className="flex flex-col items-center gap-1 group cursor-pointer"
                title="地図上で位置を確認"
              >
                <div className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/20 backdrop-blur-md shadow-lg flex items-center justify-center transition-all hover:scale-105 hover:text-pink-400">
                  <MapPin size={22} />
                </div>
                <span className="text-[10px] font-black text-white/90 drop-shadow">地図</span>
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="flex flex-col items-center gap-1 group cursor-pointer"
                title="お店をシェア"
              >
                <div className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/20 backdrop-blur-md shadow-lg flex items-center justify-center transition-all hover:scale-105 hover:text-orange-400">
                  <Share2 size={20} />
                </div>
                <span className="text-[10px] font-black text-white/90 drop-shadow">共有</span>
              </button>
            </div>

            {/* Bottom Store Info Card Overlay */}
            <div className="absolute bottom-0 inset-x-0 z-20 p-4 pb-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-auto">
              <div className="pr-16 space-y-2">
                {/* Badges: Genre & Distance */}
                <div className="flex items-center gap-2 flex-wrap">
                  {genre && (
                    <span
                      style={{ backgroundColor: genre.color ? `${genre.color}33` : "rgba(255,255,255,0.2)" }}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-white border border-white/20 flex items-center gap-1 shadow-sm backdrop-blur-md"
                    >
                      <span>{genre.iconUrl}</span>
                      <span>{genre.nameJP}</span>
                    </span>
                  )}
                  {userLocation && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-white/90 bg-white/15 backdrop-blur-md border border-white/10 flex items-center gap-1">
                      <span>📍</span>
                      <span>{formatDistance(calculateDistance(userLocation.lat, userLocation.lng, store.lat, store.lng))}</span>
                    </span>
                  )}
                </div>

                {/* Store Name */}
                <h3 className="text-lg md:text-xl font-black text-white leading-tight drop-shadow-md truncate">
                  {store.nameJP}
                </h3>

                {/* Short snippet/description */}
                {store.descriptionJP && (
                  <p className="text-xs text-white/80 line-clamp-2 leading-relaxed drop-shadow">
                    {store.descriptionJP}
                  </p>
                )}

                {/* Action Buttons Row */}
                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      onStoreSelect(store);
                      onClose();
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 via-pink-400 to-orange-400 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-pink-500/25 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <span>お店に入る</span>
                    <span>➔</span>
                  </button>

                  <button
                    onClick={() => {
                      onViewOnMap(store);
                      onClose();
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-black backdrop-blur-md border border-white/20 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                    title="地図で見る"
                  >
                    <MapPin size={14} className="text-pink-400" />
                    <span>地図</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop Floating Navigation Arrows (Side) */}
      <div className="hidden lg:flex flex-col gap-3 absolute right-8 top-1/2 -translate-y-1/2 z-30">
        <button
          onClick={handlePrev}
          className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-xl"
          title="前の動画 (↑)"
        >
          <ChevronUp size={24} strokeWidth={2.5} />
        </button>
        <button
          onClick={handleNext}
          className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-xl"
          title="次の動画 (↓)"
        >
          <ChevronDown size={24} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
