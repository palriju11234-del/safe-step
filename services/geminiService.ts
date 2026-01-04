
import { GoogleGenAI } from "@google/genai";
import { Location, Settings } from "../types";

// Note: Using Gemini 2.5 series as required for Google Maps grounding
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Google Maps grounding to get a human-readable, accurate description of the location.
 */
export const getDetailedLocation = async (loc: Location): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-latest",
      contents: "What is the exact address or closest landmark at this location? Be extremely specific for an emergency situation.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: loc.lat,
              longitude: loc.lng
            }
          }
        }
      },
    });

    // Extract the grounded text
    const text = response.text || "near coordinates " + loc.lat.toFixed(5) + ", " + loc.lng.toFixed(5);
    
    // Extract potential links from grounding metadata if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const mapUri = chunks?.find(c => c.maps?.uri)?.maps?.uri;

    return mapUri ? `${text} (Details: ${mapUri})` : text;
  } catch (error) {
    console.error("Maps grounding failed:", error);
    return `at coordinates ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
  }
};

export const generateSmsContent = async (
  patientName: string,
  currentLoc: Location,
  settings: Settings,
  distance: number,
  detailedLocation: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a concise SMS alert.
      Patient: ${patientName}
      Detailed Location Context: ${detailedLocation}
      Distance from Home: ${distance.toFixed(0)} meters.
      Safety Radius: ${settings.radiusMeters}m.
      Map Link: https://www.google.com/maps?q=${currentLoc.lat},${currentLoc.lng}
      Keep it under 160 characters.`,
    });
    return response.text || `ALERT: ${patientName} is ${distance.toFixed(0)}m from home. Near: ${detailedLocation}. Link: https://www.google.com/maps?q=${currentLoc.lat},${currentLoc.lng}`;
  } catch (error) {
    return `ALERT: ${patientName} is outside safety zone (${distance.toFixed(0)}m away). Location: ${detailedLocation}. https://www.google.com/maps?q=${currentLoc.lat},${currentLoc.lng}`;
  }
};

export const getSafetyTips = async (history: Location[]): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Movement history: ${JSON.stringify(history.slice(-5))}. Provide one safety tip for an Alzheimer's caretaker.`,
    });
    return response.text || "Ensure the patient has an ID bracelet with contact info.";
  } catch (error) {
    return "Keep a recent photo of the patient available at all times.";
  }
};
