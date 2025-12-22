import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// ---------- Helpers ----------

function detectIntent(userMessage) {
    const msg = userMessage.toLowerCase();

    if (/(code|bug|error|fix|function|api)/.test(msg)) return "CODE";
    if (/(resume|ats|job|cv)/.test(msg)) return "RESUME";
    if (/(blog|caption|content|creative)/.test(msg)) return "CONTENT";
    return "CHAT";
}

function getTemperature(intent) {
    switch (intent) {
        case "CODE": return 0.15;
        case "RESUME": return 0.2;
        case "CONTENT": return 0.7;
        default: return 0.3;
    }
}

function getMaxTokens(intent) {
    switch (intent) {
        case "CODE": return 3000;
        case "RESUME": return 3500;
        case "CONTENT": return 6000;
        default: return 2500;
    }
}

// ---------- API Route ----------

export async function POST(req) {
    try {
        const { message, history, image } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;
        const session = await getServerSession(authOptions);
        const userName = session?.user?.name;

        if (!apiKey) {
            return NextResponse.json(
                { reply: "Missing GEMINI_API_KEY in environment variables." },
                { status: 200 }
            );
        }

        const intent = detectIntent(message);
        let temperature = getTemperature(intent);
        const maxOutputTokens = getMaxTokens(intent);

        if (message.length > 400 && intent === "CONTENT") {
            temperature = 0.6;
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // --- FETCH GLOBAL CONTEXT (DEEP MEMORY) ---
        let globalContext = "";
        if (session?.user?.id) {
            try {
                // Fetch the last 20 messages across all chats for this user (most recent first)
                const recentMessages = await prisma.message.findMany({
                    where: {
                        chat: { userId: session.user.id },
                        // Optional: skip current message? No, we need previous context
                    },
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    select: { role: true, content: true, chat: { select: { title: true } } }
                });

                if (recentMessages.length > 0) {
                    globalContext = "\n\nCRITICAL CONTEXT (Previous interactions across all chats):\n";
                    // Reverse to show chronological order
                    recentMessages.reverse().forEach(m => {
                        globalContext += `[Chat: ${m.chat.title}] ${m.role === 'user' ? 'User' : 'AI'}: ${m.content}\n`;
                    });
                }
            } catch (err) {
                console.error("Memory fetch error:", err);
            }
        }

        let instructionSet = `
You are Promptly AI, a premium and accurate AI assistant.
${userName ? `You are talking to ${userName}. You know their name and must never deny it.` : `You are talking to a Guest User. Be helpful and professional, and if they ask for personalized help, politely mention they can log in to save history and get personalized responses.`}

${globalContext}

DIRECTIONS:
1. GLOBAL CONTEXT: User might ask about something they discussed in a different chat. Use the context above (long-term memory) to answer correctly.
2. DOCUMENT ANALYSIS: If the user uploads a PDF or Resume, analyze it professionally. Provide feedback on structure, keywords, clarity, and impact.
3. PROFESSIONALISM: Be accurate, concise, and helpful.
`;

        if (intent === "CODE") {
            instructionSet += `
You are an expert Software Engineer.
Provide only correct, secure, production-ready code.
Do not invent APIs or libraries.
If unsure, ask for clarification.
`;
        } else if (intent === "RESUME") {
            instructionSet += `
You are a professional HR and ATS expert.
Focus on keywords, clarity, and measurable achievements.
Avoid fluff.
`;
        } else if (intent === "CONTENT") {
            instructionSet += `
You are a creative content writer.
Be engaging, clear, and expressive.
`;
        } else {
            instructionSet += `
Always be polite, concise, and helpful.
Mention the user's name naturally.
`;
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            systemInstruction: instructionSet,
            generationConfig: {
                temperature,
                maxOutputTokens,
            },
        });

        const filteredHistory = history?.filter(msg => msg.id !== "welcome") || [];
        const chatHistory = [];
        let lastRole = null;

        for (const msg of filteredHistory) {
            const role = msg.role === "user" ? "user" : "model";
            if (chatHistory.length === 0 && role !== "user") continue;
            if (role !== lastRole) {
                chatHistory.push({ role, parts: [{ text: msg.text }] });
                lastRole = role;
            }
        }

        const chat = model.startChat({ history: chatHistory });

        // --- MULTIMODAL HANDLING ---
        let promptParts = [message];

        if (image) {
            try {
                // Extract base64 data and mime type from data:mime/type;base64,data
                const [mimeInfo, base64Data] = image.split(",");
                const mimeType = mimeInfo.split(":")[1].split(";")[0];

                promptParts = [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    },
                    message
                ];
            } catch (err) {
                console.error("Image processing error:", err);
            }
        }

        const result = await chat.sendMessage(promptParts);

        return NextResponse.json({ reply: result.response.text() });

    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json(
            { reply: "AI encountered an unexpected error." },
            { status: 200 }
        );
    }
}
