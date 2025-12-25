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
        case "CODE": return 0.1;
        case "RESUME": return 0.2;
        case "CONTENT": return 0.8;
        default: return 0.4;
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
            return NextResponse.json({ reply: "API Key missing." }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const intent = detectIntent(message);


        let globalContext = "";
        if (session?.user?.id) {
            try {
                const recentMessages = await prisma.message.findMany({
                    where: { chat: { userId: session.user.id } },
                    take: 15, // Optimal context window
                    orderBy: { createdAt: 'desc' },
                    select: { role: true, content: true, chat: { select: { title: true } } }
                });

                if (recentMessages.length > 0) {
                    globalContext = "\n\n[USER HISTORY & MEMORY]:\n";
                    recentMessages.reverse().forEach(m => {
                        globalContext += `(Chat: ${m.chat.title}) ${m.role === 'user' ? 'User' : 'AI'}: ${m.content}\n`;
                    });
                }
            } catch (err) {
                console.error("Memory fetch error:", err);
            }
        }


        const instructionSet = `
        You are Promptly AI, an advanced AI assistant powered by Gemini 3 Flash.
        Current Date: ${new Date().toLocaleDateString()}
        User: ${userName || "Guest"}
        ${globalContext}

        INSTRUCTIONS:
        1. REAL-TIME KNOWLEDGE: Use Google Search tool whenever the user asks about current events, news, or latest tech.
        2. PERSONALIZATION: Reference user history naturally.
        3. FORMATTING: Use Markdown for clarity.
        4. INTENT: Current mode is ${intent}. Adjust your tone accordingly.
        5. OUTPUT: Provide 2-3 "Quick Next Steps" at the end of every response.
        `;


        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: instructionSet,
            tools: [{ googleSearch: {} }],
        });

        const generationConfig = {
            temperature: getTemperature(intent),
            maxOutputTokens: 4000,
            topP: 0.95,
        };


        const chatHistory = (history || [])
            .filter(msg => msg.id !== "welcome" && (msg.text || msg.content))
            .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text || msg.content }]
            }));

        const chat = model.startChat({
            history: chatHistory,
            generationConfig,
        });


        let promptParts = [];
        if (image && image.includes(",")) {
            const [header, base64Data] = image.split(",");
            const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";
            promptParts.push({ inlineData: { data: base64Data, mimeType } });
        }
        promptParts.push({ text: message || "Analyze the input" });


        const result = await chat.sendMessage(promptParts);
        const responseText = result.response.text();

        return NextResponse.json({ reply: responseText });

    } catch (error) {
        console.error("Gemini API Error:", error);

        // Handle Rate Limiting (429) specifically
        if (error.status === 429 || error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
            return NextResponse.json(
                { reply: "⚠️ **High Traffic Info:** Google's AI is currently overloaded (Rate Limit Reached). Please wait 1 minute and try again." },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { reply: "Sorry, I'm having trouble connecting to my brain. Please try again." },
            { status: 200 }
        );
    }
}