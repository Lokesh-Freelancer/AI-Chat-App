import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// GET: Export all chats with messages
export async function GET(req) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const chats = await prisma.chat.findMany({
            where: { userId: session.user.id },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json({
            exportedAt: new Date().toISOString(),
            user: {
                name: session.user.name,
                email: session.user.email
            },
            totalChats: chats.length,
            chats: chats
        });
    } catch (error) {
        console.error("Failed to export chats:", error);
        return NextResponse.json({ error: "Failed to export chats" }, { status: 500 });
    }
}
