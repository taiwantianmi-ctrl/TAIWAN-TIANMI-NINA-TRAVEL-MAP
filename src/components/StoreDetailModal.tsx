"use client";

import { Store, UserStats } from "@/types";
import { X, Heart, CheckCircle, MapPin, Youtube, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface StoreDetailModalProps {
    store: Store | null;
    onClose: () => void;
    userStats: UserStats;
    onToggleStat: (type: "visited" | "favorites", id: string) => void;
}

export function StoreDetailModal({ store, onClose, userStats, onToggleStat }: StoreDetailModalProps) {
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    if (!store) return null;

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
                    className="relative bg-white w-full max-w-2xl max-h-[92vh] md:max-h-[90vh] rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border-4 border-white"
                >
                    {/* Header Image Area */}
                    <div className="relative h-48 md:h-80 bg-gray-100 flex-shrink-0">
                        {store.images && store.images.length > 0 ? (
                            <>
                                <img
                                    src={store.images[activeImageIndex]}
                                    alt={store.nameJP}
                                    className="w-full h-full object-cover"
                                />
                                {store.images.length > 1 && (
                                    <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 opacity-0 hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : store.images.length - 1)); }}
                                            className="w-8 h-8 md:w-10 md:h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg text-sweet-brown hover:bg-white"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setActiveImageIndex((prev) => (prev < store.images.length - 1 ? prev + 1 : 0)); }}
                                            className="w-8 h-8 md:w-10 md:h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg text-sweet-brown hover:bg-white"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                )}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {store.images.map((_, i) => (
                                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImageIndex ? "bg-white w-4" : "bg-white/50"}`} />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                                <MapPin size={48} strokeWidth={1} />
                                <span className="text-xs font-bold uppercase tracking-widest">No Images Available</span>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur rounded-2xl shadow-lg flex items-center justify-center text-sweet-brown hover:text-pink-500 transition-colors"
                        >
                            <X size={24} />
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
