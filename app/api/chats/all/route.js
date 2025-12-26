import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// DELETE: Clear all chats for user
export async function DELETE(req) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Delete all chats (messages will be cascade deleted)
        await prisma.chat.deleteMany({
            where: { userId: session.user.id }
        });

        return NextResponse.json({ success: true, message: "All chats cleared" });
    } catch (error) {
        console.error("Failed to clear chats:", error);
        return NextResponse.json({ error: "Failed to clear chats" }, { status: 500 });
    }
}
