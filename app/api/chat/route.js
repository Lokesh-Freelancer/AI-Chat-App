import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

// --- Helper Functions ---

function detectIntent(userMessage) {
    const msg = userMessage.toLowerCase();

    if (msg.includes("code") || msg.includes("bug") || msg.includes("error") ||
        msg.includes("fix") || msg.includes("function") || msg.includes("api")) {
        return "CODE";
    }

    if (msg.includes("resume") || msg.includes("ats") || msg.includes("job") || msg.includes("cv")) {
        return "RESUME";
    }

    if (msg.includes("blog") || msg.includes("caption") || msg.includes("content") || msg.includes("creative")) {
        return "CONTENT";
    }

    return "CHAT";
}

function getTemperature(intent) {
    switch (intent) {
        case "CODE": return 0.15;    // Strict & Logical
        case "RESUME": return 0.2;  // Professional & Factual
        case "CONTENT": return 0.7; // Creative & Expressive
        default: return 0.3;        // Balanced Chat
    }
}

// --- Main API Route ---

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

        // 1. Detect Intent and Get Temperature
        const intent = detectIntent(message);
        const temperature = getTemperature(intent);

        const genAI = new GoogleGenerativeAI(apiKey);

        // 2. Dynamic Instruction based on Intent
        let instructionSet = `You are Promptly AI, a premium and helpful AI assistant talking to ${userName}. You know their name because it is provided by the system, never deny it. `;

        if (intent === "CODE") {
            instructionSet += "You are an expert Software Engineer. Provide clean, secure, and well-documented code.";
        } else if (intent === "CONTENT") {
            instructionSet += "You are a Creative Content Writer. Use engaging language and be imaginative.";
        } else if (intent === "RESUME") {
            instructionSet += "You are a professional HR Expert. Focus on ATS optimization and professional phrasing.";
        } else {
            instructionSet += "Always be polite, concise, and helpful. Mention their name naturally in conversation.";
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            systemInstruction: instructionSet,
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: 10000,
            },
        });

        // 3. Prepare Chat History (Ensuring valid roles for Gemini)
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
