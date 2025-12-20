import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req) {
    try {
        const { message } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
            return NextResponse.json(
                { reply: "Please set your Valid GEMINI_API_KEY in the .env file." },
                { status: 200 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite", // Restore user's choice
            generationConfig: {
                maxOutputTokens: 2000,
                temperature: 0.7,
            },
        });

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
