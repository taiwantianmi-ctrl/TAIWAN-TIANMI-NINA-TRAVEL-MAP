"use client";

import { Store, UserStats } from "@/types";
import { X, Heart, CheckCircle, MapPin, Youtube, ExternalLink, ChevronLeft, ChevronRight, Image as ImageIcon, Globe, Instagram, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";

interface StoreDetailModalProps {
    store: Store | null;
    onClose: () => void;
    userStats: UserStats;
    onToggleStat: (type: "visited" | "favorites", id: string) => void;
}

export function StoreDetailModal({ store, onClose, userStats, onToggleStat }: StoreDetailModalProps) {
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 md:p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-sweet-brown/40 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative bg-white w-full max-w-lg max-h-[85vh] rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-4 border-white"
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
                                        src={store.images[activeImageIndex]}
                                        alt={`${store.nameJP} ${activeImageIndex + 1}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            // Prevent infinite loop if fallback also fails
                                            if (target.src.includes('unsplash.com')) return;

                                            // Professional food/sweet shop placeholder
                                            target.src = "https://images.unsplash.com/photo-1559181567-c3190ca9959b?auto=format&fit=crop&q=80&w=800";
                                            target.classList.add("opacity-60", "grayscale-[0.5]");
                                            console.warn("Image load failed, using fallback:", store.nameJP);
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
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">No Store Images</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Premium Navigation Arrows */}
                        {store.images && store.images.length > 1 && (
                            <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveImageIndex(prev => prev > 0 ? prev - 1 : store.images.length - 1);
                                    }}
                                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.3)] text-pink-500 hover:text-pink-600 hover:scale-110 active:scale-90 transition-all pointer-events-auto border-2 border-white ring-1 ring-black/5"
                                >
                                    <ChevronLeft size={32} strokeWidth={3} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveImageIndex(prev => prev < store.images.length - 1 ? prev + 1 : 0);
                                    }}
                                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.3)] text-pink-500 hover:text-pink-600 hover:scale-110 active:scale-90 transition-all pointer-events-auto border-2 border-white ring-1 ring-black/5"
                                >
                                    <ChevronRight size={32} strokeWidth={3} />
                                </button>
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

                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center text-sweet-brown hover:text-pink-500 hover:rotate-90 transition-all duration-300 z-10"
                        >
                            <X size={24} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 md:space-y-8 scrollbar-none">
                        <div className="space-y-2">
                            <h2 className="text-2xl md:text-4xl font-black text-sweet-brown tracking-tighter leading-none">{store.nameJP}</h2>
                            <p className="text-sm md:text-lg font-bold text-sweet-brown/40">{store.nameCH}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 md:gap-3">
                            <button
                                onClick={() => onToggleStat("favorites", store.id)}
                                className={`flex-1 min-w-[120px] py-3 md:py-4 rounded-2xl md:rounded-3xl border-2 font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${isFavorite ? "bg-pink-400 border-pink-400 text-white shadow-lg shadow-pink-100" : "bg-white border-pink-100 text-pink-400 hover:bg-pink-50"}`}
                            >
                                <Heart size={18} fill={isFavorite ? "currentColor" : "none"} /> {isFavorite ? "御用達店から外す" : "ワタシの御用達店"}
                            </button>
                            <button
                                onClick={() => onToggleStat("visited", store.id)}
                                className={`flex-1 min-w-[120px] py-3 md:py-4 rounded-2xl md:rounded-3xl border-2 font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${isVisited ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-100" : "bg-white border-orange-100 text-orange-500 hover:bg-orange-50"}`}
                            >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isVisited ? "bg-white text-orange-500" : "bg-orange-500 text-white"}`}>✓</div>
                                {isVisited ? "訪問済み！" : "行った！"}
                            </button>
                        </div>

                        {store.descriptionJP && (
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Description</h3>
                                <p className="text-sweet-brown/80 leading-relaxed text-sm md:text-base font-medium whitespace-pre-wrap">{store.descriptionJP}</p>
                            </div>
                        )}

                        {(store.website || store.instagram || store.buyUrl) && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {store.buyUrl && (
                                    <a
                                        href={store.buyUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full px-6 py-4 bg-orange-500 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-3 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-100 mb-2"
                                    >
                                        <ShoppingBag size={20} /> 商品を購入する
                                    </a>
                                )}
                                {store.website && (
                                    <a
                                        href={store.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-100 transition-colors"
                                    >
                                        <Globe size={14} /> Official Website
                                    </a>
                                )}
                                {store.instagram && (
                                    <a
                                        href={store.instagram}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-gradient-to-tr from-yellow-100 via-pink-100 to-purple-100 text-pink-600 rounded-xl text-xs font-black flex items-center gap-2 hover:opacity-80 transition-opacity"
                                    >
                                        <Instagram size={14} /> Instagram
                                    </a>
                                )}
                            </div>
                        )}

                        {(store.videos && store.videos.length > 0 && store.videos.some(v => v)) && (
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">YouTube Snippets</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {store.videos.map((v, i) => {
                                        if (!v) return null;
                                        // YouTube ID parsing logic including shorts support
                                        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
                                        const match = v.match(regExp);
                                        const videoId = (match && match[2].length === 11) ? match[2] : null;

                                        if (!videoId) return null;

                                        return (
                                            <div key={i} className="aspect-video rounded-2xl overflow-hidden bg-black border-4 border-white shadow-xl">
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
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
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 md:py-5 bg-sweet-brown text-white font-black rounded-2xl md:rounded-3xl shadow-xl flex items-center justify-center gap-3 hover:bg-sweet-brown/90 transition-all uppercase tracking-widest text-xs md:text-sm"
                            >
                                <ExternalLink size={20} /> Google Maps でルート検索
                            </a>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
