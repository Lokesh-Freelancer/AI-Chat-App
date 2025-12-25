import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        // Calculate the date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Delete chats updated OLDER than 30 days ago
        const result = await prisma.chat.deleteMany({
            where: {
                updatedAt: {
                    lt: thirtyDaysAgo
                }
            }
        });

        return NextResponse.json({
            success: true,
            deletedCount: result.count,
            message: `Deleted ${result.count} expired chats.`
        });
    } catch (error) {
        console.error("Cleanup Error:", error);
        return NextResponse.json({ error: "Failed to cleanup chats" }, { status: 500 });
    }
}
