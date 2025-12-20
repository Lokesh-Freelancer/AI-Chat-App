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
            model: "gemini-2.5-flash-lite",
            systemInstruction: `You are Promptly AI, a premium and helpful AI assistant. You are talking to ${userName}. Always be polite, concise, and helpful. Mention their name occasionally to stay personal.`,
            generationConfig: {
                maxOutputTokens: 2000,
                temperature: 0.7,
            },
        });

        // Ensure history alternates and starts with user
        let filteredHistory = history ? history.filter(msg => msg.id !== 'welcome') : [];
        let chatHistory = [];
        let lastRole = null;

        for (const msg of filteredHistory) {
            const currentRole = msg.role === 'user' ? 'user' : 'model';
            if (chatHistory.length === 0) {
                if (currentRole === 'user') {
                    chatHistory.push({ role: 'user', parts: [{ text: msg.text }] });
                    lastRole = 'user';
                }
            } else if (currentRole !== lastRole) {
                chatHistory.push({ role: currentRole, parts: [{ text: msg.text }] });
                lastRole = currentRole;
            }
        }

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
            { reply: `AI Error: ${error.message || "I encountered an error."}` },
            { status: 200 }
        );
    }
}
