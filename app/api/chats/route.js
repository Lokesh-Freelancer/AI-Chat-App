import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { generateShortId } from "@/lib/utils";

// GET: Fetch all chats for the user
export async function GET(req) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log(`[GET /api/chats] Session User ID: ${session.user.id}`);
        const chats = await prisma.chat.findMany({
            where: { userId: session.user.id },
            orderBy: { updatedAt: 'desc' },
            select: { id: true, title: true, updatedAt: true }
        });
        console.log(`[GET /api/chats] Found ${chats.length} chats`);
        return NextResponse.json(chats);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
    }
}

// POST: Create a new chat
export async function POST(req) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { message } = await req.json(); // Optional: use first message to set title
        const title = message ? message.slice(0, 30) + (message.length > 30 ? '...' : '') : "New Chat";
        console.log(`[POST /api/chats] Creating new chat for user: ${session.user.id}, title: ${title}`);

        // Generate a unique 6-char ID
        let shortId = generateShortId(6);
        let exists = await prisma.chat.findUnique({ where: { id: shortId } });

        // Simple collision retry
        while (exists) {
            shortId = generateShortId(6);
            exists = await prisma.chat.findUnique({ where: { id: shortId } });
        }

        const chat = await prisma.chat.create({
            data: {
                id: shortId,
                userId: session.user.id,
                title: title,
            }
        });
        console.log(`[POST /api/chats] Created chat: ${chat.id}`);
        return NextResponse.json(chat);
    } catch (error) {
        console.error("Failed to create chat:", error);
        return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
    }
}
