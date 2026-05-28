"use client";

import { useState, useEffect, useMemo } from "react";
import { useStores } from "@/hooks/useStores";
import { MapContainer } from "@/components/MapContainer";
import { StoreDetailModal } from "@/components/StoreDetailModal";
import { AdminPanel } from "@/components/AdminPanel";
import { PWAInstallGuide } from "@/components/PWAInstallGuide";
import { Store, UserStats } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plane, Heart, CheckCircle, Info, LayoutGrid, ChevronLeft, Search, Sparkles, Globe, Menu, MapPin, ArrowUpDown, Sliders, X } from "lucide-react";
import { calculateDistance, formatDistance, getOptimizedImageUrl } from "@/lib/utils";

export default function Home() {
  const { stores, genres, loading } = useStores();
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [showOnlyVisited, setShowOnlyVisited] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({ visited: [], favorites: [] });
  const [editingStore, setEditingStore] = useState<Partial<Store> | null>(null);
  const [googlePhotos, setGooglePhotos] = useState<string[]>([]);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [lang, setLang] = useState<"ja" | "zh">("ja");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [focusedStore, setFocusedStore] = useState<Store | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [bottomSheetState, setBottomSheetState] = useState<"collapsed" | "half" | "full">("collapsed");
  const [sortByDistance, setSortByDistance] = useState(false);
  const [activeTab, setActiveTab] = useState<"favorites" | "visited">("favorites");

  // Load language settings
  useEffect(() => {
    const savedLang = localStorage.getItem("taiwan_sweet_lang");
    if (savedLang === "ja" || savedLang === "zh") {
      setLang(savedLang);
    }
  }, []);

  // Monitor resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Save language settings to LocalStorage
  const handleLanguageChange = (newLang: "ja" | "zh") => {
    setLang(newLang);
    localStorage.setItem("taiwan_sweet_lang", newLang);
  };

  // Load user stats from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("taiwan_sweet_stats");
    if (saved) {
      try {
        setUserStats(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse user stats", e);
      }
    }
  }, []);

  // Load app settings (like logo)
  useEffect(() => {
    const { ref, onValue } = require("firebase/database");
    const { db } = require("@/lib/firebase");
    const logoRef = ref(db, "admin/logoUrl");
    onValue(logoRef, (snapshot: any) => {
      setAppLogoUrl(snapshot.val());
    });
  }, []);

  // Save user stats to LocalStorage
  const saveUserStats = (newStats: UserStats) => {
    setUserStats(newStats);
    localStorage.setItem("taiwan_sweet_stats", JSON.stringify(newStats));
  };

  const toggleStat = (type: "visited" | "favorites", id: string) => {
    const current = userStats[type];
    const updated = current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id];

    saveUserStats({ ...userStats, [type]: updated });
  };



  const toggleFilterGenre = (id: string) => {
    setSelectedGenreIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const resetApp = () => {
    setSelectedGenreIds([]);
    setShowOnlyVisited(false);
    setSelectedStore(null);
    setShowAdmin(false);
    setEditingStore(null);
    setShowGenreFilter(false);
  };

  let filteredStores = stores;
  if (selectedGenreIds.length > 0) {
    filteredStores = filteredStores.filter(store => store.genres?.some(gId => selectedGenreIds.includes(gId)));
  }
  if (showOnlyVisited) {
    filteredStores = filteredStores.filter(store => userStats.visited.includes(store.id));
  }

  // Distance sorting if GPS location is active
  const sortedStoresByDistance = useMemo(() => {
    if (!userLocation) return filteredStores;
    return [...filteredStores].sort((a, b) => {
      const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
      const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
      return distA - distB;
    });
  }, [filteredStores, userLocation, sortByDistance]);

  const finalStoresList = sortByDistance ? sortedStoresByDistance : filteredStores;

  // Common Genre Filter UI component to be reused
  const GenreFilterUI = ({ isPC = false }: { isPC?: boolean }) => (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`bg-gray-50 rounded-2xl md:rounded-[2rem] border-2 border-white shadow-sm overflow-hidden ${isPC ? 'h-full' : ''}`}
    >
      {isPC ? (
        <div className="h-full flex items-center p-3 md:px-6 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-pastel-pink/20 rounded-xl flex items-center justify-center text-pink-500">
              <LayoutGrid size={18} />
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest leading-none mb-1">Genre Filter</p>
              <p className="text-[10px] font-bold text-gray-400">マルチ選択可</p>
            </div>
          </div>

          <div className="flex-1 flex flex-wrap gap-1.5 overflow-y-auto max-h-[85px] scrollbar-none py-1">
            <button
              onClick={() => { setSelectedGenreIds([]); setShowOnlyVisited(false); }}
              className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border ${selectedGenreIds.length === 0 && !showOnlyVisited ? "bg-sweet-brown text-white border-sweet-brown" : "bg-white text-sweet-brown hover:bg-gray-100 border-gray-100"}`}
            >
              すべて
            </button>
            <button
              onClick={() => setShowOnlyVisited(!showOnlyVisited)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border ${showOnlyVisited ? "bg-orange-500 text-white border-orange-500 ring-2 ring-orange-200" : "bg-white text-orange-500 hover:bg-orange-50 border-orange-100"}`}
            >
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${showOnlyVisited ? "bg-white text-orange-500" : "bg-orange-500 text-white"}`}>✓</div>
              行ってみたい！
            </button>
            {genres.map(genre => (
              <button
                key={genre.id}
                onClick={() => toggleFilterGenre(genre.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border ${selectedGenreIds.includes(genre.id) ? "bg-pastel-pink text-white border-pastel-pink ring-2 ring-white/50" : "bg-white text-sweet-brown hover:bg-gray-100 border-gray-100"}`}
              >
                <div
                  style={{ backgroundColor: genre.color || "#ffffff" }}
                  className="w-4 h-4 rounded flex items-center justify-center text-[10px] shadow-sm border border-white/20"
                >
                  {genre.iconUrl}
                </div>
                {genre.nameJP}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Toggle Button for Mobile */}
          <button
            onClick={() => setShowGenreFilter(!showGenreFilter)}
            className="w-full flex items-center justify-between px-4 py-3 md:py-4 text-sweet-brown hover:bg-gray-50/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-pastel-pink/20 rounded-xl flex items-center justify-center text-pink-500">
                <LayoutGrid size={18} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest leading-none mb-1">Genre Filter</p>
                <p className="text-xs md:text-sm font-black tracking-tighter truncate max-w-[150px] md:max-w-md">
                  {selectedGenreIds.length > 0
                    ? `${genres.filter(g => selectedGenreIds.includes(g.id)).map(g => g.nameJP).join(", ")}`
                    : "すべてのジャンル"}
                </p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: showGenreFilter ? 90 : -90 }}
              transition={{ duration: 0.3 }}
              className="text-gray-300"
            >
              <ChevronLeft size={20} />
            </motion.div>
          </button>

          {/* Expandable Content Layer */}
          <AnimatePresence>
            {showGenreFilter && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 md:p-4 border-t border-gray-100 flex flex-wrap gap-2 max-h-[40vh] overflow-y-auto scrollbar-none">
                  <button
                    onClick={() => { setSelectedGenreIds([]); setShowOnlyVisited(false); setShowGenreFilter(false); }}
                    className={`px-4 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all shadow-sm ${selectedGenreIds.length === 0 && !showOnlyVisited ? "bg-sweet-brown text-white" : "bg-gray-50 text-sweet-brown hover:bg-gray-100"}`}
                  >
                    すべて表示
                  </button>
                  <button
                    onClick={() => setShowOnlyVisited(!showOnlyVisited)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all shadow-sm border ${showOnlyVisited ? "bg-orange-500 text-white border-orange-500 ring-2 ring-orange-200" : "bg-gray-50 text-orange-500 hover:bg-orange-50 border-orange-100"}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${showOnlyVisited ? "bg-white text-orange-500" : "bg-orange-500 text-white"}`}>✓</div>
                    行ってみたい！
                  </button>
                  {genres.map(genre => (
                    <button
                      key={genre.id}
                      onClick={() => toggleFilterGenre(genre.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all shadow-sm ${selectedGenreIds.includes(genre.id) ? "bg-pastel-pink text-white ring-2 ring-white" : "bg-gray-50 text-sweet-brown hover:bg-gray-100"}`}
                    >
                      <div
                        style={{ backgroundColor: genre.color || "#ffffff" }}
                        className="w-4 h-4 rounded flex items-center justify-center text-[10px] shadow-sm border border-white/20"
                      >
                        {genre.iconUrl}
                      </div>
                      {genre.nameJP}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FFF9F9] relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pastel-pink/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pastel-blue/10 rounded-full blur-3xl animate-pulse" />

        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              ease: "easeInOut"
            }}
            className="w-24 h-24 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(255,193,204,0.3)] flex items-center justify-center border-4 border-pastel-pink text-pink-400 mb-8"
          >
            <Heart fill="currentColor" size={40} />
          </motion.div>

          <div className="flex flex-col items-center gap-2">
            <h2 className="text-xl font-black text-sweet-brown tracking-tighter">Nina's Sweet Travel Map</h2>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  className="w-2 h-2 bg-pastel-pink rounded-full"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getGenreInfo = (store: Store) => {
    if (store.genres && store.genres.length > 0) {
      const genre = genres.find(g => g.id === store.genres[0]);
      if (genre) return { icon: genre.iconUrl, color: genre.color || "#ffffff" };
    }
    return { icon: "🍡", color: "#FFB6C1" }; // Fallback
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-white flex flex-col">
      {/* Top Floating Controls */}
      <div className={`relative z-40 bg-white border-b border-gray-100 shadow-sm transition-all duration-300 ${isMobile ? 'p-3' : 'p-2 md:p-4'}`}>
        <div className="w-full flex items-center justify-between gap-4">
          {/* Left: Title & Logo */}
          <div 
            className="flex items-center gap-2 md:gap-4 pointer-events-auto cursor-pointer min-w-0"
            onClick={resetApp}
          >
            <div className={`bg-white rounded-xl shadow-sm border border-pink-100 overflow-hidden shrink-0 flex items-center justify-center ${isMobile ? 'w-10 h-10' : 'w-24 h-24 md:w-28 md:h-28'}`}>
              <img src="/logo.png" alt="Shop Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className={`font-black text-sweet-brown tracking-tighter leading-tight truncate ${isMobile ? 'text-sm' : 'text-lg md:text-xl'}`}>
                {lang === "ja" ? "ニーナの「台湾甜蜜」マップ" : "妮娜的「台灣甜蜜」地圖"}
              </h1>
              <p className={`font-bold text-pink-400 uppercase tracking-widest truncate ${isMobile ? 'text-[8px]' : 'text-[10px] md:text-[10px]'}`}>
                Nina's Taiwan sweets journey
              </p>
            </div>
          </div>

          {/* Right: Language switch on desktop or mini-header statistics */}
          {!isMobile ? (
            <div className="flex flex-row items-center gap-4 shrink-0">
              {/* Language Switch */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl border border-gray-200/50">
                <button
                  onClick={() => handleLanguageChange("ja")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${lang === "ja" ? "bg-white text-pink-500 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                  日本語
                </button>
                <button
                  onClick={() => handleLanguageChange("zh")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${lang === "zh" ? "bg-white text-pink-500 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                  繁體中文
                </button>
              </div>

              {/* Statistics */}
              <div className="flex items-center gap-2">
                <div className="bg-white px-3 md:px-5 py-2 rounded-full shadow-md flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm font-black text-pink-500 border border-pink-100">
                  <Heart size={14} fill="currentColor" />
                  <span>{lang === "ja" ? "御用達店" : "御用店家"}</span>
                  <span className="ml-0.5 bg-pink-50 px-2 py-0.5 rounded-full">{userStats.favorites.length}</span>
                </div>
                <div className="bg-white px-3 md:px-5 py-2 rounded-full shadow-md flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm font-black text-orange-600 border border-orange-100">
                  <div className="w-4 h-4 bg-orange-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">✓</div>
                  <span>{lang === "ja" ? "行ってみたい！" : "我想去！"}</span>
                  <span className="ml-0.5 bg-orange-50 px-2 py-0.5 rounded-full">{userStats.visited.length}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Language Switch for Mobile (Header right) */
            <button
              onClick={() => handleLanguageChange(lang === "ja" ? "zh" : "ja")}
              className="px-2.5 py-1.5 bg-pink-50 border border-pink-100 text-pink-500 rounded-xl text-xs font-black flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Globe size={12} />
              <span>{lang === "ja" ? "繁體" : "日本語"}</span>
            </button>
          )}
        </div>

        {/* Middle: Genre Filter - PC - Extends to Logo */}
        {!isMobile && (
          <div className="mt-4 pointer-events-auto">
            <GenreFilterUI isPC={true} />
          </div>
        )}

        {/* Genre Filter Bar - Mobile Position (Drawer Pop) */}
        {isMobile && showGenreFilter && (
          <div className="w-full px-2 mt-2">
            <GenreFilterUI />
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 p-2 bg-gray-50 overflow-hidden relative">
        <MapContainer
          stores={finalStoresList}
          genres={genres}
          onStoreSelect={(store) => {
            if (showAdmin) {
              setEditingStore(store);
              setFormStep(2);
            } else {
              setSelectedStore(store);
            }
          }}
          userStats={userStats}
          isAdminMode={showAdmin}
          onLocationSelect={(loc) => {
            if (showAdmin) {
              const newStore = {
                ...(editingStore || { images: [], videos: [], genres: [] }),
                lat: loc.lat,
                lng: loc.lng,
                nameJP: loc.name || editingStore?.nameJP || "",
                addressJP: loc.address || editingStore?.addressJP || "",
              };
              setEditingStore(newStore);
              if (loc.photos) setGooglePhotos(loc.photos);
              setFormStep(1);
            }
          }}
          onToggleStat={toggleStat}
          lang={lang}
          onUserLocationChange={setUserLocation}
          focusedStore={focusedStore}
        />
      </div>

      {/* Mobile Swipeable Bottom Sheet */}
      <AnimatePresence>
        {isMobile && bottomSheetState !== "collapsed" && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ 
              y: bottomSheetState === "half" ? "50%" : "15%" 
            }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[48] bg-white rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.12)] border-t border-gray-100 flex flex-col pointer-events-auto overflow-hidden"
            style={{ height: "85vh" }}
          >
            {/* Drag Handle Indicator */}
            <div 
              className="w-full py-4 flex justify-center cursor-ns-resize shrink-0"
              onClick={() => setBottomSheetState(bottomSheetState === "half" ? "full" : "half")}
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>

            {/* List Header */}
            <div className="px-5 pb-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("favorites")}
                  className={`px-4 py-2 rounded-full text-xs font-black transition-colors cursor-pointer ${activeTab === "favorites" ? 'bg-pink-400 text-white shadow-md' : 'bg-gray-50 text-gray-500'}`}
                >
                  {lang === "ja" ? "お気に入り" : "我的愛店"} ({userStats.favorites.length})
                </button>
                <button
                  onClick={() => setActiveTab("visited")}
                  className={`px-4 py-2 rounded-full text-xs font-black transition-colors cursor-pointer ${activeTab === "visited" ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-50 text-gray-500'}`}
                >
                  {lang === "ja" ? "行ってみたい" : "我想去"} ({userStats.visited.length})
                </button>
              </div>

              {/* Sort Switch */}
              {userLocation && (
                <button
                  onClick={() => setSortByDistance(!sortByDistance)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-colors cursor-pointer ${sortByDistance ? 'bg-pink-50 border-pink-100 text-pink-500' : 'bg-white border-gray-100 text-gray-500'}`}
                >
                  <ArrowUpDown size={12} />
                  {lang === "ja" ? "近い順" : "距離近"}
                </button>
              )}
            </div>

            {/* Sheet Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-28 scrollbar-none">
              {(() => {
                const listIds = activeTab === "favorites" ? userStats.favorites : userStats.visited;
                const listStores = finalStoresList.filter(s => listIds.includes(s.id));

                if (listStores.length === 0) {
                  return (
                    <div className="h-40 flex flex-col items-center justify-center text-gray-300 gap-2">
                      <div className="text-3xl">🍬</div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {lang === "ja" ? "店舗がありません" : "清單暫無店家"}
                      </p>
                    </div>
                  );
                }

                return listStores.map(store => {
                  const info = getGenreInfo(store);
                  const isFav = userStats.favorites.includes(store.id);
                  const isVis = userStats.visited.includes(store.id);

                  return (
                    <div
                      key={store.id}
                      onClick={() => {
                        setFocusedStore(store);
                        setBottomSheetState("collapsed");
                      }}
                      className="p-3 bg-gray-50/60 hover:bg-pink-50 border border-gray-100/50 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors shadow-sm"
                    >
                      {/* Image */}
                      <div className="w-14 h-14 bg-white rounded-xl overflow-hidden shrink-0 shadow-inner">
                        {store.images && store.images.length > 0 ? (
                          <img
                            src={getOptimizedImageUrl(store.images[0], 150)}
                            alt={store.nameJP}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">🍡</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span 
                            style={{ backgroundColor: info.color + '20', color: info.color }}
                            className="px-1.5 py-0.5 rounded text-[8px] font-black"
                          >
                            {info.icon} {genres.find(g => g.id === store.genres[0])?.[lang === "ja" ? "nameJP" : "nameCH"]}
                          </span>
                          {userLocation && (
                            <span className="text-[8px] font-black text-gray-400">
                              📍 {formatDistance(calculateDistance(userLocation.lat, userLocation.lng, store.lat, store.lng))}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-black text-sweet-brown truncate leading-tight mt-1">
                          {lang === "ja" ? store.nameJP : store.nameCH}
                        </h4>
                        <p className="text-[9px] text-gray-400 font-bold truncate">
                          {lang === "ja" ? store.nameCH : store.nameJP}
                        </p>
                      </div>

                      {/* Action Triggers */}
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleStat("favorites", store.id)}
                          className={`p-2 rounded-xl border transition-colors cursor-pointer ${isFav ? 'bg-pink-50 border-pink-100 text-pink-500' : 'bg-white border-gray-100 text-gray-400'}`}
                        >
                          <Heart size={12} fill={isFav ? "currentColor" : "none"} />
                        </button>
                        <button
                          onClick={() => toggleStat("visited", store.id)}
                          className={`p-2 rounded-xl border transition-colors cursor-pointer ${isVis ? 'bg-orange-50 border-orange-100 text-orange-500' : 'bg-white border-gray-100 text-gray-400'}`}
                        >
                          <span className="text-[8px] font-black">✓</span>
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Thumb Action Dock for Smartphone */}
      {isMobile && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[49] pointer-events-none w-full max-w-[280px]">
          <div className="bg-white/90 backdrop-blur-xl border border-white/50 px-4 py-2.5 rounded-[2rem] shadow-[0_15px_40px_rgba(255,193,204,0.3)] flex items-center justify-between pointer-events-auto">
            {/* 1. Genre Filter Toggle */}
            <button 
              onClick={() => {
                setShowGenreFilter(!showGenreFilter);
                setBottomSheetState("collapsed");
              }}
              className={`p-2.5 rounded-2xl transition-colors cursor-pointer ${showGenreFilter ? 'bg-pink-100 text-pink-500' : 'text-gray-500 hover:text-pink-500'}`}
              title={lang === "ja" ? "ジャンル" : "分類"}
            >
              <LayoutGrid size={20} />
            </button>

            {/* 2. Favorites List Toggle */}
            <button 
              onClick={() => {
                setActiveTab("favorites");
                setBottomSheetState(bottomSheetState === "collapsed" ? "half" : bottomSheetState === "half" ? "full" : "collapsed");
                setShowGenreFilter(false);
              }}
              className={`p-2.5 rounded-2xl transition-colors cursor-pointer ${bottomSheetState !== "collapsed" && activeTab === "favorites" ? 'bg-pink-100 text-pink-500' : 'text-gray-500 hover:text-pink-500'}`}
              title={lang === "ja" ? "お気に入り" : "我的最愛"}
            >
              <Heart size={20} fill={bottomSheetState !== "collapsed" && activeTab === "favorites" ? "currentColor" : "none"} />
            </button>

            {/* 3. Visited List Toggle */}
            <button 
              onClick={() => {
                setActiveTab("visited");
                setBottomSheetState(bottomSheetState === "collapsed" ? "half" : bottomSheetState === "half" ? "full" : "collapsed");
                setShowGenreFilter(false);
              }}
              className={`p-2.5 rounded-2xl transition-colors cursor-pointer ${bottomSheetState !== "collapsed" && activeTab === "visited" ? 'bg-orange-100 text-orange-500' : 'text-gray-500 hover:text-orange-50'}`}
              title={lang === "ja" ? "行ってみたい" : "我想去"}
            >
              <CheckCircle size={20} />
            </button>

            {/* 4. Language Selector */}
            <button 
              onClick={() => handleLanguageChange(lang === "ja" ? "zh" : "ja")}
              className="p-2.5 text-gray-500 hover:text-pink-500 transition-colors flex items-center gap-1 cursor-pointer font-black text-xs border border-gray-100 rounded-2xl"
              title={lang === "ja" ? "言語切替" : "切換語言"}
            >
              <Globe size={14} />
              <span>{lang === "ja" ? "繁" : "JP"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <StoreDetailModal
        store={selectedStore}
        onClose={() => setSelectedStore(null)}
        userStats={userStats}
        onToggleStat={toggleStat}
        lang={lang}
        userLocation={userLocation}
      />

      {
        showAdmin && (
          <AdminPanel
            stores={stores}
            genres={genres}
            onClose={() => setShowAdmin(false)}
            editingStore={editingStore}
            setEditingStore={setEditingStore}
            googlePhotos={googlePhotos}
            setGooglePhotos={setGooglePhotos}
            formStep={formStep}
            setFormStep={setFormStep}
          />
        )
      }

      {/* Admin Trigger (Bottom Left, Hidden) */}
      <div className="fixed bottom-6 left-6 z-[60] w-12 h-12 pointer-events-none">
        <button
          onClick={() => setShowAdmin(true)}
          className="w-full h-full rounded-full bg-transparent pointer-events-auto cursor-default opacity-0 hover:opacity-100 hover:bg-white/1 flex items-center justify-center text-transparent hover:text-gray-300 transition-all duration-500"
          title="Admin"
        >
          <Settings size={14} />
        </button>
      </div>

      <PWAInstallGuide />
    </main >
  );
}
