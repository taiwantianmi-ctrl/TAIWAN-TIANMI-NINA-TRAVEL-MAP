"use client";

import { Store, UserStats } from "@/types";
import { X, Heart, CheckCircle, MapPin, Youtube, ExternalLink, ChevronLeft, ChevronRight, Image as ImageIcon, Globe, Instagram, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { calculateDistance, formatDistance, getOptimizedImageUrl } from "@/lib/utils";

interface StoreDetailModalProps {
    store: Store | null;
    onClose: () => void;
    userStats: UserStats;
    onToggleStat: (type: "visited" | "favorites", id: string) => void;
    userLocation?: { lat: number; lng: number } | null;
}

export function StoreDetailModal({ store, onClose, userStats, onToggleStat, userLocation }: StoreDetailModalProps) {
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<"intro" | "story">("intro");
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Reset tab state when store changes to prevent state leakage
    useEffect(() => {
        if (store) {
            setActiveTab(store.descriptionJP ? "intro" : "story");
        }
    }, [store]);

    if (!store) return null;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!scrollContainerRef.current) return;
        const width = scrollContainerRef.current.offsetWidth;
        const index = Math.round(e.currentTarget.scrollLeft / width);
        if (index !== activeImageIndex) {
            setActiveImageIndex(index);
        }
    };

    const scrollToImage = (index: number) => {
        if (!scrollContainerRef.current) return;
        const width = scrollContainerRef.current.offsetWidth;
        scrollContainerRef.current.scrollTo({
            left: index * width,
            behavior: "smooth"
        });
    };

    const isFavorite = userStats.favorites.includes(store.id);
    const isVisited = userStats.visited.includes(store.id);

    const t = {
        favoriteAdd: "ワタシの御用達店",
        favoriteRemove: "御用達店から外す",
        visitedAdd: "行ってみたい！",
        visitedRemove: "行きたいリスト追加済！",
        buy: "商品を購入する",
        website: "公式サイト",
        instagram: "Instagram",
        route: "Google Maps でルート検索",
        noImages: "画像がありません",
        description: "店舗情報",
        youtube: "YouTube スニペット"
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 md:p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-sweet-brown/20 backdrop-blur-md"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="relative bg-white/95 backdrop-blur-2xl w-full max-w-lg max-h-[85vh] rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_30px_80px_rgba(93,64,55,0.18)] overflow-hidden flex flex-col border-4 border-white/80"
                >
                    {/* Header Image Area */}
                    <div className="relative h-48 md:h-64 bg-gray-100 flex-shrink-0 group overflow-hidden">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {store.images && store.images.length > 0 ? (
                                <motion.div
                                    key={activeImageIndex}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className="absolute inset-0 bg-black flex items-center justify-center"
                                >
                                    <img
                                        src={getOptimizedImageUrl(store.images[activeImageIndex], 1000)}
                                        alt={`${store.nameJP} ${activeImageIndex + 1}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            if (target.src.includes('unsplash.com')) return;
                                            target.src = "https://images.unsplash.com/photo-1559181567-c3190ca9959b?auto=format&fit=crop&q=80&w=800";
                                            target.classList.add("opacity-60", "grayscale-[0.5]");
                                        }}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-3 bg-gradient-to-br from-white to-gray-50"
                                >
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center shadow-inner">
                                        <ImageIcon size={32} className="text-gray-200" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{t.noImages}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Premium Navigation Arrows */}
                        {store.images && store.images.length > 1 && (
                            <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveImageIndex(prev => prev > 0 ? prev - 1 : store.images.length - 1);
                                    }}
                                    className="w-8 h-8 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg text-pink-500 hover:text-pink-600 transition-all pointer-events-auto border border-white/50 cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" strokeWidth={3} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveImageIndex(prev => prev < store.images.length - 1 ? prev + 1 : 0);
                                    }}
                                    className="w-8 h-8 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg text-pink-500 hover:text-pink-600 transition-all pointer-events-auto border border-white/50 cursor-pointer"
                                >
                                    <ChevronRight className="w-4 h-4 md:w-6 md:h-6" strokeWidth={3} />
                                </motion.button>
                            </div>
                        )}

                        {/* Page Indicators */}
                        {store.images && store.images.length > 1 && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 px-3 py-2 bg-black/30 backdrop-blur-md rounded-2xl ring-1 ring-white/20">
                                {store.images.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveImageIndex(i)}
                                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeImageIndex ? "bg-white w-5" : "bg-white/40 hover:bg-white/60"}`}
                                    />
                                ))}
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="absolute top-3 right-3 md:top-6 md:right-6 w-8 h-8 md:w-12 md:h-12 bg-white/90 backdrop-blur-md rounded-xl md:rounded-2xl shadow-xl flex items-center justify-center text-sweet-brown hover:text-pink-500 transition-all duration-300 z-10 cursor-pointer border border-white/50"
                        >
                            <X className="w-4 h-4 md:w-6 md:h-6" strokeWidth={2.5} />
                        </motion.button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-8 scrollbar-none">
                        <div className="space-y-2">
                            <h2 className="text-2xl md:text-3xl font-black text-sweet-brown tracking-tighter leading-none">
                                {store.nameJP}
                            </h2>
                            <div className="flex items-center gap-2 flex-wrap">
                                {userLocation && (
                                    <span className="text-[10px] font-black text-pink-500 bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-100/50 flex items-center gap-1">
                                        📍 {formatDistance(calculateDistance(userLocation.lat, userLocation.lng, store.lat, store.lng))}
                                    </span>
                                )}
                                {(store.addressJP || store.addressCH) && (
                                    <span className="text-[10px] font-black text-sweet-brown bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100 flex items-center gap-1">
                                        🏠 {store.addressJP || store.addressCH}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 md:gap-3">
                            <motion.button
                                whileHover={{ y: -2, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onToggleStat("favorites", store.id)}
                                className={`flex-1 min-w-[120px] py-3.5 rounded-2xl border-2 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${isFavorite ? "bg-pink-400 border-pink-400 text-white shadow-lg shadow-pink-100" : "bg-white border-pink-100 text-pink-400 hover:bg-pink-50/50"}`}
                            >
                                <Heart size={16} fill={isFavorite ? "currentColor" : "none"} /> {isFavorite ? t.favoriteRemove : t.favoriteAdd}
                            </motion.button>
                            <motion.button
                                whileHover={{ y: -2, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onToggleStat("visited", store.id)}
                                className={`flex-1 min-w-[120px] py-3.5 rounded-2xl border-2 font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${isVisited ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-100" : "bg-white border-orange-100 text-orange-500 hover:bg-orange-50/50"}`}
                            >
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${isVisited ? "bg-white text-orange-500" : "bg-orange-500 text-white"}`}>✓</div>
                                {isVisited ? t.visitedRemove : t.visitedAdd}
                            </motion.button>
                        </div>

                        {/* Tab Content Container (Watercolor Notebook Style) */}
                        {(store.descriptionJP || store.descriptionCH) && (
                            <div className="relative mt-2">
                                {/* Tabs Header (Index Tags protruding from the top) - Only if both exist */}
                                {store.descriptionJP && store.descriptionCH ? (
                                    <div className="flex gap-1.5 pl-6 -mb-[2px] relative z-10">
                                        <button
                                            onClick={() => setActiveTab("intro")}
                                            className={`px-5 py-2.5 text-xs md:text-sm font-black rounded-t-2xl border-2 border-b-0 transition-all cursor-pointer ${
                                                activeTab === "intro" 
                                                    ? "bg-[#7A5C51] border-[#7A5C51] text-white translate-y-0 shadow-sm" 
                                                    : "bg-[#EADAC2]/40 border-[#EADAC2] text-[#7A5C51]/80 hover:text-[#7A5C51] translate-y-0.5 hover:bg-[#EADAC2]/60"
                                            }`}
                                        >
                                            店舗情報
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("story")}
                                            className={`px-5 py-2.5 text-xs md:text-sm font-black rounded-t-2xl border-2 border-b-0 transition-all cursor-pointer ${
                                                activeTab === "story" 
                                                    ? "bg-[#7A5C51] border-[#7A5C51] text-white translate-y-0 shadow-sm" 
                                                    : "bg-[#EADAC2]/40 border-[#EADAC2] text-[#7A5C51]/80 hover:text-[#7A5C51] translate-y-0.5 hover:bg-[#EADAC2]/60"
                                            }`}
                                        >
                                            キュレーターボイス
                                        </button>
                                    </div>
                                ) : null}

                                {/* Tab Body Container (Watercolor style) */}
                                <div className={`p-4 md:p-8 bg-[#FDF8F2] rounded-[2rem] border-2 border-[#EADAC2] border-l-8 border-l-[#E2A69A]/80 shadow-[0_15px_35px_rgba(218,185,150,0.12),_inset_0_0_24px_rgba(255,255,255,0.4)] ${store.descriptionJP && store.descriptionCH ? "rounded-tl-none" : ""}`}>
                                    {/* Small title header if only one description exists */}
                                    {!(store.descriptionJP && store.descriptionCH) && (
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-3">
                                            {activeTab === "intro" ? t.description : "キュレーターボイス"}
                                        </h3>
                                    )}

                                    <div className="min-h-[80px]">
                                        {activeTab === "intro" && store.descriptionJP && (
                                            <div className="space-y-3">
                                                {store.descriptionJP.split('\n').map((line, idx) => 
                                                    line.trim() === '' ? (
                                                        <div key={idx} className="h-2" />
                                                    ) : (
                                                        <p key={idx} className="text-[#5D4037] leading-loose text-[11px] md:text-sm font-medium">
                                                            {line}
                                                        </p>
                                                    )
                                                )}
                                            </div>
                                        )}
                                        {activeTab === "story" && store.descriptionCH && (
                                            <div className="space-y-3">
                                                {store.descriptionCH.split('\n').map((line, idx) => 
                                                    line.trim() === '' ? (
                                                        <div key={idx} className="h-2" />
                                                    ) : (
                                                        <p key={idx} className="text-[#5D4037] leading-loose text-[11px] md:text-sm font-medium">
                                                            {line}
                                                        </p>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {(store.website || store.instagram || store.buyUrl) && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {store.buyUrl && (
                                    <motion.a
                                        whileHover={{ y: -2, scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        href={store.buyUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full px-6 py-4 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-3 hover:opacity-95 transition-all shadow-lg shadow-orange-100 mb-2 cursor-pointer"
                                    >
                                        <ShoppingBag size={20} /> {t.buy}
                                    </motion.a>
                                )}
                                {store.website && (
                                    <motion.a
                                        whileHover={{ y: -1, scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        href={store.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-100/85 transition-colors cursor-pointer border border-blue-100/50"
                                    >
                                        <Globe size={14} /> {t.website}
                                    </motion.a>
                                )}
                                {store.instagram && (
                                    <motion.a
                                        whileHover={{ y: -1, scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        href={store.instagram}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-gradient-to-tr from-yellow-50 via-pink-50 to-purple-50 text-pink-600 rounded-xl text-xs font-black flex items-center gap-2 hover:opacity-90 transition-opacity border border-pink-100/40 cursor-pointer"
                                    >
                                        <Instagram size={14} /> {t.instagram}
                                    </motion.a>
                                )}
                            </div>
                        )}

                        {(store.videos && store.videos.length > 0 && store.videos.some(v => v)) && (
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t.youtube}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {store.videos.map((v, i) => {
                                        if (!v) return null;
                                        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
                                        const match = v.match(regExp);
                                        const videoId = (match && match[2].length === 11) ? match[2] : null;

                                        if (!videoId) return null;

                                        return (
                                            <div key={i} className="aspect-video rounded-2xl overflow-hidden bg-black border-4 border-white shadow-xl">
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&vq=hd720`}
                                                    className="w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                    allowFullScreen
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="pt-4">
                            <motion.a
                                whileHover={{ y: -2, scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 bg-sweet-brown text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 hover:bg-sweet-brown/95 transition-all uppercase tracking-widest text-xs cursor-pointer border border-sweet-brown"
                            >
                                <ExternalLink size={18} /> {t.route}
                            </motion.a>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
