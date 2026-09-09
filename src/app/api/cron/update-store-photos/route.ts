import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { ref as dbRef, get, set } from "firebase/database";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  console.log("[Cron Job] Execution started.");

  const { searchParams } = new URL(request.url);
  const isForce = searchParams.get("force") === "true";
  const isManual = searchParams.get("manual") === "true";

  // 1. Authorization check
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1" || 
                       request.headers.get("user-agent")?.toLowerCase().includes("vercel-cron");
  const hasValidSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  // Allow execution if:
  // - Valid CRON_SECRET is provided in Authorization header
  // - Or triggered by Vercel Cron internally
  // - Or triggered manually via admin panel (manual=true / force=true)
  // - Or CRON_SECRET is not configured yet (prevents 500 crashes on default Vercel setups)
  const isAuthorized = hasValidSecret || isVercelCron || isManual || isForce || !process.env.CRON_SECRET;

  if (!isAuthorized) {
    console.warn("[Cron Job Warning] Unauthorized access attempt.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyBGrYGGrpWlFSTszAmZv0n4Rbta62xU830";

  try {
    console.log("[Cron Job] Fetching stores from Firebase...");
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
    const FORTY_HOURS_MS = 40 * 60 * 60 * 1000;
    const now = Date.now();

    // 2. Process each store
    for (const storeId of storeIds) {
      const store = storesData[storeId];
      if (!store || (!store.nameJP && !store.nameCH) || !store.lat || !store.lng) {
        console.log(`[Cron Job] Skipping store ${storeId} due to missing key fields.`);
        continue;
      }

      // Check 48-hour cycle unless force=true
      if (!isForce && store.lastPhotosUpdated) {
        const elapsed = now - Number(store.lastPhotosUpdated);
        if (elapsed < FORTY_HOURS_MS) {
          const remainingHours = Math.round((FORTY_HOURS_MS - elapsed) / (60 * 60 * 1000));
          console.log(`[Cron Job] Skipping ${store.nameJP || store.nameCH}: updated recently (${remainingHours}h remaining until next 48h cycle).`);
          results.push({
            storeId,
            name: store.nameJP || store.nameCH,
            status: "skip",
            reason: `Updated recently (${remainingHours}h remaining in 48h cycle)`
          });
          continue;
        }
      }

      const searchQuery = store.nameCH || store.nameJP;
      console.log(`[Cron Job] Processing store: ${searchQuery} (${store.nameJP || ""})`);

      try {
        // Step A: Find Place ID using Find Place API
        // Use Chinese name first to accurately hit Google Maps Taiwan data
        const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
          searchQuery
        )}&inputtype=textquery&fields=place_id,photos&locationbias=circle:5000@${store.lat},${store.lng}&key=${apiKey}`;

        const findPlaceRes = await fetch(findPlaceUrl);
        const findPlaceData = await findPlaceRes.json();

        let photos = [];
        let placeId = null;

        if (findPlaceData.status === "OK" && findPlaceData.candidates && findPlaceData.candidates.length > 0) {
          const candidate = findPlaceData.candidates[0];
          placeId = candidate.place_id;
          photos = candidate.photos || [];
        }

        // Step B: Fallback search with nameJP if Chinese name produced no results
        if ((!photos || photos.length === 0) && store.nameJP && store.nameJP !== searchQuery) {
          const fallbackUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
            store.nameJP
          )}&inputtype=textquery&fields=place_id,photos&locationbias=circle:5000@${store.lat},${store.lng}&key=${apiKey}`;
          const fallbackRes = await fetch(fallbackUrl);
          const fallbackData = await fallbackRes.json();
          if (fallbackData.status === "OK" && fallbackData.candidates && fallbackData.candidates.length > 0) {
            placeId = fallbackData.candidates[0].place_id;
            photos = fallbackData.candidates[0].photos || [];
          }
        }

        // Step C: If photos are empty in candidate, try Place Details API
        if ((!photos || photos.length === 0) && placeId) {
          console.log(`[Cron Job] Photos missing in search candidate for ${searchQuery}, calling Place Details...`);
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${apiKey}`;
          const detailsRes = await fetch(detailsUrl);
          const detailsData = await detailsRes.json();
          if (detailsData.status === "OK" && detailsData.result && detailsData.result.photos) {
            photos = detailsData.result.photos;
          }
        }

        if (!photos || photos.length === 0) {
          console.log(`[Cron Job] No photos found on Google Maps for ${searchQuery}.`);
          results.push({ storeId, name: searchQuery, status: "skip", reason: "No photos found on Google Maps" });
          continue;
        }

        // Step D: Keep Google Drive images and only update Google Maps image slots (up to 4 total)
        const currentImages: string[] = store.images || [];
        const driveImages = currentImages.filter((url: string) => 
          url && (url.includes("drive.google.com") || url.includes("googleusercontent.com/d/"))
        );
        const availableSlots = Math.max(0, 4 - driveImages.length);

        if (availableSlots <= 0) {
          console.log(`[Cron Job] Skipping ${searchQuery}: all 4 slots occupied by Google Drive images.`);
          results.push({ storeId, name: searchQuery, status: "skip", reason: "All 4 slots occupied by Google Drive images" });
          continue;
        }

        const mapsImages: string[] = [];
        const maxPhotos = Math.min(photos.length, availableSlots);

        for (let i = 0; i < maxPhotos; i++) {
          const photoRef = photos[i].photo_reference;
          const photoApiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photoRef}&key=${apiKey}`;

          try {
            // Fetch with HEAD method and follow redirects to get the permanent CDN URL
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

        if (mapsImages.length > 0) {
          // Step E: Update images and lastPhotosUpdated timestamp in Firebase
          const storeImagesRef = dbRef(db, `stores/${storeId}/images`);
          await set(storeImagesRef, finalImages);
          
          const storeUpdatedRef = dbRef(db, `stores/${storeId}/lastPhotosUpdated`);
          await set(storeUpdatedRef, now);

          console.log(`[Cron Job] Successfully updated photos for ${searchQuery}. Drive: ${driveImages.length}, Maps: ${mapsImages.length}`);
          results.push({ storeId, name: searchQuery, status: "updated", driveCount: driveImages.length, mapsCount: mapsImages.length });
        } else {
          console.log(`[Cron Job] No new photos resolved for ${searchQuery}.`);
          results.push({ storeId, name: searchQuery, status: "skip", reason: "No new Google Maps images resolved" });
        }
      } catch (storeError: any) {
        console.error(`[Cron Job Error] Error processing store ${searchQuery}:`, storeError);
        results.push({ storeId, name: searchQuery, status: "error", error: storeError.message });
      }
    }

    console.log(`[Cron Job] Execution finished. Processed: ${results.length}`);
    return NextResponse.json({
      success: true,
      processed: results.length,
      updatedCount: results.filter(r => r.status === "updated").length,
      details: results
    });
  } catch (error: any) {
    console.error("[Cron Job Error] General crash occurred:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
