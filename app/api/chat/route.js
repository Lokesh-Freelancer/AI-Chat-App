import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { message, history } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
            return NextResponse.json(
                { reply: "Please set your Valid GEMINI_API_KEY in the .env file." },
                { status: 200 } // Return 200 so it shows as a message
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: {
                maxOutputTokens: 10000,
                temperature: 0.7, // Jitna zyada, utna creative response
            },
        });

        // Convert history to Gemini format if needed, but for simple MVP 
        // we might just send the last message or construct a prompt.
        // For a better chat experience, we should send history.
        // Gemini expects: { role: "user" | "model", parts: [{ text: "..." }] }

        // Simple 1-turn chat for stability first
        // const result = await model.generateContent(message);
        const result = await model.generateContent(message);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ reply: text });

    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json(
            { reply: "Error contacting AI service. Please check your API key and try again." },
            { status: 200 }
        );
    }
}
