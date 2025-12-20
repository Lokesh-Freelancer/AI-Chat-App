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
            model: "gemini-2.5-flash-lite", // Reverting to your preferred model
            systemInstruction: `You are Promptly AI, a premium and helpful AI assistant. You are talking to ${userName}. Always be polite, concise, and helpful. Mention their name occasionally to stay personal.`,
            generationConfig: {
                maxOutputTokens: 8000,
                temperature: 0.8,
            },
        });

        // Gemini expects: [ { role: "user", parts: [{ text: "..." }] }, { role: "model", parts: [{ text: "..." }] } ]
        // 1. Filter out UI-only welcome message
        let filteredHistory = history ? history.filter(msg => msg.id !== 'welcome') : [];

        // 2. Map to Gemini format and ensure alternating roles (user -> model -> user -> model)
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

        const result = await chat.sendMessageStream(message);

        // Create a streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        if (chunkText) {
                            controller.enqueue(encoder.encode(chunkText));
                        }
                    }
                    controller.close();
                } catch (err) {
                    controller.error(err);
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });

    } catch (error) {
        console.error("DETAILED Gemini API Error:", error);
        return NextResponse.json(
            { reply: `AI Error: ${error.message || "Unknown error"}` },
            { status: 500 }
        );
    }
}
