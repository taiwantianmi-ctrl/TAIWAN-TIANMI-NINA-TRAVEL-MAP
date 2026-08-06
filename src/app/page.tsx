"use client";

import { useState, useEffect, useMemo } from "react";
import { useStores } from "@/hooks/useStores";
import { MapContainer } from "@/components/MapContainer";
import { StoreDetailModal } from "@/components/StoreDetailModal";
import { AdminPanel } from "@/components/AdminPanel";
import { PWAInstallGuide } from "@/components/PWAInstallGuide";
import { Store, UserStats } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plane, Heart, CheckCircle, Info, LayoutGrid, ChevronLeft, Search, Sparkles, Globe, Menu, MapPin, ArrowUpDown, Sliders, X, Share2 } from "lucide-react";
import { calculateDistance, formatDistance, getOptimizedImageUrl, getStoreAreaId, AREAS } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function Home() {
  const { stores, genres, loading } = useStores();
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
  const [showOnlyVisited, setShowOnlyVisited] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({ visited: [], favorites: [] });
  const [editingStore, setEditingStore] = useState<Partial<Store> | null>(null);
  const [googlePhotos, setGooglePhotos] = useState<string[]>([]);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [focusedStore, setFocusedStore] = useState<Store | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [bottomSheetState, setBottomSheetState] = useState<"collapsed" | "half" | "full">("collapsed");
  const [sortByDistance, setSortByDistance] = useState(false);
  const [activeTab, setActiveTab] = useState<"favorites" | "visited">("favorites");
  const [isPopupActive, setIsPopupActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRoute, setShowRoute] = useState(false);
  const [routeType, setRouteType] = useState<"favorites" | "visited">("favorites"); // マイ・ルートの対象リスト


  // Monitor resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load user stats from URL or LocalStorage
  useEffect(() => {
    // 1. Check URL parameters first for shared lists
    const params = new URLSearchParams(window.location.search);
    const favsParam = params.get("favs");
    const visitedParam = params.get("visited");

    if (favsParam || visitedParam) {
      const newStats: UserStats = {
        favorites: favsParam ? favsParam.split(",").filter(Boolean) : [],
        visited: visitedParam ? visitedParam.split(",").filter(Boolean) : [],
      };
      setUserStats(newStats);
      localStorage.setItem("taiwan_sweet_stats", JSON.stringify(newStats));
      toast.success("共有されたリストを読み込みました！", {
        icon: "🍬",
        style: {
          borderRadius: "1rem",
          background: "#5D4037",
          color: "#fff",
          fontWeight: "bold",
        }
      });
      // Clean up URL parameters to keep it clean
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // 2. Fallback to LocalStorage
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

  const handleShareList = () => {
    if (userStats.favorites.length === 0 && userStats.visited.length === 0) {
      toast.error("共有するお気に入りまたは行ってみたいお店がありません");
      return;
    }

    const params = new URLSearchParams();
    if (userStats.favorites.length > 0) {
      params.set("favs", userStats.favorites.join(","));
    }
    if (userStats.visited.length > 0) {
      params.set("visited", userStats.visited.join(","));
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast.success("共有リンクをコピーしました！", {
          icon: "🔗",
          style: {
            borderRadius: "1rem",
            background: "#5D4037",
            color: "#fff",
            fontWeight: "bold",
          }
        });
      })
      .catch((err) => {
        console.error("Failed to copy share link", err);
        toast.error("リンクのコピーに失敗しました");
      });
  };

  const toggleFilterGenre = (id: string) => {
    setSelectedGenreIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const resetApp = () => {
    setSelectedGenreIds([]);
    setSelectedAreaId("all");
    setShowOnlyVisited(false);
    setSelectedStore(null);
    setShowAdmin(false);
    setEditingStore(null);
    setShowGenreFilter(false);
    setSearchQuery("");
    setShowRoute(false);
  };

  let filteredStores = stores;
  if (selectedAreaId !== "all") {
    filteredStores = filteredStores.filter(store => getStoreAreaId(store) === selectedAreaId);
  }
  if (selectedGenreIds.length > 0) {
    filteredStores = filteredStores.filter(store => store.genres?.some(gId => selectedGenreIds.includes(gId)));
  }
  if (showOnlyVisited) {
    filteredStores = filteredStores.filter(store => userStats.visited.includes(store.id));
  }
  if (searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase().trim();
    filteredStores = filteredStores.filter(store => 
      store.nameJP?.toLowerCase().includes(q) ||
      store.nameCH?.toLowerCase().includes(q) ||
      store.descriptionJP?.toLowerCase().includes(q) ||
      store.descriptionCH?.toLowerCase().includes(q) ||
      store.addressJP?.toLowerCase().includes(q) ||
      store.addressCH?.toLowerCase().includes(q)
    );
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

  const [showAreaFilter, setShowAreaFilter] = useState(false);

  // Common Area Filter UI component (Map/Travel Theme - Orange & Capsule Buttons)
  const AreaFilterUI = ({ isPC = false }: { isPC?: boolean }) => (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`bg-[#FDF8F5] rounded-[2rem] border-2 border-[#FFE8DF]/60 shadow-[0_8px_20px_rgba(251,146,60,0.04)] overflow-hidden ${isPC ? 'h-full' : ''}`}
    >
      <div className="h-full flex items-center p-3 md:px-6 gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-md shadow-orange-100">
            <MapPin size={18} />
          </div>
          <div className="text-left hidden lg:block">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1">Area Filter</p>
            <p className="text-[10px] font-black text-[#8C6D62]">地域を選択</p>
          </div>
        </div>

        <div className="flex-1 flex flex-wrap gap-1.5 overflow-y-auto max-h-[85px] scrollbar-none py-1">
          {AREAS.map(area => (
            <button
              key={area.id}
              onClick={() => setSelectedAreaId(area.id)}
              className={`px-4 py-2 rounded-full text-[10px] font-black transition-all shadow-sm border cursor-pointer ${
                selectedAreaId === area.id 
                  ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-100 hover:opacity-95" 
                  : "bg-white text-[#5D4037] hover:bg-orange-50/50 border-[#FFE8DF]/50"
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );

  // Common Genre Filter UI component to be reused (Sweet/Pastry Theme - Pink & Soft Square Buttons)
  const GenreFilterUI = ({ isPC = false }: { isPC?: boolean }) => (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`bg-[#FFF9FA] rounded-[2rem] border-2 border-[#FFE4E8]/60 shadow-[0_8px_20px_rgba(244,63,94,0.04)] overflow-hidden ${isPC ? 'h-full' : ''}`}
    >
      {isPC ? (
        <div className="h-full flex items-center p-3 md:px-6 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-pink-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-pink-100">
              <LayoutGrid size={18} />
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest leading-none mb-1">Genre Filter</p>
              <p className="text-[10px] font-black text-[#8C6D62]">マルチ選択可</p>
            </div>
          </div>

          <div className="flex-1 flex flex-wrap gap-1.5 overflow-y-auto max-h-[85px] scrollbar-none py-1">
            <button
              onClick={() => { setSelectedGenreIds([]); setShowOnlyVisited(false); }}
              className={`px-3 py-2 rounded-2xl text-[10px] font-black transition-all shadow-sm border cursor-pointer ${
                selectedGenreIds.length === 0 && !showOnlyVisited 
                  ? "bg-sweet-brown text-white border-sweet-brown shadow-md" 
                  : "bg-white text-sweet-brown hover:bg-gray-50 border-gray-100"
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => setShowOnlyVisited(!showOnlyVisited)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[10px] font-black transition-all shadow-sm border cursor-pointer ${
                showOnlyVisited 
                  ? "bg-orange-500 text-white border-orange-500 ring-2 ring-orange-200" 
                  : "bg-white text-orange-500 hover:bg-orange-50 border-orange-100"
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${showOnlyVisited ? "bg-white text-orange-500" : "bg-orange-500 text-white"}`}>✓</div>
              行ってみたい！
            </button>
            {genres.map(genre => (
              <button
                key={genre.id}
                onClick={() => toggleFilterGenre(genre.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-[10px] font-black transition-all shadow-sm border cursor-pointer ${
                  selectedGenreIds.includes(genre.id) 
                    ? "bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-100" 
                    : "bg-white text-sweet-brown hover:bg-pink-50/30 border-[#FFE4E8]/50"
                }`}
              >
                <div
                  style={{ backgroundColor: genre.color || "#ffffff" }}
                  className="w-4 h-4 rounded-lg flex items-center justify-center text-[10px] shadow-sm border border-white/20"
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
            className="w-full flex items-center justify-between px-4 py-3 md:py-4 text-sweet-brown hover:bg-gray-50/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-pink-500 text-white rounded-2xl flex items-center justify-center shadow-md">
                <LayoutGrid size={18} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest leading-none mb-1">Genre Filter</p>
                <p className="text-xs md:text-sm font-black tracking-tighter truncate max-w-[150px] md:max-w-md text-[#5D4037]">
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
                <div className="p-3 md:p-4 border-t border-pink-100/30 flex flex-wrap gap-2 max-h-[40vh] overflow-y-auto scrollbar-none">
                  <button
                    onClick={() => { setSelectedGenreIds([]); setShowOnlyVisited(false); setShowGenreFilter(false); }}
                    className={`px-4 py-2 rounded-2xl text-[10px] md:text-xs font-black transition-all shadow-sm cursor-pointer ${selectedGenreIds.length === 0 && !showOnlyVisited ? "bg-sweet-brown text-white" : "bg-gray-50 text-sweet-brown hover:bg-gray-100"}`}
                  >
                    すべて表示
                  </button>
                  <button
                    onClick={() => setShowOnlyVisited(!showOnlyVisited)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] md:text-xs font-black transition-all shadow-sm border cursor-pointer ${showOnlyVisited ? "bg-orange-500 text-white border-orange-500 ring-2 ring-orange-200" : "bg-gray-50 text-orange-500 hover:bg-orange-50 border-orange-100"}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${showOnlyVisited ? "bg-white text-orange-500" : "bg-orange-500 text-white"}`}>✓</div>
                    行ってみたい！
                  </button>
                  {genres.map(genre => (
                    <button
                      key={genre.id}
                      onClick={() => {
                        toggleFilterGenre(genre.id);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] md:text-xs font-black transition-all shadow-sm cursor-pointer ${selectedGenreIds.includes(genre.id) ? "bg-pink-500 text-white ring-2 ring-white" : "bg-gray-50 text-sweet-brown hover:bg-gray-100"}`}
                    >
                      <div
                        style={{ backgroundColor: genre.color || "#ffffff" }}
                        className="w-4 h-4 rounded-lg flex items-center justify-center text-[10px] shadow-sm border border-white/20"
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
            className="flex items-center gap-2 md:gap-4 pointer-events-auto cursor-pointer min-w-0 shrink-0"
            onClick={resetApp}
          >
            <div className={`bg-white rounded-xl shadow-sm border border-pink-100 overflow-hidden shrink-0 flex items-center justify-center ${isMobile ? 'w-10 h-10' : 'w-24 h-24 md:w-28 md:h-28'}`}>
              <img src="/logo.png" alt="Shop Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className={`font-black text-sweet-brown tracking-tighter leading-tight truncate ${isMobile ? 'text-sm' : 'text-lg md:text-xl'}`}>
                ニーナの「台湾甜蜜」マップ
              </h1>
              <p className={`font-bold text-pink-400 uppercase tracking-widest truncate ${isMobile ? 'text-[8px]' : 'text-[10px] md:text-[10px]'}`}>
                Nina's Taiwan sweets journey
              </p>
            </div>
          </div>

          {/* Middle: Search Bar (Desktop Only) */}
          {!isMobile && (
            <div className="flex-1 max-w-md mx-6 relative">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="店名、お菓子、説明、住所から検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-full border border-pink-100 bg-[#FFFDFD] focus:bg-white text-xs font-bold text-sweet-brown placeholder-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all shadow-inner"
                />
                <div className="absolute left-3.5 text-pink-300 pointer-events-none">
                  <Search size={16} />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 text-pink-300 hover:text-pink-500 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Right: Statistics & Share (Desktop Only) */}
          {!isMobile && (
            <div className="flex flex-row items-center gap-4 shrink-0">
              {/* Share Button */}
              <button
                onClick={handleShareList}
                className="bg-gradient-to-r from-pink-400 to-orange-400 hover:from-pink-500 hover:to-orange-500 text-white px-4 py-2.5 rounded-full shadow-md flex items-center gap-2 text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Share2 size={14} />
                <span>リストを共有</span>
              </button>

              {/* Statistics */}
              <div className="flex items-center gap-2">
                <div className="bg-white px-3 md:px-5 py-2 rounded-full shadow-md flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm font-black text-pink-500 border border-pink-100">
                  <Heart size={14} fill="currentColor" />
                  <span>御用達店</span>
                  <span className="ml-0.5 bg-pink-50 px-2 py-0.5 rounded-full">{userStats.favorites.length}</span>
                </div>
                <div className="bg-white px-3 md:px-5 py-2 rounded-full shadow-md flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm font-black text-orange-600 border border-orange-100">
                  <div className="w-4 h-4 bg-orange-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">✓</div>
                  <span>行ってみたい！</span>
                  <span className="ml-0.5 bg-orange-50 px-2 py-0.5 rounded-full">{userStats.visited.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Middle: Area & Genre Filter - PC */}
        {!isMobile && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 pointer-events-auto">
            <AreaFilterUI isPC={true} />
            <GenreFilterUI isPC={true} />
          </div>
        )}

        {/* Mobile Search Bar */}
        {isMobile && (
          <div className="mt-2 relative">
            <input
              type="text"
              placeholder="店名、お菓子、説明、住所から検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-pink-100 bg-[#FFFDFD] text-[11px] font-bold text-sweet-brown placeholder-pink-300 focus:outline-none focus:ring-1 focus:ring-pink-300 focus:border-transparent transition-all shadow-inner"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-300 pointer-events-none">
              <Search size={14} />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-300 hover:text-pink-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Area Filter Bar - Mobile Position (Drawer Pop) */}
        {isMobile && showAreaFilter && (
          <div className="w-full px-2 mt-2">
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#FDF8F5] rounded-[2rem] border-2 border-[#FFE8DF]/60 shadow-sm overflow-hidden"
            >
              <div className="p-3 border-t border-[#FFE8DF]/30 flex flex-wrap gap-2 max-h-[40vh] overflow-y-auto scrollbar-none">
                {AREAS.map(area => (
                  <button
                    key={area.id}
                    onClick={() => {
                      setSelectedAreaId(area.id);
                      setShowAreaFilter(false);
                    }}
                    className={`px-4 py-2 rounded-full text-[10px] font-black transition-all shadow-sm cursor-pointer ${
                      selectedAreaId === area.id 
                        ? "bg-orange-500 text-white shadow-md shadow-orange-100" 
                        : "bg-white text-[#5D4037] hover:bg-orange-50/50 border-[#FFE8DF]/50"
                    }`}
                  >
                    {area.name}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Genre Filter Bar - Mobile Position (Drawer Pop) */}
        {isMobile && showGenreFilter && (
          <div className="w-full px-2 mt-2">
            <GenreFilterUI />
          </div>
        )}

        {/* Mobile Header Buttons */}
        {isMobile && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 overflow-x-auto scrollbar-none pb-1 pointer-events-auto">
            <button
              onClick={() => {
                setShowAreaFilter(!showAreaFilter);
                setShowGenreFilter(false);
                setBottomSheetState("collapsed");
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border shrink-0 cursor-pointer ${showAreaFilter ? 'bg-orange-400 text-white border-orange-400 shadow-orange-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
            >
              <MapPin size={12} />
              <span>エリア</span>
            </button>

            <button
              onClick={() => {
                setShowGenreFilter(!showGenreFilter);
                setShowAreaFilter(false);
                setBottomSheetState("collapsed");
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border shrink-0 cursor-pointer ${showGenreFilter ? 'bg-pink-400 text-white border-pink-400 shadow-pink-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
            >
              <LayoutGrid size={12} />
              <span>ジャンル</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("favorites");
                setBottomSheetState(bottomSheetState === "collapsed" ? "half" : bottomSheetState === "half" ? "full" : "collapsed");
                setShowGenreFilter(false);
                setShowAreaFilter(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border shrink-0 cursor-pointer ${bottomSheetState !== "collapsed" && activeTab === "favorites" ? 'bg-pink-400 text-white border-pink-400 shadow-pink-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
            >
              <Heart size={12} fill={bottomSheetState !== "collapsed" && activeTab === "favorites" ? "currentColor" : "none"} />
              <span>お気に入り ({userStats.favorites.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("visited");
                setBottomSheetState(bottomSheetState === "collapsed" ? "half" : bottomSheetState === "half" ? "full" : "collapsed");
                setShowGenreFilter(false);
                setShowAreaFilter(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border shrink-0 cursor-pointer ${bottomSheetState !== "collapsed" && activeTab === "visited" ? 'bg-orange-500 text-white border-orange-500 shadow-orange-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
            >
              <CheckCircle size={12} />
              <span>行ってみたい ({userStats.visited.length})</span>
            </button>

            <button
              onClick={handleShareList}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border shrink-0 cursor-pointer bg-gradient-to-r from-pink-400 to-orange-400 text-white border-transparent"
            >
              <Share2 size={12} />
              <span>共有</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-row overflow-hidden relative bg-gray-50">
        {/* PC Sidebar */}
        {!isMobile && showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full border-r border-gray-100 bg-white flex flex-col z-20 shadow-lg shrink-0 relative"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-sweet-brown">店舗リスト</span>
                <span className="bg-pink-50 text-pink-500 px-2 py-0.5 rounded-full text-[9px] font-black">
                  {finalStoresList.length} 件
                </span>
              </div>
              
              {/* Distance sorting / Route Switch */}
              <div className="flex items-center gap-2">
                {userLocation && (
                  <button
                    onClick={() => setSortByDistance(!sortByDistance)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black border transition-colors cursor-pointer ${sortByDistance ? 'bg-pink-50 border-pink-100 text-pink-500' : 'bg-white border-gray-100 text-gray-500'}`}
                  >
                    <ArrowUpDown size={10} />
                    <span>近い順</span>
                  </button>
                )}
                
                {/* Route Draw Toggle Button */}
                <button
                  onClick={() => setShowRoute(!showRoute)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black border transition-colors cursor-pointer ${showRoute ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-100 text-gray-500'}`}
                >
                  <span>ルート描画</span>
                </button>
              </div>
            </div>

            {/* Route selector when Route is active */}
            {showRoute && (
              <div className="px-4 py-2 bg-orange-50/50 border-b border-gray-100 flex items-center justify-between shrink-0">
                <span className="text-[9px] font-black text-orange-600">ルート対象:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setRouteType("favorites")}
                    className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${routeType === "favorites" ? "bg-pink-400 text-white border-pink-400" : "bg-white text-pink-400 border-pink-100"}`}
                  >
                    お気に入り ({userStats.favorites.length})
                  </button>
                  <button
                    onClick={() => setRouteType("visited")}
                    className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${routeType === "visited" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-orange-500 border-orange-100"}`}
                  >
                    行ってみたい ({userStats.visited.length})
                  </button>
                </div>
              </div>
            )}

            {/* Sidebar Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 pb-20 scrollbar-none">
              {finalStoresList.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-gray-300 gap-2">
                  <div className="text-3xl">🍬</div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    店舗が見つかりません
                  </p>
                </div>
              ) : (
                finalStoresList.map(store => {
                  const info = getGenreInfo(store);
                  const isFav = userStats.favorites.includes(store.id);
                  const isVis = userStats.visited.includes(store.id);

                  return (
                    <div
                      key={store.id}
                      onClick={() => {
                        setFocusedStore(store);
                        setSelectedStore(store);
                      }}
                      className={`p-3 border rounded-2xl flex items-center gap-3 cursor-pointer transition-all shadow-sm ${selectedStore?.id === store.id ? 'bg-pink-50/70 border-pink-200' : 'bg-gray-50/40 hover:bg-pink-50/30 border-gray-100/50'}`}
                    >
                      {/* Image */}
                      <div className="w-14 h-14 bg-white rounded-xl overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
                        {store.images && store.images.length > 0 ? (
                          <img
                            src={getOptimizedImageUrl(store.images[0], 150)}
                            alt={store.nameJP}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">🍡</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span 
                            style={{ backgroundColor: info.color + '20', color: info.color }}
                            className="px-1.5 py-0.5 rounded text-[8px] font-black"
                          >
                            {info.icon} {genres.find(g => g.id === store.genres[0])?.nameJP}
                          </span>
                          {userLocation && (
                            <span className="text-[8px] font-black text-gray-400">
                              📍 {formatDistance(calculateDistance(userLocation.lat, userLocation.lng, store.lat, store.lng))}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-black text-sweet-brown truncate leading-tight mt-1">
                          {store.nameJP}
                        </h4>
                        {store.addressJP && (
                          <p className="text-[9px] text-gray-400 truncate mt-0.5">
                            {store.addressJP}
                          </p>
                        )}
                      </div>

                      {/* Action Triggers */}
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleStat("favorites", store.id)}
                          className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${isFav ? 'bg-pink-50 border-pink-100 text-pink-500' : 'bg-white border-gray-100 text-gray-400'}`}
                        >
                          <Heart size={12} fill={isFav ? "currentColor" : "none"} />
                        </button>
                        <button
                          onClick={() => toggleStat("visited", store.id)}
                          className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${isVis ? 'bg-orange-50 border-orange-100 text-orange-500' : 'bg-white border-gray-100 text-gray-400'}`}
                        >
                          <span className="text-[8px] font-bold leading-none">✓</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* Sidebar Toggle Button (Desktop Only) */}
        {!isMobile && (
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="absolute top-4 z-30 w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-md text-sweet-brown hover:text-pink-500 transition-all cursor-pointer"
            style={{ left: showSidebar ? "396px" : "16px" }}
          >
            <Menu size={16} />
          </button>
        )}

        {/* Map Container */}
        <div className="flex-1 p-2 bg-gray-50 overflow-hidden relative">
          <MapContainer
            stores={finalStoresList}
            genres={genres}
            selectedAreaId={selectedAreaId}
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
            onUserLocationChange={setUserLocation}
            focusedStore={focusedStore}
            onPopupActiveChange={(active) => {
              setIsPopupActive(active);
              if (active) {
                setBottomSheetState("collapsed");
                setShowGenreFilter(false);
              }
            }}
            showRoute={showRoute}
            routeType={routeType}
          />
        </div>
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
                  お気に入り ({userStats.favorites.length})
                </button>
                <button
                  onClick={() => setActiveTab("visited")}
                  className={`px-4 py-2 rounded-full text-xs font-black transition-colors cursor-pointer ${activeTab === "visited" ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-50 text-gray-500'}`}
                >
                  行ってみたい ({userStats.visited.length})
                </button>
              </div>

              {/* Sort Switch */}
              {userLocation && (
                <button
                  onClick={() => setSortByDistance(!sortByDistance)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-colors cursor-pointer ${sortByDistance ? 'bg-pink-50 border-pink-100 text-pink-500' : 'bg-white border-gray-100 text-gray-500'}`}
                >
                  <ArrowUpDown size={12} />
                  近い順
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
                        店舗がありません
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
                            {info.icon} {genres.find(g => g.id === store.genres[0])?.nameJP}
                          </span>
                          {userLocation && (
                            <span className="text-[8px] font-black text-gray-400">
                              📍 {formatDistance(calculateDistance(userLocation.lat, userLocation.lng, store.lat, store.lng))}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-black text-sweet-brown truncate leading-tight mt-1">
                          {store.nameJP}
                        </h4>
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



      {/* Modals */}
      <StoreDetailModal
        store={selectedStore}
        onClose={() => setSelectedStore(null)}
        userStats={userStats}
        onToggleStat={toggleStat}
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
