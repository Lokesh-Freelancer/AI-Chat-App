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
${userName ? `You are talking to ${userName}. Mention their name naturally, but avoid robotic repetition or double greetings (e.g., don't say "Hello [Name]" if you've already greeted them).` : `You are talking to a Guest User. Be helpful and professional.`}

${globalContext}

DIRECTIONS:
1. NATURAL CONVERSATION: If the user asks "Who am I?", answer directly and conversationally without repeating a formal greeting. Use the global context to personalize the answer.
2. GLOBAL CONTEXT: User might ask about something they discussed in a different chat. Use the context above to answer correctly.
3. DOCUMENT ANALYSIS: If the user uploads a PDF or Resume, provide a **direct, copy-paste ready** summary or analysis. Do not use phrases like "This resume shows...". Instead, use "Senior Developer with experience in...".
4. PROACTIVENESS: After your main answer, always provide a small section with 2-3 "Next Steps" or "Pro-Tips".
5. PROFESSIONALISM: Be accurate, concise, and helpful.
`;

        if (intent === "CODE") {
            instructionSet += `
You are an expert Software Engineer.
Provide only correct, secure, production-ready code.
Offer tips on performance or error handling at the end.
`;
        } else if (intent === "RESUME") {
            instructionSet += `
You are a professional HR and ATS expert.
Focus on keywords, measurable achievements, and impact.
Always use "first-person" ready-to-use professional language for summaries.
At the end, offer to rewrite for specific job titles or ATS optimization.
`;
        } else if (intent === "CONTENT") {
            instructionSet += `
You are a creative content writer.
Be engaging, clear, and expressive.
Offer to change the tone or format (e.g., 'Make it short for Twitter') at the end.
`;
        } else {
            instructionSet += `
Always be polite, concise, and helpful.
Suggest related topics the user might be interested in.
`;
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
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
            const role = msg.role === 'user' ? 'user' : 'model';
            const textContent = msg.text || msg.content || "";

            // Skip empty messages in history as they confuse the AI
            if (!textContent.trim() && !msg.image) continue;

            if (role !== lastRole) {
                chatHistory.push({ role, parts: [{ text: textContent || (msg.image ? "[Sent an image]" : "") }] });
                lastRole = role;
            }
        }

        const chat = model.startChat({ history: chatHistory });

        // --- MULTIMODAL HANDLING ---
        let promptParts = [message || "Analyze this"];

        if (image && typeof image === 'string') {
            try {
                let base64Data = image;
                let mimeType = "image/jpeg"; // Default fallback

                if (image.includes(",")) {
                    const parts = image.split(",");
                    if (parts.length > 1) {
                        base64Data = parts[1];
                        const mimeMatch = parts[0].match(/data:(.*?);/);
                        if (mimeMatch) mimeType = mimeMatch[1];
                    }
                }

                if (base64Data && base64Data.length > 10) { // Check if base64Data is substantial
                    promptParts = [
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: mimeType
                            }
                        },
                        message || "Analyze this image" // Default text prompt if message is empty
                    ];
                }
            } catch (err) {
                console.error("Image processing error:", err);
            }
        }

        const result = await chat.sendMessage(promptParts);

        return NextResponse.json({ reply: result.response.text() });

    } catch (error) {
        console.error("Gemini API Error Detail:", error);
        return NextResponse.json(
            { reply: `AI encountered an unexpected error: ${error.message || "Unknown error"}` },
            { status: 200 }
        );
    }
}
