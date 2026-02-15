import { NextRequest, NextResponse } from "next/server";
import { getHistory } from "@/lib/chat";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const history = await getHistory(id);
        return NextResponse.json(history);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
