"use client";

import { useState, useEffect, useMemo } from "react";
import { useStores } from "@/hooks/useStores";
import { MapContainer } from "@/components/MapContainer";
import { StoreDetailModal } from "@/components/StoreDetailModal";
import { ShortsReelModal } from "@/components/ShortsReelModal";
import { AdminPanel } from "@/components/AdminPanel";
import { PWAInstallGuide } from "@/components/PWAInstallGuide";
import { Store, UserStats } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plane, Heart, CheckCircle, Info, LayoutGrid, ChevronLeft, Search, Sparkles, Globe, Menu, MapPin, ArrowUpDown, Sliders, X, Share2, Move, Film } from "lucide-react";
import { calculateDistance, formatDistance, getOptimizedImageUrl, getStoreAreaId, AREAS } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function Home() {
  const { stores, genres, loading } = useStores();
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
  const [showOnlyVisited, setShowOnlyVisited] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
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
  const [showReelModal, setShowReelModal] = useState(false);


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
    setShowOnlyFavorites(false);
    setSelectedStore(null);
    setShowAdmin(false);
    setEditingStore(null);
    setShowGenreFilter(false);
    setShowAreaFilter(false);
    setSearchQuery("");
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
  if (showOnlyFavorites) {
    filteredStores = filteredStores.filter(store => userStats.favorites.includes(store.id));
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

  // Mobile Area Filter Drawer
  const AreaFilterUI = () => (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-[#FDF8F5] rounded-2xl border border-[#FFE8DF] shadow-md overflow-hidden"
    >
      <div className="p-3 flex flex-wrap gap-1.5 max-h-[40vh] overflow-y-auto scrollbar-none">
        {AREAS.map(area => (
          <button
            key={area.id}
            onClick={() => {
              setSelectedAreaId(area.id);
              setShowAreaFilter(false);
            }}
            className={`px-3 py-1.5 rounded-full text-[11px] font-black transition-all cursor-pointer ${
              selectedAreaId === area.id 
                ? "bg-orange-500 text-white shadow-sm" 
                : "bg-white text-[#5D4037] hover:bg-orange-50 border border-orange-100"
            }`}
          >
            {area.name}
          </button>
        ))}
      </div>
    </motion.div>
  );

  // Mobile Genre Filter Drawer
  const GenreFilterUI = () => (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-[#FFF9FA] rounded-2xl border border-[#FFE4E8] shadow-md overflow-hidden"
    >
      <div className="p-3 flex flex-wrap gap-1.5 max-h-[40vh] overflow-y-auto scrollbar-none">
        <button
          onClick={() => { setSelectedGenreIds([]); setShowOnlyVisited(false); setShowGenreFilter(false); }}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${selectedGenreIds.length === 0 && !showOnlyVisited ? "bg-sweet-brown text-white" : "bg-white text-sweet-brown hover:bg-gray-100 border border-gray-100"}`}
        >
          すべて表示
        </button>
        <button
          onClick={() => setShowOnlyVisited(!showOnlyVisited)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border cursor-pointer ${showOnlyVisited ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white text-orange-500 hover:bg-orange-50 border-orange-100"}`}
        >
          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${showOnlyVisited ? "bg-white text-orange-500" : "bg-orange-500 text-white"}`}>✓</div>
          行ってみたい！
        </button>
        {genres.map(genre => (
          <button
            key={genre.id}
            onClick={() => toggleFilterGenre(genre.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${selectedGenreIds.includes(genre.id) ? "bg-pink-500 text-white shadow-sm" : "bg-white text-sweet-brown hover:bg-pink-50 border border-pink-100/50"}`}
          >
            <span>{genre.iconUrl}</span>
            <span>{genre.nameJP}</span>
          </button>
        ))}
      </div>
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
      {/* Top Controls Bar */}
      <div className={`relative z-40 bg-white border-b border-gray-100 shadow-sm transition-all duration-300 ${isMobile ? 'p-3' : 'px-5 py-2.5'}`}>
        {/* Row 1: Logo, Title, Search, and Action Controls */}
        <div className="w-full flex items-center justify-between gap-4">
          {/* Left: Title & Logo */}
          <div 
            className="flex items-center gap-3 pointer-events-auto cursor-pointer min-w-0 shrink-0"
            onClick={resetApp}
          >
            <div className={`bg-white rounded-xl shadow-sm border border-pink-100 overflow-hidden shrink-0 flex items-center justify-center ${isMobile ? 'w-10 h-10' : 'w-11 h-11'}`}>
              <img src="/logo.png" alt="Shop Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className={`font-black text-sweet-brown tracking-tighter leading-tight truncate ${isMobile ? 'text-sm' : 'text-base font-black'}`}>
                ニーナの「台湾甜蜜」マップ
              </h1>
              <p className={`font-bold text-pink-400 uppercase tracking-widest truncate ${isMobile ? 'text-[8px]' : 'text-[9px]'}`}>
                Nina's Taiwan sweets journey
              </p>
            </div>
          </div>

          {/* Center (PC Only): Search Bar */}
          {!isMobile && (
            <div className="flex-1 max-w-sm relative mx-2">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="店名、お菓子、説明、住所から検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-1.5 rounded-full border border-pink-100 bg-[#FFFDFD] focus:bg-white text-xs font-bold text-sweet-brown placeholder-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all shadow-inner h-9"
                />
                <div className="absolute left-3 text-pink-300 pointer-events-none">
                  <Search size={14} />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 text-pink-300 hover:text-pink-500 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Right Controls (Desktop Only) */}
          {!isMobile && (
            <div className="flex items-center gap-2 shrink-0">
              {/* Reel Mode Button */}
              <button
                onClick={() => setShowReelModal(true)}
                className="bg-gradient-to-r from-pink-500 via-pink-400 to-orange-400 hover:opacity-95 text-white px-3.5 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer h-9 shadow-pink-200/50"
                title="ショート動画で店舗を次々巡る"
              >
                <span className="text-sm">🎬</span>
                <span>動画で巡る</span>
              </button>

              {/* Favorites Filter / Counter Badge */}
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-xs font-black border transition-all cursor-pointer h-9 ${
                  showOnlyFavorites 
                    ? "bg-pink-500 text-white border-pink-500 ring-2 ring-pink-200 shadow-pink-100" 
                    : "bg-white text-pink-500 hover:bg-pink-50/50 border-pink-100"
                }`}
                title="御用達店のみ表示"
              >
                <Heart size={14} fill={showOnlyFavorites ? "currentColor" : "none"} />
                <span>御用達店</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${showOnlyFavorites ? "bg-white/20 text-white" : "bg-pink-50 text-pink-500"}`}>
                  {userStats.favorites.length}
                </span>
              </button>

              {/* Wishlist Filter / Counter Badge */}
              <button
                onClick={() => setShowOnlyVisited(!showOnlyVisited)}
                className={`px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-xs font-black border transition-all cursor-pointer h-9 ${
                  showOnlyVisited 
                    ? "bg-orange-500 text-white border-orange-500 ring-2 ring-orange-200 shadow-orange-100" 
                    : "bg-white text-orange-600 hover:bg-orange-50/50 border-orange-100"
                }`}
                title="行ってみたい店舗のみ表示"
              >
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${showOnlyVisited ? "bg-white text-orange-500" : "bg-orange-500 text-white"}`}>✓</div>
                <span>行ってみたい！</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${showOnlyVisited ? "bg-white/20 text-white" : "bg-orange-50 text-orange-600"}`}>
                  {userStats.visited.length}
                </span>
              </button>

              {/* Share List Button */}
              <button
                onClick={handleShareList}
                className="bg-white hover:bg-gray-50 text-sweet-brown border border-gray-200 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer h-9"
                title="リストを共有"
              >
                <Share2 size={13} className="text-pink-400" />
                <span>共有</span>
              </button>
            </div>
          )}
        </div>

        {/* PC Filters: 2 separate rows so ALL options are fully visible */}
        {!isMobile && (
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-col gap-2 pointer-events-auto">
            {/* Row 1: Area Filter (All Options Visible) */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-orange-500 font-black text-xs shrink-0 mr-1">
                <MapPin size={14} />
                <span>エリア:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {AREAS.map(area => (
                  <button
                    key={area.id}
                    onClick={() => setSelectedAreaId(area.id)}
                    className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer shadow-xs ${
                      selectedAreaId === area.id
                        ? "bg-orange-500 text-white shadow-sm shadow-orange-200 ring-2 ring-orange-200"
                        : "bg-[#FFF8F5] text-[#7C5D52] hover:bg-orange-100/70 border border-[#FFE8DF]"
                    }`}
                  >
                    {area.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Genre Filter (All Options Visible) */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-pink-500 font-black text-xs shrink-0 mr-1">
                <LayoutGrid size={14} />
                <span>ジャンル:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setSelectedGenreIds([])}
                  className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer shadow-xs ${
                    selectedGenreIds.length === 0
                      ? "bg-sweet-brown text-white shadow-sm ring-2 ring-sweet-brown/20"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200/60"
                  }`}
                >
                  すべて
                </button>
                {genres.map(genre => (
                  <button
                    key={genre.id}
                    onClick={() => toggleFilterGenre(genre.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black transition-all cursor-pointer shadow-xs ${
                      selectedGenreIds.includes(genre.id)
                        ? "bg-pink-500 text-white shadow-sm shadow-pink-200 ring-2 ring-pink-200"
                        : "bg-[#FFF9FA] text-[#7C5D52] hover:bg-pink-100/70 border border-[#FFE4E8]"
                    }`}
                  >
                    <span>{genre.iconUrl}</span>
                    <span>{genre.nameJP}</span>
                  </button>
                ))}
              </div>
            </div>
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
              className="w-full pl-9 pr-9 py-2 rounded-xl border border-pink-100 bg-[#FFFDFD] text-[11px] font-bold text-sweet-brown placeholder-pink-300 focus:outline-none focus:ring-1 focus:ring-pink-300 focus:border-transparent transition-all shadow-inner"
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
          <div className="w-full px-1 mt-2">
            <AreaFilterUI />
          </div>
        )}

        {/* Genre Filter Bar - Mobile Position (Drawer Pop) */}
        {isMobile && showGenreFilter && (
          <div className="w-full px-1 mt-2">
            <GenreFilterUI />
          </div>
        )}

        {/* Mobile Header Buttons */}
        {isMobile && (
          <div 
            className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100 overflow-x-auto scrollbar-none pb-0.5 pointer-events-auto [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <button
              onClick={() => {
                setShowAreaFilter(!showAreaFilter);
                setShowGenreFilter(false);
                setBottomSheetState("collapsed");
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all shadow-sm border shrink-0 cursor-pointer ${
                showAreaFilter ? 'bg-orange-500 text-white border-orange-500 shadow-orange-100' : 'bg-orange-50/60 text-[#8C6D62] border-orange-100/60'
              }`}
            >
              <MapPin size={12} />
              <span>エリア{selectedAreaId !== "all" ? ` (${AREAS.find(a=>a.id===selectedAreaId)?.name.split('・')[0]})` : ""}</span>
            </button>

            <button
              onClick={() => {
                setShowGenreFilter(!showGenreFilter);
                setShowAreaFilter(false);
                setBottomSheetState("collapsed");
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all shadow-sm border shrink-0 cursor-pointer ${
                showGenreFilter ? 'bg-pink-500 text-white border-pink-500 shadow-pink-100' : 'bg-pink-50/60 text-[#8C6D62] border-pink-100/60'
              }`}
            >
              <LayoutGrid size={12} />
              <span>ジャンル{selectedGenreIds.length > 0 ? ` (${selectedGenreIds.length})` : ""}</span>
            </button>

            {/* Reel Mode Mobile Button */}
            <button
              onClick={() => {
                setShowReelModal(true);
                setShowGenreFilter(false);
                setShowAreaFilter(false);
                setBottomSheetState("collapsed");
              }}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[11px] font-black transition-all shadow-md shrink-0 cursor-pointer bg-gradient-to-r from-pink-500 via-pink-400 to-orange-400 text-white shadow-pink-200/50 hover:scale-105 active:scale-95"
            >
              <span>🎬</span>
              <span>動画</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("favorites");
                setBottomSheetState(bottomSheetState === "collapsed" ? "half" : bottomSheetState === "half" ? "full" : "collapsed");
                setShowGenreFilter(false);
                setShowAreaFilter(false);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all shadow-sm border shrink-0 cursor-pointer ${
                bottomSheetState !== "collapsed" && activeTab === "favorites" ? 'bg-pink-500 text-white border-pink-500 shadow-pink-100' : 'bg-gray-50 text-gray-600 border-gray-100'
              }`}
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
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all shadow-sm border shrink-0 cursor-pointer ${
                bottomSheetState !== "collapsed" && activeTab === "visited" ? 'bg-orange-500 text-white border-orange-500 shadow-orange-100' : 'bg-gray-50 text-gray-600 border-gray-100'
              }`}
            >
              <CheckCircle size={12} />
              <span>行きたい ({userStats.visited.length})</span>
            </button>

            <button
              onClick={handleShareList}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all shadow-sm shrink-0 cursor-pointer bg-gradient-to-r from-pink-400 to-orange-400 text-white"
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
              
              {/* Distance sorting */}
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
              </div>
            </div>

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
                          {store.genres && store.genres.map(genreId => {
                            const genre = genres.find(g => g.id === genreId);
                            if (!genre) return null;
                            const color = genre.color || "#ffffff";
                            return (
                              <span 
                                key={genreId}
                                style={{ backgroundColor: color + '20', color: color }}
                                className="px-1.5 py-0.5 rounded text-[8px] font-black"
                              >
                                {genre.iconUrl} {genre.nameJP}
                              </span>
                            );
                          })}
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
                toast.success("場所を特定しました！地図上の「ココを登録！」ピンをクリックして入力に進んでください。", {
                  duration: 5000,
                  icon: "📍"
                });
              }
            }}
            onTempPinClick={() => {
              if (editingStore) {
                setFormStep(2);
              } else {
                toast.error("新規店舗追加（＋）を先に選択してください");
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
      {showReelModal && (
        <ShortsReelModal
          stores={stores}
          genres={genres}
          userStats={userStats}
          onClose={() => setShowReelModal(false)}
          onStoreSelect={(store) => {
            setSelectedStore(store);
          }}
          onViewOnMap={(store) => {
            setFocusedStore(store);
          }}
          onToggleStat={toggleStat}
          userLocation={userLocation}
        />
      )}

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
