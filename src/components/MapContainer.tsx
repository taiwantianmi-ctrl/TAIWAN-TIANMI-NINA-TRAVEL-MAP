"use client";

import { Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Store, Genre } from "@/types";
import { useState, useCallback, useRef, useEffect } from "react";
import { Search, MapPin, Navigation, Plus, Minus, Maximize, Move, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface MapContainerProps {
    stores: Store[];
    genres: Genre[];
    onStoreSelect: (store: Store) => void;
    userStats: { visited: string[]; favorites: string[] };
    isAdminMode?: boolean;
    onLocationSelect?: (location: { lat: number; lng: number; name?: string; photos?: string[] }) => void;
}

export function MapContainer({ stores, genres, onStoreSelect, userStats, isAdminMode, onLocationSelect }: MapContainerProps) {
    const map = useMap();
    const placesLib = useMapsLibrary("places");
    const inputRef = useRef<HTMLInputElement>(null);
    const [tempPin, setTempPin] = useState<{ lat: number; lng: number } | null>(null);
    const [showTools, setShowTools] = useState(false);
    const toolsTimerRef = useRef<NodeJS.Timeout | null>(null);

    const triggerTools = (manualToggle = false) => {
        if (manualToggle) {
            setShowTools(!showTools);
        } else {
            setShowTools(true);
        }

        if (toolsTimerRef.current) clearTimeout(toolsTimerRef.current);
        toolsTimerRef.current = setTimeout(() => {
            setShowTools(false);
        }, 2000);
    };

    useEffect(() => {
        if (!placesLib || !inputRef.current || !map || !isAdminMode) return;

        const options = {
            fields: ["name", "geometry", "photos", "formatted_address"],
            componentRestrictions: { country: "tw" },
        };

        const ac = new placesLib.Autocomplete(inputRef.current, options);
        ac.bindTo("bounds", map);

        ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            if (!place.geometry || !place.geometry.location) return;

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const photos = place.photos?.map(p => p.getUrl({ maxWidth: 800, maxHeight: 600 })) || [];

            setTempPin({ lat, lng });
            map.panTo({ lat, lng });
            map.setZoom(17);

            if (onLocationSelect) {
                onLocationSelect({ lat, lng, name: place.name, photos });
            }
        });
    }, [placesLib, map, isAdminMode, onLocationSelect]);

    const locateMe = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (map) {
                        map.panTo({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                        map.setZoom(16);
                    }
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    alert("現在地の取得に失敗しました。ブラウザの位置情報設定を確認してください。");
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            alert("お使いのブラウザは位置情報をサポートしていません。");
        }
    };

    const panMap = (dx: number, dy: number) => {
        if (map) {
            map.panBy(dx, dy);
            triggerTools();
        }
    };

    const getGenreInfo = (store: Store) => {
        if (store.genres && store.genres.length > 0) {
            const genre = genres.find(g => g.id === store.genres[0]);
            if (genre) return { icon: genre.iconUrl, color: genre.color || "#ffffff" };
        }
        return { icon: "🍡", color: "#FFB6C1" }; // Fallback
    };

    return (
        <div className="w-full h-full relative">
            {/* Admin Search Overlay */}
            {isAdminMode && (
                <div className="absolute top-20 md:top-4 left-1/2 -translate-x-1/2 z-[20] w-full max-w-md px-4 pointer-events-none">
                    <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border-4 border-white flex items-center gap-2 pointer-events-auto ring-1 ring-black/5">
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                className="w-full p-3 pl-10 rounded-xl bg-gray-50 border-none outline-none text-sm font-bold text-sweet-brown placeholder-gray-400 focus:ring-2 focus:ring-pink-200"
                                placeholder="お店を検索してピンを立てる..."
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" size={18} />
                        </div>
                    </div>
                </div>
            )}

            <Map
                defaultCenter={{ lat: 23.6978, lng: 120.9605 }}
                defaultZoom={8}
                mapId={"bf51a910020faedc"}
                disableDefaultUI={true} // カスタマイズのため一度無効化
                streetViewControl={true}
                streetViewControlOptions={{ position: 9 }} // BOTTOM_RIGHT
                clickableIcons={false}
                className="w-full h-full rounded-3xl overflow-hidden shadow-inner"
                onClick={(e) => {
                    if (isAdminMode && e.detail.latLng && onLocationSelect) {
                        const lat = e.detail.latLng.lat;
                        const lng = e.detail.latLng.lng;
                        setTempPin({ lat, lng });
                        onLocationSelect({ lat, lng });
                    }
                }}
            >
                {stores.map((store) => {
                    const info = getGenreInfo(store);
                    return (
                        <AdvancedMarker
                            key={store.id}
                            position={{ lat: store.lat, lng: store.lng }}
                            onClick={() => onStoreSelect(store)}
                        >
                            <div className={`relative group cursor-pointer transition-transform hover:scale-110 active:scale-95 ${isAdminMode ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                                {userStats.favorites.includes(store.id) && (
                                    <div className="absolute -top-2 -right-2 bg-pink-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm z-10 animate-pulse">
                                        ❤
                                    </div>
                                )}
                                {userStats.visited.includes(store.id) && (
                                    <div className="absolute -top-2 -left-2 bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm z-10 font-bold border border-white">
                                        ✓
                                    </div>
                                )}

                                <div
                                    style={{ backgroundColor: info.color }}
                                    className="w-12 h-12 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-2xl transform transition-all group-hover:rotate-12 group-hover:shadow-2xl"
                                >
                                    {info.icon}
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white/95 backdrop-blur px-3 py-1 rounded-xl shadow-lg border-2 border-white text-[10px] font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all text-sweet-brown transform translate-y-1 group-hover:translate-y-0">
                                    {store.nameJP}
                                </div>
                            </div>
                        </AdvancedMarker>
                    );
                })}

                {/* Temporary User Selection Pin */}
                {isAdminMode && tempPin && (
                    <AdvancedMarker position={tempPin}>
                        <div className="relative animate-bounce">
                            <MapPin className="text-pink-600 fill-pink-200" size={40} />
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-pink-600 text-white text-[10px] font-black px-2 py-1 rounded whitespace-nowrap shadow-xl">
                                新しい店舗
                            </div>
                        </div>
                    </AdvancedMarker>
                )}
            </Map>

            {/* Map Controls - Vertical Stack on the Right */}
            <div className="absolute bottom-24 right-4 flex flex-col items-center gap-3 z-[30] pointer-events-none">
                {/* Main Movement/Tools Group - Now on Top */}
                <div className="flex flex-col items-center gap-2 pointer-events-auto">
                    {/* Expandable Tools - Cross Keys and Zoom */}
                    <div className={`transition-all duration-500 flex flex-col items-center gap-2 ${showTools ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90 pointer-events-none'}`}>
                        {/* Directional Pad */}
                        <div className="grid grid-cols-3 gap-1 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border-2 border-white shadow-lg">
                            <div />
                            <button onClick={() => panMap(0, -100)} className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-gray-400 hover:text-pink-400 border-2 border-white"><ChevronUp size={20} /></button>
                            <div />
                            <button onClick={() => panMap(-100, 0)} className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-gray-400 hover:text-pink-400 border-2 border-white"><ChevronLeft size={20} /></button>
                            <div className="flex flex-col gap-1">
                                <button onClick={() => { map?.setZoom((map.getZoom() || 0) + 1); triggerTools(); }} className="w-10 h-8 bg-pink-50 rounded-lg flex items-center justify-center text-pink-500 hover:bg-pink-100"><Plus size={16} /></button>
                                <button onClick={() => { map?.setZoom((map.getZoom() || 0) - 1); triggerTools(); }} className="w-10 h-8 bg-pink-50 rounded-lg flex items-center justify-center text-pink-500 hover:bg-pink-100"><Minus size={16} /></button>
                            </div>
                            <button onClick={() => panMap(100, 0)} className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-gray-400 hover:text-pink-400 border-2 border-white"><ChevronRight size={20} /></button>
                            <div />
                            <button onClick={() => panMap(0, 100)} className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-gray-400 hover:text-pink-400 border-2 border-white"><ChevronDown size={20} /></button>
                            <div />
                        </div>
                    </div>

                    {/* Movement/Trigger Icon */}
                    <button
                        onClick={() => triggerTools(true)}
                        className={`w-14 h-14 rounded-3xl shadow-2xl flex items-center justify-center transition-all border-4 border-white hover:scale-110 active:scale-95 ${showTools ? 'bg-pink-400 text-white rotate-45' : 'bg-white text-gray-500 shadow-pink-100'}`}
                        title="画面移動・操作パネルを表示"
                    >
                        <Move size={24} />
                    </button>
                </div>

                {/* Locate Me - Now on Bottom */}
                <button
                    onClick={locateMe}
                    className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-gray-500 hover:text-pink-500 transition-all pointer-events-auto border-4 border-white hover:scale-110 active:scale-95"
                    title="現在地を表示"
                >
                    <Navigation size={20} />
                </button>
            </div>
        </div>
    );
}
