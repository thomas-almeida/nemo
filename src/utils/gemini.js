import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI(process.env.GEMINI_API_KEY)

export default async function gemini(content) {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: content
    })

    return response.text.replace(/^```(?:json)?\n|\n```$/g, '').trim()
}
