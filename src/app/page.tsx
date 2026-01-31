"use client";

import { useState, useEffect } from "react";
import { useStores } from "@/hooks/useStores";
import { MapContainer } from "@/components/MapContainer";
import { StoreDetailModal } from "@/components/StoreDetailModal";
import { AdminPanel } from "@/components/AdminPanel";
import { Store, UserStats } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Plane, Heart, CheckCircle, Info, LayoutGrid, ChevronLeft } from "lucide-react";

export default function Home() {
  const { stores, genres, loading } = useStores();
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ visited: [], favorites: [] });
  const [editingStore, setEditingStore] = useState<Partial<Store> | null>(null);
  const [googlePhotos, setGooglePhotos] = useState<string[]>([]);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);

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
    setSelectedStore(null);
    setShowAdmin(false);
    setEditingStore(null);
    setShowGenreFilter(false);
  };

  const filteredStores = selectedGenreIds.length > 0
    ? stores.filter(store => store.genres?.some(gId => selectedGenreIds.includes(gId)))
    : stores;

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
              onClick={() => setSelectedGenreIds([])}
              className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border ${selectedGenreIds.length === 0 ? "bg-sweet-brown text-white border-sweet-brown" : "bg-white text-sweet-brown hover:bg-gray-100 border-gray-100"}`}
            >
              すべて
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
                    onClick={() => { setSelectedGenreIds([]); setShowGenreFilter(false); }}
                    className={`px-4 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all shadow-sm ${selectedGenreIds.length === 0 ? "bg-sweet-brown text-white" : "bg-gray-50 text-sweet-brown hover:bg-gray-100"}`}
                  >
                    すべて表示
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
      <div className="h-screen w-full flex flex-col items-center justify-center bg-pastel-pink/10">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-pastel-pink text-pink-400"
        >
          <Heart fill="currentColor" size={32} />
        </motion.div>
        <p className="mt-4 font-bold text-sweet-brown tracking-widest animate-pulse">読み込み中...</p>
      </div>
    );
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-white flex flex-col">
      {/* Top Floating Controls */}
      <div className="relative z-40 bg-white p-2 md:p-4 border-b border-gray-100">
        <div className="w-full flex items-stretch gap-4">
          {/* Main Content Area: Title & Stats & Filter */}
          <div className="flex-1 flex flex-col md:flex-row items-stretch gap-4">
            {/* Left: Title & Stats */}
            <div className="flex flex-col gap-2 pointer-events-auto cursor-pointer">
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="px-2 md:px-4 py-1 flex items-center gap-3 md:gap-4 hover:opacity-70 transition-opacity"
                onClick={resetApp}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 bg-pastel-pink rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm text-white shrink-0">
                  <Plane size={24} className="md:w-6 md:h-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg md:text-xl font-black text-sweet-brown tracking-tighter leading-tight truncate">台湾の甘い旅</h1>
                  <p className="text-[10px] md:text-[10px] font-bold text-pink-400 uppercase tracking-widest truncate">Taiwan Sweet Journey</p>
                </div>
              </motion.div>

              <div className="flex flex-row items-center gap-2 px-2 md:px-4 mb-1 overflow-x-auto scrollbar-none">
                <div className="whitespace-nowrap bg-white/90 backdrop-blur-md px-3 md:px-5 py-2 rounded-full shadow-md flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm font-black text-pink-500 border border-pink-100 flex-shrink-0">
                  <Heart size={14} fill="currentColor" />
                  <span>ワタシの御用達店</span>
                  <span className="ml-0.5 bg-pink-50 px-2 py-0.5 rounded-full">{userStats.favorites.length}</span>
                </div>
                <div className="whitespace-nowrap bg-white/90 backdrop-blur-md px-3 md:px-5 py-2 rounded-full shadow-md flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm font-black text-orange-600 border border-orange-100 flex-shrink-0">
                  <div className="w-4 h-4 bg-orange-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">✓</div>
                  <span>行った！</span>
                  <span className="ml-0.5 bg-orange-50 px-2 py-0.5 rounded-full">{userStats.visited.length}</span>
                </div>
              </div>
            </div>

            {/* Middle: Genre Filter - PC - Extends to Logo */}
            <div className="hidden md:block flex-1 pointer-events-auto">
              <GenreFilterUI isPC={true} />
            </div>
          </div>

          {/* Right: Shop Logo */}
          <div className="pointer-events-auto self-start md:self-stretch flex items-center pr-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 md:w-32 md:h-32 bg-white rounded-3xl shadow-lg border-4 border-white overflow-hidden p-1 shrink-0"
            >
              <img src="/logo.png" alt="Shop Logo" className="w-full h-full object-contain" />
            </motion.div>
          </div>
        </div>

        {/* Genre Filter Bar - Mobile Position */}
        <div className="md:hidden w-full px-2 mt-2">
          <GenreFilterUI />
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 p-2 bg-gray-50 overflow-hidden relative">
        <MapContainer
          stores={filteredStores}
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
              };
              setEditingStore(newStore);
              if (loc.photos) setGooglePhotos(loc.photos);
              setFormStep(1);
            }
          }}
        />
      </div>

      {/* Footer / Hint */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none hidden md:block">
        <div className="bg-sweet-brown/80 backdrop-blur text-white px-6 py-2 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-2xl uppercase tracking-widest border border-white/20">
          <Info size={14} /> Tap a pin to see the sweets!
        </div>
      </div>

      {/* Modals */}
      <StoreDetailModal
        store={selectedStore}
        onClose={() => setSelectedStore(null)}
        userStats={userStats}
        onToggleStat={toggleStat}
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

      {/* Hidden Admin Trigger */}
      <motion.div
        className="fixed bottom-6 left-6 z-[60] pointer-events-auto"
        whileHover={{ y: -5 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <button
          onClick={() => setShowAdmin(true)}
          className="w-10 h-10 rounded-full bg-transparent border border-transparent flex items-center justify-center text-transparent hover:text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
          title="Admin Settings"
        >
          <Settings size={16} />
        </button>
      </motion.div>
    </main >
  );
}
