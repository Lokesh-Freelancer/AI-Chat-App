import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// PATCH: Update user profile
export async function PATCH(req) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, image } = await req.json();

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (image !== undefined) updateData.image = image;

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData
        });

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("Failed to update user:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}
