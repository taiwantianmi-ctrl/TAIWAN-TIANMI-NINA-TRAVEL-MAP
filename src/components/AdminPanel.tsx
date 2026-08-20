"use client";

import { useState, useRef, useEffect } from "react";
import { Store, Genre } from "@/types";
import { ref as dbRef, push, set, remove, onValue, get } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { X, Plus, Trash2, Edit2, Save, Lock, Search, Image as ImageIcon, Loader2, Map as MapIcon, Tag, LayoutGrid, CheckCircle, Settings, Key, ChevronLeft, Upload, Globe, Instagram, ShoppingBag } from "lucide-react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

interface AdminPanelProps {
    stores: Store[];
    genres: Genre[];
    onClose: () => void;
    editingStore: Partial<Store> | null;
    setEditingStore: (store: Partial<Store> | null) => void;
    googlePhotos: string[];
    setGooglePhotos: (photos: string[]) => void;
    formStep: 1 | 2;
    setFormStep: (step: 1 | 2) => void;
}

const PRESET_ICONS = [
    "🟨", "🥧", "🍬", "🥔", "🍠", "🍍", "🍊", "🥭", "🍡", "🥛", "🍒", "🍰", "🍪", "🍩", "🍦", "🍮", "🍭", "🍫", "🍵", "🥤",
    "🌽", "🍓", "🍿", "🍥", "🍃", "🍋", "🥫", "🥮", "🍧", "☁️"
];

const PRESET_COLORS = [
    "#FF9AA2", "#FFB7B2", "#FFDAC1", "#E2F0CB", "#B5EAD7", "#C7CEEA", "#F8C8DC", "#B2E2F2", "#D4A5FF", "#FFCCF9",
    "#FFF9C4", "#FFECB3", "#FFE0B2", "#FFCCBC", "#F0F4C3", "#D1C4E9", "#C5CAE9", "#B3E5FC", "#B2DFDB", "#C8E6C9"
];

export function AdminPanel({
    stores,
    genres,
    onClose,
    editingStore,
    setEditingStore,
    googlePhotos,
    setGooglePhotos,
    formStep,
    setFormStep
}: AdminPanelProps) {
    const placesLib = useMapsLibrary("places");
    const [activeTab, setActiveTab] = useState<"stores" | "genres" | "settings">("stores");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [inputPassword, setInputPassword] = useState("");
    const [dbPassword, setDbPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [editingGenre, setEditingGenre] = useState<Partial<Genre> | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [manualImageUrl, setManualImageUrl] = useState("");

    useEffect(() => {
        const passRef = dbRef(db, "admin/password");
        onValue(passRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setDbPassword(data);
            else { set(passRef, "admin123"); setDbPassword("admin123"); }
        });
    }, []);

    useEffect(() => {
        if (editingStore && !editingStore.id && editingStore.lat !== 23.6978 && formStep === 1) {
            setFormStep(2);
        }
    }, [editingStore, formStep, setFormStep]);

    const handleLogin = () => { if (inputPassword === dbPassword) { setIsAuthenticated(true); toast.success("管理モードでログインしました"); } else toast.error("パスワードが違います"); };

    const handleUpdatePassword = async () => {
        if (newPassword.length < 4) { toast.error("4文字以上入力してください"); return; }
        try { await set(dbRef(db, "admin/password"), newPassword); toast.success("パスワードを更新しました"); setNewPassword(""); } catch (e) { toast.error("更新に失敗しました"); console.error(e); }
    };

    const handleSaveStore = async () => {
        if (!editingStore?.nameJP || !editingStore.lat || !editingStore.lng) {
            toast.error("必要事項を入力してください (店名・場所)");
            return;
        }

        setIsSaving(true);
        try {
            // Cleanup data to ensure no undefined values are sent to Firebase
            const dataToSave: any = {
                nameJP: editingStore.nameJP,
                nameCH: editingStore.nameCH || "",
                descriptionJP: editingStore.descriptionJP || "",
                descriptionCH: editingStore.descriptionCH || "",
                addressJP: editingStore.addressJP || "",
                addressCH: editingStore.addressCH || "",
                lat: editingStore.lat,
                lng: editingStore.lng,
                genres: editingStore.genres || [],
                images: editingStore.images || [],
                videos: (editingStore.videos || []).filter(v => v && v.trim() !== ""),
                website: editingStore.website || "",
                instagram: editingStore.instagram || "",
                buyUrl: editingStore.buyUrl || "",
            };

            if (editingStore.id) {
                dataToSave.id = editingStore.id;
                await set(dbRef(db, `stores/${editingStore.id}`), dataToSave);
            } else {
                const newRef = push(dbRef(db, "stores"));
                dataToSave.id = newRef.key;
                await set(newRef, dataToSave);
            }

            toast.success(editingStore.id ? "店舗情報を更新しました" : "新しい店舗を追加しました");
            setEditingStore(null);
            setFormStep(1);
            setGooglePhotos([]);
        } catch (e) {
            toast.error("保存に失敗しました");
            console.error("Save store error:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveGenre = async () => {
        if (!editingGenre?.nameJP || !editingGenre.iconUrl || !editingGenre.color) {
            toast.error("必須項目を入力してください");
            return;
        }

        setIsSaving(true);
        try {
            const dataToSave: any = {
                nameJP: editingGenre.nameJP,
                nameCH: editingGenre.nameCH || "",
                iconUrl: editingGenre.iconUrl,
                color: editingGenre.color,
            };

            if (editingGenre.id) {
                dataToSave.id = editingGenre.id;
                await set(dbRef(db, `genres/${editingGenre.id}`), dataToSave);
            } else {
                const newRef = push(dbRef(db, "genres"));
                dataToSave.id = newRef.key;
                await set(newRef, dataToSave);
            }

            toast.success(editingGenre.id ? "ジャンルを更新しました" : "新しいジャンルを追加しました");
            setEditingGenre(null);
        } catch (e) {
            toast.error("保存に失敗しました");
            console.error("Save genre error:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingLogo(true);
        try {
            const storagePath = `admin/logo_${Date.now()}`;
            const fileRef = storageRef(storage, storagePath);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            await set(dbRef(db, "admin/logoUrl"), url);
            toast.success("ロゴを更新しました！");
        } catch (e) {
            console.error(e);
            toast.error("アップロードに失敗しました");
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleDeleteStore = async (storeId: string) => {
        if (!window.confirm("この店舗を削除してもよろしいですか？")) return;
        try {
            await remove(dbRef(db, `stores/${storeId}`));
            toast.success("店舗を削除しました");
            if (editingStore?.id === storeId) {
                setEditingStore(null);
                setFormStep(1);
            }
        } catch (e) {
            console.error(e);
            toast.error("削除に失敗しました");
        }
    };

    const handleDeleteGenre = async (genreId: string) => {
        if (!window.confirm("このジャンルを削除してもよろしいですか？")) return;
        try {
            await remove(dbRef(db, `genres/${genreId}`));
            toast.success("ジャンルを削除しました");
            if (editingGenre?.id === genreId) {
                setEditingGenre(null);
            }
        } catch (e) {
            console.error(e);
            toast.error("削除に失敗しました");
        }
    };

    const fetchGooglePhotos = async () => {
        if (!placesLib || !editingStore?.nameJP) return;
        setIsUploadingLogo(true); // Reuse loading state or add new one
        try {
            const service = new placesLib.PlacesService(document.createElement("div"));
            // Search for the place
            const request = {
                query: editingStore.nameJP,
                fields: ["photos", "place_id"],
                locationBias: editingStore.lat && editingStore.lng ? { lat: editingStore.lat, lng: editingStore.lng } : undefined
            };

            service.findPlaceFromQuery(request, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
                if (status === placesLib.PlacesServiceStatus.OK && results && results[0]) {
                    const placeId = results[0].place_id;
                    if (placeId) {
                        service.getDetails({ placeId, fields: ["photos"] }, (place: google.maps.places.PlaceResult | null, detailStatus: google.maps.places.PlacesServiceStatus) => {
                            if (detailStatus === placesLib.PlacesServiceStatus.OK && place?.photos) {
                                // Important: Use maxWidth/maxHeight to get high-res URLs that are more stable
                                const urls = place.photos.map((p: google.maps.places.PlacePhoto) => p.getUrl({ maxWidth: 1200, maxHeight: 1000 }));
                                setGooglePhotos(urls);
                                toast.success(`${urls.length}枚の写真を見つけました`);
                            } else {
                                toast.error("写真が見つかりませんでした");
                            }
                        });
                    }
                } else {
                    toast.error("店舗が見つかりませんでした");
                }
                setIsUploadingLogo(false);
            });
        } catch (e) {
            console.error(e);
            toast.error("エラーが発生しました");
            setIsUploadingLogo(false);
        }
    };

    const toggleGenreSelection = (genreId: string) => {
        const current = editingStore?.genres || [];
        const updated = current.includes(genreId) ? current.filter(id => id !== genreId) : [...current, genreId];
        setEditingStore({ ...editingStore, genres: updated });
    };

    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 z-[100] bg-pastel-lavender/40 backdrop-blur-xl flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border-4 border-white">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Lock className="text-pink-400" size={32} /></div>
                    <h2 className="text-xl md:text-2xl font-black text-sweet-brown mb-2 tracking-tighter">管理者モード</h2>
                    <input type="password" placeholder="パスワード..." className="w-full px-6 py-4 rounded-xl bg-gray-50 border-2 border-transparent focus:border-pink-200 outline-none mb-6 font-bold text-center" value={inputPassword} onChange={e => setInputPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} autoFocus />
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-4 rounded-xl bg-gray-100 font-black text-gray-500">キャンセル</button>
                        <button onClick={handleLogin} className="flex-1 py-4 rounded-xl bg-pink-400 text-white font-black shadow-lg">ログイン</button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const showSidebar = !editingStore && !editingGenre && activeTab !== "settings";

    return (
        <div className="fixed inset-0 z-[100] flex flex-col transition-all overflow-hidden pointer-events-none">
            {/* Background Backdrop only for Form mode Step 2 */}
            {editingStore && formStep === 2 && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={() => setEditingStore(null)} />}

            <header className="px-4 md:px-6 py-4 flex justify-between items-center relative z-20 pointer-events-auto shrink-0">
                <div className="bg-white/95 md:bg-white/90 backdrop-blur-md px-4 md:px-6 py-2 rounded-2xl shadow-xl border-2 border-white flex items-center gap-2 md:gap-6">
                    <h1 className="text-sm md:text-lg font-black text-sweet-brown tracking-tighter border-r pr-3 md:pr-6 border-gray-100 hidden xs:block">管理</h1>
                    <nav className="flex gap-1">
                        <button onClick={() => { setActiveTab("stores"); setEditingStore(null); setEditingGenre(null); setFormStep(1); }} className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all ${activeTab === "stores" ? "bg-sweet-brown text-white shadow-md" : "text-gray-400"}`}>店舗</button>
                        <button onClick={() => { setActiveTab("genres"); setEditingStore(null); setEditingGenre(null); }} className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all ${activeTab === "genres" ? "bg-pastel-blue text-blue-700 shadow-md" : "text-gray-400"}`}>ジャンル</button>
                        <button onClick={() => { setActiveTab("settings"); setEditingStore(null); setEditingGenre(null); }} className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all ${activeTab === "settings" ? "bg-gray-700 text-white shadow-md" : "text-gray-400"}`}>設定</button>
                    </nav>
                </div>
                <button onClick={onClose} className="w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border-2 border-white flex items-center justify-center text-gray-400 hover:text-pink-500 pointer-events-auto transition-colors"><X size={20} /></button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <aside className={`fixed md:relative inset-y-0 left-0 w-full md:w-80 p-4 md:p-6 flex flex-col pointer-events-none transition-all duration-300 transform ${showSidebar ? "translate-x-0 opacity-100" : "-translate-x-full md:translate-x-0 opacity-0 md:opacity-100 md:pointer-events-none"}`}>
                    <div className="bg-white/95 md:bg-white/90 backdrop-blur-md rounded-[2rem] shadow-2xl border-2 border-white flex-1 flex flex-col overflow-hidden pointer-events-auto">
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">リスト</h3>
                            {activeTab === "genres" && <button onClick={() => setEditingGenre({ nameJP: "", nameCH: "", iconUrl: "🟨", color: "#FF9AA2" })} className="p-2 bg-pastel-blue text-blue-700 rounded-lg shadow-md"><Plus size={16} strokeWidth={3} /></button>}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-none text-sweet-brown">
                            {activeTab === "stores" ? stores.map(store => (
                                <div key={store.id} className="p-3 bg-gray-50/50 rounded-xl border border-transparent flex justify-between items-center hover:bg-white hover:shadow-sm">
                                    <span className="font-bold text-[10px] md:text-xs truncate max-w-[120px]">{store.nameJP}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setEditingStore(store); setGooglePhotos([]); setFormStep(2); }} className="p-1.5 bg-white text-blue-500 rounded-lg shadow-sm hover:text-blue-600"><Edit2 size={12} /></button>
                                        <button onClick={() => handleDeleteStore(store.id)} className="p-1.5 bg-white text-red-100 hover:text-red-500"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            )) : activeTab === "genres" ? genres.map(genre => (
                                <div key={genre.id} className="p-2 bg-gray-50/50 rounded-xl border border-transparent flex justify-between items-center hover:bg-white hover:shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div style={{ backgroundColor: genre.color || "#ffffff" }} className="w-6 h-6 rounded flex items-center justify-center text-sm shadow-sm border border-white">{genre.iconUrl}</div>
                                        <span className="font-bold text-[10px] md:text-xs">{genre.nameJP}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => setEditingGenre(genre)} className="p-1.5 bg-white text-blue-500 rounded-lg shadow-sm hover:text-blue-600"><Edit2 size={12} /></button>
                                        <button onClick={() => handleDeleteGenre(genre.id)} className="p-1.5 bg-white text-red-100 hover:text-red-500"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            )) : null}
                        </div>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 relative z-10 transition-all duration-300 overflow-hidden pointer-events-none">
                    <AnimatePresence mode="wait">
                        {editingStore && formStep === 2 && (
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-4xl bg-white shadow-2xl rounded-[2rem] md:rounded-[3rem] border-4 border-white overflow-hidden flex flex-col max-h-full pointer-events-auto">
                                <div className="p-6 md:p-10 space-y-6 md:space-y-10 overflow-y-auto scrollbar-none">
                                    <div className="flex flex-col md:flex-row md:items-end justify-between border-b pb-4 md:pb-6 gap-4">
                                        <div>
                                            <button onClick={() => setFormStep(1)} className="text-pink-500 text-[10px] font-black mb-1 flex items-center gap-1"><ChevronLeft size={14} /> 場所を修正</button>
                                            <h2 className="text-xl md:text-3xl font-black text-sweet-brown tracking-tighter">店舗情報入力</h2>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingStore(null)} className="flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl bg-gray-100 font-black text-gray-500 text-xs md:text-sm">中止</button>
                                            <button
                                                onClick={handleSaveStore}
                                                disabled={isSaving}
                                                className="flex-1 md:flex-none px-6 md:px-12 py-3 rounded-xl bg-pink-400 text-white font-black shadow-lg text-xs md:text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                保存
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-12 pb-10">
                                        <div className="md:col-span-3 space-y-6">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <input className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-pink-200 outline-none font-bold text-sm" placeholder="店名 (日本語)" value={editingStore.nameJP || ""} onChange={e => setEditingStore({ ...editingStore, nameJP: e.target.value })} />
                                                    <input className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-pink-200 outline-none font-bold text-sweet-brown/60 text-sm" placeholder="店名 (現地語)" value={editingStore.nameCH || ""} onChange={e => setEditingStore({ ...editingStore, nameCH: e.target.value })} />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="relative">
                                                        <input className="w-full p-3 pl-9 rounded-xl border-2 border-gray-100 focus:border-pink-200 outline-none text-xs font-medium" placeholder="住所 (日本語)" value={editingStore.addressJP || ""} onChange={e => setEditingStore({ ...editingStore, addressJP: e.target.value })} />
                                                        <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                                    </div>
                                                    <div className="relative">
                                                        <input className="w-full p-3 pl-9 rounded-xl border-2 border-gray-100 focus:border-pink-200 outline-none text-xs font-medium text-sweet-brown/60" placeholder="住所 (現地語)" value={editingStore.addressCH || ""} onChange={e => setEditingStore({ ...editingStore, addressCH: e.target.value })} />
                                                        <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300/60" size={14} />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="relative">
                                                        <input className="w-full p-3 pl-9 rounded-xl border-2 border-gray-100 focus:border-pink-200 outline-none text-xs font-medium text-blue-600" placeholder="ホームページURL" value={editingStore.website || ""} onChange={e => setEditingStore({ ...editingStore, website: e.target.value })} />
                                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={14} />
                                                    </div>
                                                    <div className="relative">
                                                        <input className="w-full p-3 pl-9 rounded-xl border-2 border-gray-100 focus:border-pink-200 outline-none text-xs font-medium text-pink-600" placeholder="Instagram URL" value={editingStore.instagram || ""} onChange={e => setEditingStore({ ...editingStore, instagram: e.target.value })} />
                                                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-300" size={14} />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="relative">
                                                        <input className="w-full p-3 pl-9 rounded-xl border-2 border-orange-100 focus:border-orange-200 outline-none text-xs font-medium text-orange-600" placeholder="「商品を購入する」リンクURL (購入ページ)" value={editingStore.buyUrl || ""} onChange={e => setEditingStore({ ...editingStore, buyUrl: e.target.value })} />
                                                        <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-300" size={14} />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-gray-400 ml-1 uppercase">紹介文 (日本語)</p>
                                                        <textarea className="w-full p-4 rounded-xl border-2 border-gray-100 h-24 md:h-32 resize-none focus:border-pink-200 outline-none font-medium text-xs leading-relaxed" placeholder="日本語で紹介を入力..." value={editingStore.descriptionJP || ""} onChange={e => setEditingStore({ ...editingStore, descriptionJP: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-gray-400 ml-1 uppercase">アレックスのおすすめポイント</p>
                                                        <textarea className="w-full p-4 rounded-xl border-2 border-gray-100 h-24 md:h-32 resize-none focus:border-pink-200 outline-none font-medium text-xs leading-relaxed text-sweet-brown/80" placeholder="アレックスがおすすめするポイントや詳細情報を入力..." value={editingStore.descriptionCH || ""} onChange={e => setEditingStore({ ...editingStore, descriptionCH: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4 md:p-8 bg-pastel-pink/5 rounded-2xl md:rounded-[2.5rem] border-2 border-pastel-pink/10">
                                                <h3 className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Tag size={14} /> ジャンル (最大4)</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {genres.map(genre => {
                                                        const isSelected = editingStore.genres?.includes(genre.id);
                                                        return <button key={genre.id} onClick={() => toggleGenreSelection(genre.id)} className={`px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all flex items-center gap-2 ${isSelected ? "bg-pink-400 text-white shadow-lg" : "bg-white border md:border-2 border-gray-100 text-gray-400"}`}><span style={{ backgroundColor: genre.color }} className="w-4 h-4 md:w-5 md:h-5 rounded flex items-center justify-center text-[10px] shadow-sm">{genre.iconUrl}</span>{genre.nameJP}</button>;
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-6">
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">画像選択 (最大4)</h3>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={fetchGooglePhotos}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black hover:bg-blue-100 transition-colors"
                                                        >
                                                            <Search size={12} strokeWidth={3} />
                                                            Google画像を取得
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2 mb-4">
                                                    {editingStore.images?.map((url, i) => (
                                                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-pink-100 group">
                                                            <img src={url.includes('drive.google.com/uc') ? url.replace(/uc\?export=view&id=([^&]+)/, 'thumbnail?id=$1&sz=w1000') : url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                            <button
                                                                onClick={() => setEditingStore({ ...editingStore, images: editingStore.images?.filter((_, idx) => idx !== i) })}
                                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {(!editingStore.images || editingStore.images.length === 0) && <div className="col-span-3 aspect-[3/1] rounded-xl border-2 border-dashed border-gray-100 flex items-center justify-center text-gray-300 text-[10px] font-black uppercase tracking-widest leading-none">未選択</div>}
                                                </div>
                                                <div className="flex gap-2 mb-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Google Driveのリンクなどを入力..."
                                                        className="flex-1 p-2 md:p-3 rounded-xl border-2 border-gray-100 focus:border-pink-200 outline-none text-xs font-medium"
                                                        value={manualImageUrl}
                                                        onChange={(e) => setManualImageUrl(e.target.value)}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            if (!manualImageUrl) return;
                                                            let url = manualImageUrl;
                                                            // Google Driveリンクを直接画像URLに変換
                                                            let driveId = "";
                                                            const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                                                            const match2 = url.match(/id=([a-zA-Z0-9_-]+)/);
                                                            if (match1 && match1[1]) driveId = match1[1];
                                                            else if (match2 && match2[1]) driveId = match2[1];
                                                            
                                                            if (driveId) {
                                                                // 最近のGoogle Driveの仕様変更に対応するため、thumbnailエンドポイントを使用
                                                                url = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
                                                            }
                                                            const current = editingStore.images || [];
                                                            if (current.length >= 4) {
                                                                toast.error("画像は最大4枚までです");
                                                                return;
                                                            }
                                                            setEditingStore({ ...editingStore, images: [...current, url] });
                                                            setManualImageUrl("");
                                                        }}
                                                        className="px-4 py-2 bg-pink-50 text-pink-600 rounded-xl text-xs font-black hover:bg-pink-100 transition-colors whitespace-nowrap"
                                                    >
                                                        追加
                                                    </button>
                                                </div>
                                                <div className={`p-3 bg-blue-50/30 rounded-2xl border-2 border-blue-50 transition-all ${googlePhotos.length === 0 ? 'opacity-50 grayscale' : ''}`}>
                                                    {googlePhotos.length === 0 ? (
                                                        <div className="py-8 text-center">
                                                            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">上のボタンで取得</p>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-4 gap-2 max-h-40 md:max-h-60 overflow-y-auto scrollbar-thin">
                                                            {googlePhotos.map((url, i) => {
                                                                const isSelected = editingStore.images?.includes(url);
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => {
                                                                            const current = editingStore.images || [];
                                                                            if (isSelected) setEditingStore({ ...editingStore, images: current.filter(u => u !== url) });
                                                                            else if (current.length < 4) setEditingStore({ ...editingStore, images: [...current, url] });
                                                                        }}
                                                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${isSelected ? "border-blue-400" : "border-transparent"}`}
                                                                    >
                                                                        <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                                        {isSelected && <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"><CheckCircle size={14} className="text-white" /></div>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">YouTubeリンク (最大4)</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {[0, 1, 2, 3].map(i => (
                                                        <div key={i} className="relative">
                                                            <input
                                                                type="text"
                                                                className="w-full p-4 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-pink-300 outline-none font-medium text-xs md:text-sm transition-all shadow-sm focus:bg-white"
                                                                placeholder={`URL ${i + 1}`}
                                                                value={editingStore.videos?.[i] || ""}
                                                                onChange={e => {
                                                                    const v = [...(editingStore.videos || [])];
                                                                    v[i] = e.target.value;
                                                                    setEditingStore({ ...editingStore, videos: v });
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {editingGenre && (
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-2xl bg-white shadow-2xl rounded-2xl md:rounded-[3rem] border-4 border-white p-6 md:p-10 space-y-6 md:space-y-10 pointer-events-auto">
                                <div className="flex items-end justify-between border-b pb-4">
                                    <h2 className="text-xl md:text-2xl font-black text-sweet-brown tracking-tighter">ジャンル編集</h2>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingGenre(null)} className="px-4 py-3 rounded-xl bg-gray-100 font-black text-gray-500 text-xs md:text-sm">キャンセル</button>
                                        <button
                                            onClick={handleSaveGenre}
                                            disabled={isSaving}
                                            className="px-4 py-3 rounded-xl bg-pastel-blue text-blue-700 font-black shadow-lg text-xs md:text-sm flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isSaving && <Loader2 size={16} className="animate-spin" />}
                                            保存
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                    <div className="space-y-4">
                                        <input className="w-full p-4 rounded-xl border-2 border-gray-50 outline-none font-bold text-sm md:text-lg" placeholder="表示名" value={editingGenre.nameJP || ""} onChange={e => setEditingGenre({ ...editingGenre, nameJP: e.target.value })} />
                                        <div className="p-6 bg-gray-50 rounded-2xl flex flex-col items-center gap-2">
                                            <div style={{ backgroundColor: editingGenre.color }} className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border-2 border-white">{editingGenre.iconUrl}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-5 gap-2">{PRESET_ICONS.map(icon => <button key={icon} onClick={() => setEditingGenre({ ...editingGenre, iconUrl: icon })} className={`w-10 h-10 flex items-center justify-center rounded-lg ${editingGenre.iconUrl === icon ? "bg-white shadow-md ring-2 ring-blue-100" : "bg-gray-50 text-xl"}`}>{icon}</button>)}</div>
                                        <div className="grid grid-cols-5 gap-2">{PRESET_COLORS.map(color => <button key={color} onClick={() => setEditingGenre({ ...editingGenre, color: color })} className={`w-10 h-10 rounded-lg ${editingGenre.color === color ? "ring-2 ring-blue-100 shadow-sm" : ""}`} style={{ backgroundColor: color }} />)}</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "settings" && (
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-sm bg-white shadow-2xl rounded-2xl md:rounded-[3rem] border-4 border-white p-8 md:p-12 space-y-6 pointer-events-auto text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto shadow-inner"><Key className="text-gray-400" size={24} /></div>
                                <h2 className="text-xl md:text-2xl font-black text-sweet-brown tracking-tighter leading-none">管理者設定</h2>
                                <div className="text-left space-y-4">
                                    <input type="password" className="w-full p-4 rounded-xl bg-gray-50 border-none outline-none font-bold text-center text-sm" placeholder="新しいパスワード (4文字〜)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                    <button onClick={handleUpdatePassword} className="w-full py-4 rounded-xl bg-gray-800 text-white font-black shadow-lg hover:bg-black transition-all text-sm flex items-center justify-center gap-2"><Save size={18} /> パスワード更新</button>

                                    <div className="pt-8 border-t border-gray-100">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">ショップロゴ変更</h3>
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all">
                                            {isUploadingLogo ? (
                                                <Loader2 className="animate-spin text-pink-400" />
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <Upload className="text-gray-300 mb-2" size={24} />
                                                    <span className="text-[10px] font-bold text-gray-400">画像を選択してアップロード</span>
                                                </div>
                                            )}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                                        </label>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
