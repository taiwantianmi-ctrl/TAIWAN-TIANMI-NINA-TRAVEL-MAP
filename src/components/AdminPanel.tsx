"use client";

import { useState, useRef, useEffect } from "react";
import { Store, Genre } from "@/types";
import { ref as dbRef, push, set, remove, onValue, get } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { X, Plus, Trash2, Edit2, Save, Lock, Search, Image as ImageIcon, Loader2, Map as MapIcon, Tag, LayoutGrid, CheckCircle, Settings, Key, ChevronLeft } from "lucide-react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "framer-motion";

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
    "🟨", "🥧", "🍬", "🥔", "🍠", "🍍", "🍊", "🥭", "🍡", "🥛", "🍒", "🍰", "🍪", "🍩", "🍦", "🍮", "🍭", "🍫", "🍵", "🥤"
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
    const [activeTab, setActiveTab] = useState<"stores" | "genres" | "settings">("stores");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [inputPassword, setInputPassword] = useState("");
    const [dbPassword, setDbPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [editingGenre, setEditingGenre] = useState<Partial<Genre> | null>(null);

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

    const handleLogin = () => { if (inputPassword === dbPassword) setIsAuthenticated(true); else alert("パスワードが違います"); };

    const handleUpdatePassword = async () => {
        if (newPassword.length < 4) { alert("4文字以上入力してください"); return; }
        try { await set(dbRef(db, "admin/password"), newPassword); alert("更新完了"); setNewPassword(""); } catch (e) { console.error(e); }
    };

    const handleSaveStore = async () => {
        if (!editingStore?.nameJP || !editingStore.lat || !editingStore.lng) { alert("必須項目を入力してください"); return; }
        try {
            if (editingStore.id) await set(dbRef(db, `stores/${editingStore.id}`), editingStore);
            else await push(dbRef(db, "stores"), editingStore);
            setEditingStore(null); setFormStep(1); setGooglePhotos([]);
        } catch (e) { console.error(e); }
    };

    const handleSaveGenre = async () => {
        if (!editingGenre?.nameJP || !editingGenre.iconUrl || !editingGenre.color) { alert("必須項目を入力してください"); return; }
        try {
            if (editingGenre.id) await set(dbRef(db, `genres/${editingGenre.id}`), editingGenre);
            else await push(dbRef(db, "genres"), editingGenre);
            setEditingGenre(null);
        } catch (e) { console.error(e); }
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
        <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col bg-white/50 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none transition-all">
            <header className="px-4 md:px-6 py-4 flex justify-between items-center pointer-events-auto">
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
                                        <button onClick={() => { if (confirm("消去しますか？")) remove(dbRef(db, `stores/${store.id}`)); }} className="p-1.5 bg-white text-red-100 hover:text-red-500"><Trash2 size={12} /></button>
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
                                        <button onClick={() => { if (confirm("消去しますか？")) remove(dbRef(db, `genres/${genre.id}`)); }} className="p-1.5 bg-white text-red-100 hover:text-red-500"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            )) : null}
                        </div>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 relative pointer-events-none overflow-hidden">
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
                                            <button onClick={handleSaveStore} className="flex-1 md:flex-none px-6 md:px-12 py-3 rounded-xl bg-pink-400 text-white font-black shadow-lg text-xs md:text-sm flex items-center justify-center gap-2"><Save size={16} /> 保存</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-12 pb-10">
                                        <div className="md:col-span-3 space-y-6">
                                            <div className="space-y-3">
                                                <input className="w-full p-3 md:p-4 rounded-xl border-2 border-gray-100 focus:border-pink-200 outline-none font-bold text-sm md:text-lg" placeholder="店名 (日)" value={editingStore.nameJP || ""} onChange={e => setEditingStore({ ...editingStore, nameJP: e.target.value })} />
                                                <input className="w-full p-3 md:p-4 rounded-xl border-2 border-gray-100 focus:border-pink-200 outline-none font-bold text-sweet-brown/60 text-sm md:text-lg" placeholder="店名 (中)" value={editingStore.nameCH || ""} onChange={e => setEditingStore({ ...editingStore, nameCH: e.target.value })} />
                                                <textarea className="w-full p-4 md:p-6 rounded-xl border-2 border-gray-100 h-32 md:h-48 resize-none focus:border-pink-200 outline-none font-medium text-xs md:text-sm leading-relaxed" placeholder="紹介文..." value={editingStore.descriptionJP || ""} onChange={e => setEditingStore({ ...editingStore, descriptionJP: e.target.value })} />
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
                                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">画像選択 (Google)</h3>
                                                <div className="grid grid-cols-3 gap-2 mb-4">
                                                    {editingStore.images?.map((url, i) => <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-pink-100 group"><img src={url} className="w-full h-full object-cover" /><button onClick={() => setEditingStore({ ...editingStore, images: editingStore.images?.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100"><X size={10} /></button></div>)}
                                                    {(!editingStore.images || editingStore.images.length === 0) && <div className="col-span-3 aspect-[3/1] rounded-xl border-2 border-dashed border-gray-100 flex items-center justify-center text-gray-300 text-[10px] font-black uppercase tracking-widest leading-none">未選択</div>}
                                                </div>
                                                <div className="p-3 bg-blue-50/30 rounded-2xl border-2 border-blue-50">
                                                    <div className="grid grid-cols-4 gap-2 max-h-40 md:max-h-60 overflow-y-auto scrollbar-thin">
                                                        {googlePhotos.map((url, i) => {
                                                            const isSelected = editingStore.images?.includes(url);
                                                            return <button key={i} onClick={() => { const current = editingStore.images || []; if (isSelected) setEditingStore({ ...editingStore, images: current.filter(u => u !== url) }); else if (current.length < 6) setEditingStore({ ...editingStore, images: [...current, url] }); }} className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${isSelected ? "border-blue-400" : "border-transparent"}`}><img src={url} className="w-full h-full object-cover" />{isSelected && <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"><CheckCircle size={14} className="text-white" /></div>}</button>;
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">YouTubeリンク</h3>
                                                {[0, 1].map(i => <input key={i} className="w-full p-3 rounded-xl bg-gray-50 border-none text-[10px] font-bold outline-none" placeholder={`YouTube URL ${i + 1}`} value={editingStore.videos?.[i] || ""} onChange={e => { const v = [...(editingStore.videos || [])]; v[i] = e.target.value; setEditingStore({ ...editingStore, videos: v }); }} />)}
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
                                        <button onClick={handleSaveGenre} className="px-4 py-3 rounded-xl bg-pastel-blue text-blue-700 font-black shadow-lg text-xs md:text-sm">保存</button>
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
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
