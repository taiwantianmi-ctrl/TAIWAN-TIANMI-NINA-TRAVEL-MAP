import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { ref as dbRef, get, set } from "firebase/database";

export async function GET(request: NextRequest) {
  // 1. Authorization header check
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API Key is not configured" }, { status: 500 });
  }

  try {
    // 2. Fetch all stores from Firebase
    const storesRef = dbRef(db, "stores");
    const snapshot = await get(storesRef);
    if (!snapshot.exists()) {
      return NextResponse.json({ message: "No stores found" });
    }

    const storesData = snapshot.val();
    const storeIds = Object.keys(storesData);
    const results = [];

    // 3. Process each store
    for (const storeId of storeIds) {
      const store = storesData[storeId];
      if (!store.nameJP || !store.lat || !store.lng) continue;

      try {
        // Step A: Find Place ID using Find Place API
        // Use textquery with locationbias to find the correct store
        const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
          store.nameJP
        )}&inputtype=textquery&fields=place_id,photos&locationbias=circle:5000@${store.lat},${store.lng}&key=${apiKey}`;

        const findPlaceRes = await fetch(findPlaceUrl);
        const findPlaceData = await findPlaceRes.json();

        if (findPlaceData.status !== "OK" || !findPlaceData.candidates || findPlaceData.candidates.length === 0) {
          results.push({ storeId, name: store.nameJP, status: "skip", reason: "Place not found" });
          continue;
        }

        const candidate = findPlaceData.candidates[0];
        const placeId = candidate.place_id;
        let photos = candidate.photos || [];

        // Step B: If photos are empty in candidate, try Place Details API to get more photos
        if (photos.length === 0 && placeId) {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${apiKey}`;
          const detailsRes = await fetch(detailsUrl);
          const detailsData = await detailsRes.json();
          if (detailsData.status === "OK" && detailsData.result && detailsData.result.photos) {
            photos = detailsData.result.photos;
          }
        }

        if (photos.length === 0) {
          results.push({ storeId, name: store.nameJP, status: "skip", reason: "No photos found on Google Maps" });
          continue;
        }

        // Step C: Fetch redirect URLs for top 4 photos to avoid embedding API key
        const newImages: string[] = [];
        const maxPhotos = Math.min(photos.length, 4);

        for (let i = 0; i < maxPhotos; i++) {
          const photoRef = photos[i].photo_reference;
          const photoApiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photoRef}&key=${apiKey}`;

          // Fetch with HEAD method and follow redirects to get the underlying googleusercontent CDN URL
          const photoRes = await fetch(photoApiUrl, { method: "HEAD", redirect: "follow" });
          if (photoRes.ok && photoRes.url) {
            newImages.push(photoRes.url);
          }
        }

        if (newImages.length > 0) {
          // Step D: Update images in Firebase
          const storeImagesRef = dbRef(db, `stores/${storeId}/images`);
          await set(storeImagesRef, newImages);
          results.push({ storeId, name: store.nameJP, status: "updated", photosCount: newImages.length });
        } else {
          results.push({ storeId, name: store.nameJP, status: "skip", reason: "Failed to resolve photo URLs" });
        }
      } catch (storeError: any) {
        console.error(`Error processing store ${store.nameJP}:`, storeError);
        results.push({ storeId, name: store.nameJP, status: "error", error: storeError.message });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, details: results });
  } catch (error: any) {
    console.error("Cron job general error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
