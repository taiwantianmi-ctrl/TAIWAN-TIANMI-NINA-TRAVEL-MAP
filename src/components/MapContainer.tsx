"use client";

import { Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Store, Genre } from "@/types";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Search, MapPin, Navigation, Plus, Minus, Maximize, Move, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { mapStyle } from "@/lib/mapStyles";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

interface MapContainerProps {
    stores: Store[];
    genres: Genre[];
    onStoreSelect: (store: Store) => void;
    userStats: { visited: string[]; favorites: string[] };
    isAdminMode?: boolean;
    onLocationSelect?: (location: { lat: number; lng: number; name?: string; photos?: string[]; address?: string }) => void;
}

export function MapContainer({ stores, genres, onStoreSelect, userStats, isAdminMode, onLocationSelect }: MapContainerProps) {
    const map = useMap();
    const placesLib = useMapsLibrary("places");
    const adminInputRef = useRef<HTMLInputElement>(null);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [tempPin, setTempPin] = useState<{ lat: number; lng: number } | null>(null);
    const [showTools, setShowTools] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const toolsTimerRef = useRef<NodeJS.Timeout | null>(null);
    const clusterer = useRef<MarkerClusterer | null>(null);
    const markerElements = useRef<Record<string, google.maps.marker.AdvancedMarkerElement>>({});
    const [isWhiteOut, setIsWhiteOut] = useState(false);
    const [zoom, setZoom] = useState(7.8);
    const [isTracking, setIsTracking] = useState(false);
    const watchIdRef = useRef<number | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [activePopup, setActivePopup] = useState<{ storeId: string, videoIds: string[], imageUrl: string | null } | null>(null);

    const getYouTubeId = (url?: string) => {
        if (!url) return null;
        const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleMarkerHover = useCallback((store: Store) => {
        // もし既にこの店舗のポップアップが開いていれば再生成しない（動画が切り替わらないように）
        if (activePopup?.storeId === store.id) return;

        let videoIds: string[] = [];
        let imageUrl = null;

        const validVideos = store.videos?.map(v => getYouTubeId(v)).filter(id => id) as string[] || [];
        if (validVideos.length > 0) {
            // シャッフルして最大4つ取得
            const shuffled = [...validVideos].sort(() => 0.5 - Math.random());
            videoIds = shuffled.slice(0, 4);
        } else if (store.images && store.images.length > 0) {
            // ランダムに画像を選択
            const randIdx = Math.floor(Math.random() * store.images.length);
            imageUrl = store.images[randIdx];
        }

        setActivePopup({ storeId: store.id, videoIds, imageUrl });
    }, [activePopup?.storeId]);

    const zoomToAll = useCallback(() => {
        if (!map || stores.length === 0) return;
        const bounds = new google.maps.LatLngBounds();
        stores.forEach(store => bounds.extend({ lat: store.lat, lng: store.lng }));
        map.fitBounds(bounds, { top: 120, bottom: 40, left: 40, right: 40 });
        triggerTools();
    }, [map, stores]);

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

    const jumpWithTransition = useCallback((targetPos: { lat: number; lng: number }, targetZoom: number) => {
        if (!map) return;

        // Start white-out
        setIsWhiteOut(true);

        // After a very short delay (for the white-out to cover), perform the jump
        setTimeout(() => {
            map.setOptions({
                center: targetPos,
                zoom: targetZoom
            });

            // Fade out the white-out
            setTimeout(() => {
                setIsWhiteOut(false);
            }, 300); // Hold white for 300ms
        }, 300); // Transition in duration
    }, [map]);

    const smoothZoomTo = useCallback((targetPos: { lat: number; lng: number }, targetZoom: number) => {
        if (!map) return;

        const startZoom = map.getZoom() || 7;
        const startCenter = map.getCenter();
        if (!startCenter) return;

        const startLat = startCenter.lat();
        const startLng = startCenter.lng();

        const zoomDiff = targetZoom - startZoom;
        const latDiff = targetPos.lat - startLat;
        const lngDiff = targetPos.lng - startLng;

        const duration = 2000; // 2 seconds for a slow, premium feel
        const frameRate = 60;
        const totalFrames = (duration / 1000) * frameRate;
        let frame = 0;

        const animate = () => {
            frame++;
            const progress = frame / totalFrames;

            // Cubic ease-in-out for the smoothest possible transition
            const easing = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            if (frame <= totalFrames) {
                map.setOptions({
                    center: {
                        lat: startLat + (latDiff * easing),
                        lng: startLng + (lngDiff * easing)
                    },
                    zoom: startZoom + (zoomDiff * easing)
                });
                requestAnimationFrame(animate);
            } else {
                map.setOptions({
                    center: targetPos,
                    zoom: targetZoom
                });
            }
        };

        requestAnimationFrame(animate);
    }, [map]);

    // Initialize Clusterer
    useEffect(() => {
        if (!map) return;
        console.log("Initializing MarkerClusterer...");

        const mc = new MarkerClusterer({
            map,
            // @ts-ignore
            zoomOnClick: false,
            renderer: {
                render: ({ count, position }) => {
                    const div = document.createElement('div');
                    div.style.width = '40px';
                    div.style.height = '40px';
                    div.style.borderRadius = '50%';
                    div.style.background = 'white';
                    div.style.border = '3px solid #FFC1CC';
                    div.style.display = 'flex';
                    div.style.alignItems = 'center';
                    div.style.justifyContent = 'center';
                    div.style.cursor = 'pointer';
                    div.style.pointerEvents = 'auto';

                    div.style.boxShadow = '0 4px 12px rgba(255, 193, 204, 0.4)';
                    div.style.outline = 'none';
                    div.style.isolation = 'isolate';
                    div.style.setProperty("transition", "transform 0.2s ease-out");
                    div.style.setProperty("-webkit-backface-visibility", "hidden");
                    div.style.backfaceVisibility = "hidden";

                    div.innerHTML = `
                        <div style="position:absolute; top:-8px; right:-8px; background:#5D4037; color:white; font-size:10px; font-weight:900; width:20px; height:20px; border-radius:10px; display:flex; align-items:center; justify-content:center; border:2px solid white;">
                            ${count}
                        </div>
                        <span style="font-size:18px; line-height:1;">🍬</span>
                    `;

                    div.onmouseenter = () => { div.style.transform = 'scale(1.1)'; };
                    div.onmouseleave = () => { div.style.transform = 'scale(1.0)'; };

                    return new google.maps.marker.AdvancedMarkerElement({
                        position,
                        content: div,
                        zIndex: 2000,
                        collisionBehavior: "REQUIRED" as any,
                    });
                }
            },
            onClusterClick: (event, cluster, map) => {
                // Zoom functionality removed as requested
                console.log("Cluster clicked:", cluster);
            }
        });

        clusterer.current = mc;

        // Add any markers that were already mounted
        const initialMarkers = Object.values(markerElements.current) as google.maps.marker.AdvancedMarkerElement[];
        if (initialMarkers.length > 0) {
            console.log(`Adding ${initialMarkers.length} existing markers to clusterer.`);
            mc.addMarkers(initialMarkers);
        }

        return () => {
            console.log("Cleaning up MarkerClusterer");
            mc.clearMarkers();
            mc.setMap(null);
            clusterer.current = null;
        };
    }, [map, jumpWithTransition]);

    // Use callback for marker mounting to handle lifecycle
    const onMarkerMount = useCallback((id: string, marker: google.maps.marker.AdvancedMarkerElement | null) => {
        if (marker) {
            markerElements.current[id] = marker;
            if (clusterer.current) {
                clusterer.current.addMarkers([marker]);
            }
        } else {
            const oldMarker = markerElements.current[id];
            if (oldMarker) {
                if (clusterer.current) {
                    clusterer.current.removeMarkers([oldMarker]);
                }
                delete markerElements.current[id];
            }
        }
    }, []);

    // Ensure clusterer is synced if stores list changes
    useEffect(() => {
        if (clusterer.current) {
            // First, remove markers that are no longer in the stores list
            const currentStoreIds = new Set(stores.map(s => s.id));
            const markersToRemove: google.maps.marker.AdvancedMarkerElement[] = [];

            Object.keys(markerElements.current).forEach(id => {
                if (!currentStoreIds.has(id)) {
                    markersToRemove.push(markerElements.current[id]);
                    delete markerElements.current[id];
                }
            });

            if (markersToRemove.length > 0) {
                clusterer.current.removeMarkers(markersToRemove);
            }

            // Then, clear and re-add all active markers to be safe and ensure sync
            clusterer.current.clearMarkers();
            const activeMarkers = Object.values(markerElements.current) as google.maps.marker.AdvancedMarkerElement[];
            clusterer.current.addMarkers(activeMarkers);
        }
    }, [stores]);

    useEffect(() => {
        if (!placesLib || !adminInputRef.current || !map || !isAdminMode) return;

        const options = {
            fields: ["name", "geometry", "photos", "formatted_address"],
            componentRestrictions: { country: "tw" },
        };

        const ac = new placesLib.Autocomplete(adminInputRef.current, options);
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
                onLocationSelect({
                    lat,
                    lng,
                    name: place.name,
                    photos,
                    address: place.formatted_address
                });
            }
        });
    }, [placesLib, map, isAdminMode, onLocationSelect]);

    const filteredStoreResults = useMemo(() => {
        if (!userSearchQuery) return [];
        return stores.filter(s =>
            s.nameJP.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
            s.nameCH.toLowerCase().includes(userSearchQuery.toLowerCase())
        ).slice(0, 5);
    }, [userSearchQuery, stores]);

    const toggleTracking = () => {
        if (!navigator.geolocation) {
            alert("お使いのブラウザは位置情報をサポートしていません。");
            return;
        }

        if (isTracking) {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            setIsTracking(false);
            toast.success("現在地の追跡を停止しました");
        } else {
            setIsTracking(true);
            toast.success("現在地の追跡を開始しました");

            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const newPos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(newPos);
                    if (map && isTracking) {
                        map.panTo(newPos);
                    }
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    setIsTracking(false);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

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
        <div className="w-full h-full relative bg-white overflow-hidden rounded-[2.5rem]">
            {/* User Search Bar - Moved to top-left and slimmed down */}
            {!isAdminMode && (
                <div className="absolute top-4 left-4 z-[50] w-[calc(100%-2rem)] max-w-[280px] pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-xl p-1 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-white/50 flex flex-col pointer-events-auto transition-all">
                        <div className="flex items-center gap-2 px-2">
                            <Search className="text-pink-400 shrink-0" size={16} />
                            <input
                                value={userSearchQuery}
                                onChange={(e) => {
                                    setUserSearchQuery(e.target.value);
                                    setShowSearchResults(true);
                                }}
                                onFocus={() => setShowSearchResults(true)}
                                className="w-full py-2 h-9 bg-transparent border-none outline-none text-xs font-bold text-sweet-brown placeholder-gray-400"
                                placeholder="お店の名前で検索..."
                            />
                            {userSearchQuery && (
                                <button onClick={() => { setUserSearchQuery(""); setShowSearchResults(false); }} className="p-1 text-gray-400 hover:text-pink-500 transition-colors">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <AnimatePresence>
                            {showSearchResults && filteredStoreResults.length > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-t border-gray-100/50"
                                >
                                    <div className="py-2">
                                        {filteredStoreResults.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => {
                                                    map?.panTo({ lat: s.lat, lng: s.lng });
                                                    map?.setZoom(17);
                                                    onStoreSelect(s);
                                                    setShowSearchResults(false);
                                                }}
                                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-pink-50 transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-sm border border-pink-50">
                                                    {getGenreInfo(s).icon}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-black text-sweet-brown">{s.nameJP}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold">{s.nameCH}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Admin Search */}
            {isAdminMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[50] w-[calc(100%-2rem)] max-w-md pointer-events-none">
                    <div className="bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-2xl border-4 border-white flex items-center gap-2 pointer-events-auto">
                        <input
                            ref={adminInputRef}
                            className="w-full p-3 pl-10 rounded-xl bg-gray-50 border-none outline-none text-sm font-bold text-sweet-brown placeholder-gray-400 focus:ring-2 focus:ring-pink-200"
                            placeholder="お店を検索してピンを立てる..."
                        />
                        <Search className="absolute left-5 text-pink-400" size={18} />
                    </div>
                </div>
            )}

            <Map
                defaultCenter={{ lat: 23.6, lng: 121.0 }}
                defaultZoom={7.8}
                onZoomChanged={(e) => setZoom(e.detail.zoom)}
                mapId={"bf51a910020faedc"}
                disableDefaultUI={true}
                gestureHandling={"greedy"}
                styles={mapStyle}
                className="w-full h-full"
                onClick={(e) => {
                    setShowSearchResults(false);
                    if (isAdminMode && e.detail.latLng && onLocationSelect) {
                        const { lat, lng } = e.detail.latLng;
                        setTempPin({ lat, lng });
                        onLocationSelect({ lat, lng });
                    }
                }}
            >
                {stores.map((store) => {
                    const info = getGenreInfo(store);
                    const isFav = userStats.favorites.includes(store.id);
                    const isVis = userStats.visited.includes(store.id);

                    return (
                        <AdvancedMarker
                            key={store.id}
                            position={{ lat: store.lat, lng: store.lng }}
                            ref={(marker) => onMarkerMount(store.id, marker)}
                            zIndex={100}
                        >
                            <div
                                onMouseEnter={() => handleMarkerHover(store)}
                                onMouseLeave={() => setActivePopup(null)}
                                onClick={(e) => {
                                    if (activePopup?.storeId === store.id) {
                                        onStoreSelect(store);
                                    } else {
                                        handleMarkerHover(store);
                                    }
                                }}
                                className="relative cursor-pointer transition-all hover:scale-110 active:scale-95 duration-300"
                                style={{
                                    pointerEvents: 'auto',
                                    transform: `scale(${zoom <= 9 ? 0.7 : zoom <= 11 ? 0.85 : zoom <= 13 ? 1.0 : zoom <= 15 ? 1.25 : 1.5})`
                                }}
                            >
                                {/* Visited Checkmark Badge */}
                                {isVis && (
                                    <div className="absolute -top-1 -right-1 z-30 w-4 h-4 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white">
                                        ✓
                                    </div>
                                )}
                                {/* Favorite Heart Badge */}
                                {isFav && (
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute -top-1 -left-1 z-30 w-4 h-4 bg-pink-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white shadow-sm"
                                    >
                                        ❤
                                    </motion.div>
                                )}

                                <div
                                    style={{ backgroundColor: info.color }}
                                    className="w-10 h-10 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-lg relative z-20"
                                >
                                    {info.icon}
                                </div>
                                
                                {/* Interactive Popup */}
                                <AnimatePresence>
                                    {activePopup?.storeId === store.id && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-72 bg-white/95 backdrop-blur-xl p-2.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border-2 border-white z-50 cursor-default"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="text-xs font-black text-sweet-brown mb-2 text-center px-1 truncate">{store.nameJP}</div>
                                            
                                            {/* ランダム選択されたメディアを表示 */}
                                            {activePopup.videoIds && activePopup.videoIds.length > 0 ? (
                                                <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden mb-2 shadow-inner">
                                                    <a 
                                                        href={`https://www.youtube.com/watch?v=${activePopup.videoIds[0]}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="absolute inset-0 z-10"
                                                        onClick={(e) => e.stopPropagation()}
                                                        title="YouTubeで見る"
                                                    />
                                                    <iframe 
                                                        src={`https://www.youtube.com/embed/${activePopup.videoIds[0]}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${activePopup.videoIds.join(',')}&vq=hd720`}
                                                        className="w-full h-full pointer-events-none"
                                                        allow="autoplay"
                                                    />
                                                </div>
                                            ) : activePopup.imageUrl ? (
                                                <div className="aspect-video w-full bg-gray-100 rounded-xl overflow-hidden mb-2 shadow-inner">
                                                    <img src={activePopup.imageUrl.includes('drive.google.com/uc') ? activePopup.imageUrl.replace(/uc\?export=view&id=([^&]+)/, 'thumbnail?id=$1&sz=w600') : activePopup.imageUrl} className="w-full h-full object-cover" />
                                                </div>
                                            ) : null}

                                            <div className="flex justify-center mt-2">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActivePopup(null);
                                                        onStoreSelect(store);
                                                    }}
                                                    className="w-[134px] py-1.5 bg-gradient-to-r from-pink-400 to-orange-400 text-white rounded-xl text-[9px] font-black hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-1"
                                                >
                                                    お店に入る ➔
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </AdvancedMarker>
                    );
                })}

                {isAdminMode && tempPin && (
                    <AdvancedMarker position={tempPin}>
                        <div className="relative animate-bounce">
                            <MapPin className="text-pink-600 fill-pink-200" size={44} />
                        </div>
                    </AdvancedMarker>
                )}
            </Map>

            {/* Premium Map Controls */}
            <div className="absolute bottom-6 right-6 flex flex-col items-center gap-4 z-[40]">
                {/* Tools Stack */}
                <div className="flex flex-col items-center gap-3">
                    <AnimatePresence>
                        {showTools && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                className="flex flex-col gap-2 p-2 bg-white/60 backdrop-blur-xl rounded-[2rem] border-2 border-white shadow-2xl overflow-hidden"
                            >
                                <button onClick={() => map?.setZoom((map.getZoom() || 0) + 1)} className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-pink-500 hover:bg-pink-50 transition-colors">
                                    <Plus size={24} strokeWidth={2.5} />
                                </button>
                                <button onClick={() => map?.setZoom((map.getZoom() || 0) - 1)} className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-pink-500 hover:bg-pink-50 transition-colors">
                                    <Minus size={24} strokeWidth={2.5} />
                                </button>
                                <div className="h-px bg-white/50 mx-2" />
                                <button onClick={zoomToAll} className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-600 hover:text-pink-500 transition-colors" title="全ピンを表示">
                                    <Maximize size={20} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={() => triggerTools(true)}
                        className={`w-16 h-16 rounded-[2rem] shadow-2xl flex items-center justify-center transition-all border-4 border-white hover:scale-110 active:scale-95 ${showTools ? 'bg-pink-400 text-white rotate-90 ' : 'bg-white text-gray-500 shadow-pink-100'}`}
                    >
                        <Move size={28} />
                    </button>

                    <button
                        onClick={toggleTracking}
                        className={`w-14 h-14 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center transition-all border-4 border-white hover:scale-110 active:scale-95 ${isTracking ? 'bg-blue-500 text-white shadow-blue-100' : 'bg-white/90 text-gray-500 hover:text-pink-500'}`}
                        title={isTracking ? "追跡停止" : "現在地を追跡"}
                    >
                        <Navigation size={24} className={isTracking ? "animate-pulse" : ""} />
                    </button>
                </div>
            </div>

            {/* White-out for transitions */}
            <AnimatePresence>
                {isWhiteOut && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white z-[100] pointer-events-none"
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
