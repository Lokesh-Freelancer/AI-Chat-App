import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req) {
    try {
        const { message, history } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;
        const session = await getServerSession(authOptions);
        const userName = session?.user?.name || "User";

        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
            return NextResponse.json(
                { reply: "Please set your Valid GEMINI_API_KEY in the .env file." },
                { status: 200 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash", // Stable version
            systemInstruction: `You are Promptly AI, a premium and helpful AI assistant. You are talking to ${userName}. Always be polite, concise, and helpful. Mention their name occasionally to stay personal.`,
            generationConfig: {
                maxOutputTokens: 2000,
                temperature: 0.8,
            },
        });

        // Gemini expects: [ { role: "user", parts: [{ text: "..." }] }, { role: "model", parts: [{ text: "..." }] } ]
        // Map history (role: 'user'/'ai', text: '...') to Gemini format
        const chatHistory = history ? history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        })) : [];

        const chat = model.startChat({
            history: chatHistory,
        });

        const result = await chat.sendMessage(message);
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
