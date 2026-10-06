"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Store, Genre, UserStats } from "@/types";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Heart, CheckCircle, MapPin, Share2, Volume2, VolumeX, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Shuffle, ExternalLink, Play, Pause } from "lucide-react";
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

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
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

// Fallback YouTube shorts videos in case a store has no videos
const FALLBACK_VIDEOS = [
  "q89udmofdgo", // ローゼルもパテ・ド・フリュイも知らない (台湾東部 特産品)
  "HTOz-agz2Fo", // ロゼルを宇宙人に例えてゴメン① (台東県農会)
  "RkEXbz9G9IA", // ロゼルを宇宙人に例えてゴメン② (台東県農会)
];

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
    stores.forEach((store, sIdx) => {
      let storeHasVideo = false;
      if (store.videos && store.videos.length > 0) {
        store.videos.forEach((vUrl, vIdx) => {
          const vId = getYouTubeId(vUrl);
          if (vId) {
            storeHasVideo = true;
            list.push({
              id: `${store.id}-${vId}-${vIdx}`,
              store,
              videoId: vId,
              videoIndex: vIdx,
            });
          }
        });
      }

      // If store has no video, assign one from fallback pool
      if (!storeHasVideo) {
        const fallbackId = FALLBACK_VIDEOS[sIdx % FALLBACK_VIDEOS.length];
        list.push({
          id: `${store.id}-${fallbackId}-0`,
          store,
          videoId: fallbackId,
          videoIndex: 0,
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
  const [isPlaying, setIsPlaying] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isWheelCooling = useRef(false);
  const isDragging = useRef(false);

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

  // Helper to post command to YouTube iframe safely
  const postToYouTube = useCallback((func: string, args: (string | number)[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      } catch (e) {
        console.error("Failed to post message to YouTube iframe", e);
      }
    }
  }, []);

  const handleNext = useCallback(() => {
    if (items.length <= 1) return;
    setDirection(1);
    setIsPlaying(true);
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  const handlePrev = useCallback(() => {
    if (items.length <= 1) return;
    setDirection(-1);
    setIsPlaying(true);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  // Audio Toggle with YouTube IFrame API via postMessage
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        postToYouTube("mute", []);
      } else {
        postToYouTube("unMute", []);
        postToYouTube("setVolume", [100]);
        postToYouTube("playVideo", []);
      }

      toast.success(next ? "音声をミュートしました" : "音声をオンにしました", {
        icon: next ? "🔇" : "🔊",
        style: {
          borderRadius: "1rem",
          background: "#5D4037",
          color: "#fff",
          fontWeight: "bold",
        },
      });
      return next;
    });
  }, [postToYouTube]);

  // Play / Pause Toggle
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (next) {
        postToYouTube("playVideo", []);
      } else {
        postToYouTube("pauseVideo", []);
      }
      return next;
    });
  }, [postToYouTube]);

  // When changing video, keep unmuted if user enabled sound
  const handleIframeLoad = useCallback(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "listening" }),
          "*"
        );
      } catch (e) {}
    }
    if (!isMuted) {
      setTimeout(() => {
        postToYouTube("unMute", []);
        postToYouTube("setVolume", [100]);
        postToYouTube("playVideo", []);
      }, 500);
    }
  }, [isMuted, postToYouTube]);

  // Listen to YouTube player state changes
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        if (typeof e.data === "string") {
          const data = JSON.parse(e.data);
          if (data.event === "onStateChange") {
            if (data.info === 1) setIsPlaying(true);
            if (data.info === 2) setIsPlaying(false);
          } else if (data.event === "infoDelivery" && data.info) {
            if (data.info.playerState === 1) setIsPlaying(true);
            if (data.info.playerState === 2) setIsPlaying(false);
          }
        }
      } catch (err) {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
      <div className="absolute top-0 inset-x-0 z-30 p-3 md:p-5 flex items-center justify-between text-white bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[11px] font-black tracking-wide shrink-0 whitespace-nowrap">
            <span className="text-pink-400">🎬</span>
            <span>スイーツリール</span>
          </div>
          {/* Video Counter with mini nav arrows */}
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shrink-0 whitespace-nowrap">
            <span className="text-[11px] font-black text-white/80">
              {currentIndex + 1} / {items.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Prev / Next Mini Controls in Header for quick access */}
          <button
            onClick={handlePrev}
            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/15 text-white active:scale-95"
            title="前の動画 (↑)"
          >
            <ChevronUp size={16} strokeWidth={2.5} />
          </button>
          <button
            onClick={handleNext}
            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/15 text-white active:scale-95"
            title="次の動画 (↓)"
          >
            <ChevronDown size={16} strokeWidth={2.5} />
          </button>

          {/* Mute Toggle */}
          <button
            onClick={handleToggleMute}
            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/15 text-white"
            title={isMuted ? "音声をオンにする" : "音声をミュート"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-pink-400" />}
          </button>

          {/* Shuffle Toggle */}
          <button
            onClick={handleShuffleToggle}
            className={`w-8 h-8 md:w-9 md:h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/15 ${
              isShuffled ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30" : "bg-white/15 hover:bg-white/25 text-white"
            }`}
            title={isShuffled ? "シャッフル中" : "シャッフル再生"}
          >
            <Shuffle size={15} />
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/20 hover:bg-pink-500 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/15 text-white ml-1"
            title="閉じる (Esc)"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Main Reel Card Container */}
      <div className="relative w-full h-full max-w-md max-h-[88vh] md:max-h-[85vh] flex items-center justify-center overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/10 bg-black">
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
            onDragStart={() => {
              isDragging.current = true;
            }}
            onDragEnd={(e, info) => {
              setTimeout(() => {
                isDragging.current = false;
              }, 150);
              handleDragEnd(e, info);
            }}
            className="absolute inset-0 w-full h-full flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing"
          >
            {/* Embedded YouTube Player (with official YT API, native controls, and postMessage) */}
            <div
              onClick={() => {
                if (!isDragging.current) {
                  handleTogglePlay();
                }
              }}
              className="absolute inset-0 w-full h-full bg-black flex items-center justify-center pointer-events-auto cursor-pointer"
            >
              <iframe
                id={`yt-player-${currentItem.id}`}
                ref={iframeRef}
                key={currentItem.id}
                src={`https://www.youtube.com/embed/${currentItem.videoId}?autoplay=1&mute=1&controls=1&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&enablejsapi=1`}
                onLoad={handleIframeLoad}
                className="w-full h-full object-cover border-0 pointer-events-auto"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />

              {/* Floating Unmute Guide Button when muted */}
              <AnimatePresence>
                {isMuted && (
                  <motion.button
                    initial={{ opacity: 0, y: -15, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.9 }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMute();
                    }}
                    className="absolute top-16 md:top-20 z-30 px-5 py-2.5 rounded-full bg-pink-500/95 hover:bg-pink-600 text-white font-bold text-xs md:text-sm shadow-2xl backdrop-blur-md flex items-center gap-2 border border-white/20 active:scale-95 transition-all cursor-pointer pointer-events-auto hover:shadow-pink-500/50"
                  >
                    <Volume2 size={18} className="animate-pulse" />
                    <span>タップして音声を再生 🔊</span>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Pause Overlay indicator */}
              <AnimatePresence>
                {!isPlaying && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    className="absolute inset-0 m-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/60 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-2xl pointer-events-none z-10"
                  >
                    <Play size={32} fill="white" className="ml-1" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Action Bar (TikTok Style) - Raised up to prevent overlapping with bottom store card */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute right-3 bottom-[160px] md:bottom-[150px] z-20 flex flex-col items-center gap-2.5 md:gap-3 pointer-events-auto"
            >
              {/* Prev Video Button - Spaced out from store action buttons */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer mb-3 md:mb-4"
                title="前の動画 (↑)"
              >
                <ChevronUp size={22} strokeWidth={2.5} />
              </button>

              {/* Subtle visual separator */}
              <div className="w-5 h-[1.5px] bg-white/25 mb-1.5 md:mb-2" />

              {/* Favorite Button */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStat("favorites", store.id);
                }}
                className="flex flex-col items-center gap-0.5 group cursor-pointer"
                title="御用達店に登録"
              >
                <div
                  className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-all duration-300 border ${
                    isFav
                      ? "bg-pink-500 text-white border-pink-400 scale-105 shadow-pink-500/40"
                      : "bg-black/60 text-white border-white/20 hover:bg-black/80 hover:scale-105"
                  }`}
                >
                  <Heart size={18} fill={isFav ? "currentColor" : "none"} strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-black text-white drop-shadow-md">
                  {isFav ? "登録中" : "保存"}
                </span>
              </button>

              {/* Visited / Wishlist Button */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStat("visited", store.id);
                }}
                className="flex flex-col items-center gap-0.5 group cursor-pointer"
                title="行ってみたいリストに登録"
              >
                <div
                  className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-all duration-300 border ${
                    isVis
                      ? "bg-orange-500 text-white border-orange-400 scale-105 shadow-orange-500/40"
                      : "bg-black/60 text-white border-white/20 hover:bg-black/80 hover:scale-105"
                  }`}
                >
                  <CheckCircle size={18} strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-black text-white drop-shadow-md">
                  {isVis ? "行きたい" : "行きたい"}
                </span>
              </button>

              {/* View on Map Button */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewOnMap(store);
                  onClose();
                }}
                className="flex flex-col items-center gap-0.5 group cursor-pointer"
                title="地図上で位置を確認"
              >
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md shadow-lg flex items-center justify-center transition-all hover:scale-105 hover:text-pink-400">
                  <MapPin size={18} />
                </div>
                <span className="text-[9px] font-black text-white drop-shadow-md">地図</span>
              </button>

              {/* Share Button */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="flex flex-col items-center gap-0.5 group cursor-pointer"
                title="お店をシェア"
              >
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md shadow-lg flex items-center justify-center transition-all hover:scale-105 hover:text-orange-400">
                  <Share2 size={16} />
                </div>
                <span className="text-[9px] font-black text-white drop-shadow-md">共有</span>
              </button>

              {/* Subtle visual separator */}
              <div className="w-5 h-[1.5px] bg-white/25 mt-1.5 md:mt-2" />

              {/* Next Video Button - Spaced out from store action buttons */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer mt-3 md:mt-4"
                title="次の動画 (↓)"
              >
                <ChevronDown size={22} strokeWidth={2.5} />
              </button>
            </div>

            {/* Bottom Store Info Card Overlay - Well clear of the raised action buttons */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute bottom-0 inset-x-0 z-20 p-4 pb-5 bg-gradient-to-t from-black/95 via-black/75 to-transparent pointer-events-auto"
            >
              <div className="space-y-2">
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
                <h3 className="text-base md:text-lg font-black text-white leading-tight drop-shadow-md truncate">
                  {store.nameJP}
                </h3>

                {/* Short snippet/description */}
                {store.descriptionJP && (
                  <p className="text-xs text-white/80 line-clamp-2 leading-relaxed drop-shadow">
                    {store.descriptionJP}
                  </p>
                )}

                {/* Action Button: Full width single primary button (No redundant Map button here) */}
                <div className="pt-1.5 flex items-center gap-2">
                  <button
                    onClick={() => {
                      onStoreSelect(store);
                      onClose();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 via-pink-400 to-orange-400 hover:opacity-95 text-white text-xs font-black shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer"
                  >
                    <span>お店に入る（詳細・写真）</span>
                    <span className="text-sm">➔</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop Left / Right Navigation Arrows (PC only - placed on left & right sides of video) */}
      <button
        onClick={handlePrev}
        className="hidden md:flex absolute left-4 lg:left-10 xl:left-24 top-1/2 -translate-y-1/2 z-40 w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-2xl group"
        title="前の動画 (← / ↑)"
      >
        <ChevronLeft size={28} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
      </button>

      <button
        onClick={handleNext}
        className="hidden md:flex absolute right-4 lg:right-10 xl:right-24 top-1/2 -translate-y-1/2 z-40 w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-2xl group"
        title="次の動画 (→ / ↓)"
      >
        <ChevronRight size={28} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}
