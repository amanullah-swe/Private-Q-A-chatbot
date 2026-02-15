import { NextRequest, NextResponse } from "next/server";
import { createChat, getChats, deleteChat, updateChatTitle } from "@/lib/chat";

export async function GET() {
    try {
        const chats = await getChats();
        return NextResponse.json(chats);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { title } = await req.json();
        const id = await createChat(title);
        return NextResponse.json({ id, title });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        await deleteChat(id);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { id, title } = await req.json();
        if (!id || !title) {
            return NextResponse.json({ error: "Missing id or title" }, { status: 400 });
        }
        await updateChatTitle(id, title);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
