import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

// GET: Fetch messages for a chat
export async function GET(req, { params }) {
    const session = await getServerSession(authOptions);
    const chatId = params.id;

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify chat belongs to user and get title
    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { userId: true, title: true }
    });

    if (!chat || chat.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, content: true, image: true }
    });

    const uiMessages = messages.map(m => ({ id: m.id, role: m.role, text: m.content, image: m.image }));

    return NextResponse.json({ title: chat.title, messages: uiMessages });
}

// POST: Add message to chat (User or AI)
export async function POST(req, { params }) {
    const session = await getServerSession(authOptions);
    const chatId = params.id;

    if (!session) {
        // If mocking AI writing back, we might need to bypass session check or have a service key.
        // However, for this architecture, we assume the Client sends the AI response to be saved 
        // OR this route invokes the AI.
        // Design choice: Client calls /api/chat (AI), getting a response.
        // Client THEN calls this route to save User msg AND AI msg.
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { role, content, image } = await req.json();

        const message = await prisma.message.create({
            data: {
                chatId,
                role,
                content,
                image: image || null
            }
        });

        // Update chat timestamp & optionally title
        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            select: { title: true }
        });

        const updateData = { updatedAt: new Date() };

        // If it's a 'New Chat', update title with first user message
        if (chat && chat.title === "New Chat" && role === "user") {
            updateData.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
        }

        await prisma.chat.update({
            where: { id: chatId },
            data: updateData
        });

        return NextResponse.json({ message, updatedTitle: updateData.title });
    } catch (error) {
        return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }
}

// PATCH: Rename chat
export async function PATCH(req, { params }) {
    const session = await getServerSession(authOptions);
    const chatId = params.id;

    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { title } = await req.json();

        // Verify ownership
        const chat = await prisma.chat.findUnique({ where: { id: chatId }, select: { userId: true } });
        if (!chat || chat.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updatedChat = await prisma.chat.update({
            where: { id: chatId },
            data: { title }
        });

        return NextResponse.json(updatedChat);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update chat" }, { status: 500 });
    }
}

// DELETE: Delete chat
export async function DELETE(req, { params }) {
    const session = await getServerSession(authOptions);
    const chatId = params.id;

    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // Verify ownership
        const chat = await prisma.chat.findUnique({ where: { id: chatId }, select: { userId: true } });
        if (!chat || chat.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.chat.delete({
            where: { id: chatId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
    }
}
