"use client";

import { useState, useEffect } from "react";
import { X, Share, PlusSquare, MoreVertical, Smartphone, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PWAInstallGuide() {
    const [show, setShow] = useState(false);
    const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

    useEffect(() => {
        // Check if already in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        if (isStandalone) return;

        // Detect platform
        const ua = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) {
            setPlatform("ios");
        } else if (/android/.test(ua)) {
            setPlatform("android");
        }

        // Show guide after a short delay if on mobile
        const timer = setTimeout(() => {
            if (/iphone|ipad|ipod|android/.test(ua)) {
                setShow(true);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    if (!show) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 pointer-events-none">
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-2 border-white pointer-events-auto overflow-hidden"
                >
                    <div className="p-6 md:p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-pastel-pink rounded-2xl flex items-center justify-center text-white shadow-sm">
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-sweet-brown tracking-tighter leading-tight">アプリとして追加</h3>
                                    <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Install as App</p>
                                </div>
                            </div>
                            <button onClick={() => setShow(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <p className="text-sm font-medium text-sweet-brown/80 leading-relaxed">
                                ホーム画面に追加すると、フルスクリーンでサクサク快適に動作します！
                            </p>

                            <div className="bg-gray-50 rounded-3xl p-5 space-y-4">
                                {platform === "ios" ? (
                                    <>
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
                                                <Share size={16} />
                                            </div>
                                            <p className="text-xs font-bold text-sweet-brown pt-1">
                                                1. 画面下の<span className="text-blue-600">「共有ボタン」</span>をタップ
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-gray-700 shrink-0 shadow-sm">
                                                <PlusSquare size={16} />
                                            </div>
                                            <p className="text-xs font-bold text-sweet-brown pt-1">
                                                2. <span className="text-gray-800">「ホーム画面に追加」</span>を選択
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
                                                <MoreVertical size={16} />
                                            </div>
                                            <p className="text-xs font-bold text-sweet-brown pt-1">
                                                1. 右上の<span className="text-gray-800">「メニューボタン」</span>をタップ
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
                                                <Download size={16} />
                                            </div>
                                            <p className="text-xs font-bold text-sweet-brown pt-1">
                                                2. <span className="text-blue-600">「アプリをインストール」</span>を選択
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setShow(false)}
                            className="w-full mt-6 py-4 bg-sweet-brown text-white font-black rounded-2xl shadow-lg hover:bg-sweet-brown/90 transition-all uppercase tracking-widest text-xs"
                        >
                            わかった！
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
