import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { ref as dbRef, get, set } from "firebase/database";

export async function GET(request: NextRequest) {
  console.log("[Cron Job] Execution started.");
  
  // 1. Authorization header check
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    console.error("[Cron Job Error] CRON_SECRET is not configured in environment variables.");
    return NextResponse.json({ error: "CRON_SECRET is not configured on server" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("[Cron Job Warning] Unauthorized access attempt.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("[Cron Job Error] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.");
    return NextResponse.json({ error: "Google Maps API Key is not configured on server" }, { status: 500 });
  }

  try {
    console.log("[Cron Job] Fetching stores from Firebase...");
    // 2. Fetch all stores from Firebase
    const storesRef = dbRef(db, "stores");
    let snapshot;
    try {
      snapshot = await get(storesRef);
    } catch (fbError: any) {
      console.error("[Cron Job Error] Failed to connect to Firebase Database:", fbError);
      return NextResponse.json({ error: "Firebase Connection Failed", details: fbError.message }, { status: 500 });
    }

    if (!snapshot.exists()) {
      console.log("[Cron Job] No stores found in Firebase.");
      return NextResponse.json({ message: "No stores found" });
    }

    const storesData = snapshot.val();
    const storeIds = Object.keys(storesData);
    console.log(`[Cron Job] Found ${storeIds.length} stores to process.`);
    const results = [];

    // 3. Process each store
    for (const storeId of storeIds) {
      const store = storesData[storeId];
      if (!store.nameJP || !store.lat || !store.lng) {
        console.log(`[Cron Job] Skipping store ${storeId} due to missing key fields.`);
        continue;
      }

      console.log(`[Cron Job] Processing store: ${store.nameJP}`);
      try {
        // Step A: Find Place ID using Find Place API
        // Use textquery with locationbias to find the correct store
        const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
          store.nameJP
        )}&inputtype=textquery&fields=place_id,photos&locationbias=circle:5000@${store.lat},${store.lng}&key=${apiKey}`;

        const findPlaceRes = await fetch(findPlaceUrl);
        const findPlaceData = await findPlaceRes.json();

        if (findPlaceData.status !== "OK" || !findPlaceData.candidates || findPlaceData.candidates.length === 0) {
          console.warn(`[Cron Job] Google Place search failed for ${store.nameJP}. Status: ${findPlaceData.status}`);
          results.push({ storeId, name: store.nameJP, status: "skip", reason: `Place not found (Status: ${findPlaceData.status})` });
          continue;
        }

        const candidate = findPlaceData.candidates[0];
        const placeId = candidate.place_id;
        let photos = candidate.photos || [];

        // Step B: If photos are empty in candidate, try Place Details API to get more photos
        if (photos.length === 0 && placeId) {
          console.log(`[Cron Job] Photos missing in search candidate for ${store.nameJP}, calling Place Details...`);
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${apiKey}`;
          const detailsRes = await fetch(detailsUrl);
          const detailsData = await detailsRes.json();
          if (detailsData.status === "OK" && detailsData.result && detailsData.result.photos) {
            photos = detailsData.result.photos;
          }
        }

        if (photos.length === 0) {
          console.log(`[Cron Job] No photos found on Google Maps for ${store.nameJP}.`);
          results.push({ storeId, name: store.nameJP, status: "skip", reason: "No photos found on Google Maps" });
          continue;
        }

        // Step C: Keep Google Drive images and only update Google Maps image slots
        const currentImages: string[] = store.images || [];
        const driveImages = currentImages.filter((url: string) => 
          url.includes("drive.google.com") || url.includes("googleusercontent.com/d/")
        );
        const availableSlots = Math.max(0, 4 - driveImages.length);

        if (availableSlots <= 0) {
          console.log(`[Cron Job] Skipping ${store.nameJP}: all 4 slots occupied by Google Drive images.`);
          results.push({ storeId, name: store.nameJP, status: "skip", reason: "All 4 slots occupied by Google Drive images" });
          continue;
        }

        const mapsImages: string[] = [];
        const maxPhotos = Math.min(photos.length, availableSlots);

        for (let i = 0; i < maxPhotos; i++) {
          const photoRef = photos[i].photo_reference;
          const photoApiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photoRef}&key=${apiKey}`;

          try {
            // Fetch with HEAD method and follow redirects to get the underlying googleusercontent CDN URL
            const photoRes = await fetch(photoApiUrl, { method: "HEAD", redirect: "follow" });
            if (photoRes.ok && photoRes.url) {
              mapsImages.push(photoRes.url);
            } else {
              console.error(`[Cron Job Error] Failed to resolve photo URL for reference ${photoRef}. Status: ${photoRes.status}`);
            }
          } catch (fetchErr: any) {
            console.error(`[Cron Job Error] Failed to fetch photo redirect url:`, fetchErr);
          }
        }

        const finalImages = [...driveImages, ...mapsImages];

        if (mapsImages.length > 0 || finalImages.length !== currentImages.length) {
          // Step D: Update images in Firebase
          const storeImagesRef = dbRef(db, `stores/${storeId}/images`);
          await set(storeImagesRef, finalImages);
          console.log(`[Cron Job] Successfully updated photos for ${store.nameJP}. Drive: ${driveImages.length}, Maps: ${mapsImages.length}`);
          results.push({ storeId, name: store.nameJP, status: "updated", driveCount: driveImages.length, mapsCount: mapsImages.length });
        } else {
          console.log(`[Cron Job] No new photos resolved/changed for ${store.nameJP}.`);
          results.push({ storeId, name: store.nameJP, status: "skip", reason: "No new Google Maps images resolved" });
        }
      } catch (storeError: any) {
        console.error(`[Cron Job Error] Error processing store ${store.nameJP}:`, storeError);
        results.push({ storeId, name: store.nameJP, status: "error", error: storeError.message });
      }
    }

    console.log(`[Cron Job] Execution finished successfully. Processed: ${results.length}`);
    return NextResponse.json({ success: true, processed: results.length, details: results });
  } catch (error: any) {
    console.error("[Cron Job Error] General crash occurred:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
