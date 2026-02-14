import { NextRequest, NextResponse } from "next/server";
import { saveFile, getDocuments, deleteDocument } from "@/lib/storage";
import { addDocumentToStore, deleteDocumentFromStore } from "@/lib/rag";
import { parseFile, isAllowedFile } from "@/lib/parser";

export async function GET() {
    const docs = await getDocuments();
    return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!isAllowedFile(file.name)) {
            return NextResponse.json(
                { error: "Unsupported file type. Allowed: .txt, .pdf, .md, .docx" },
                { status: 400 }
            );
        }

        // Parse file content based on type
        const text = await parseFile(file);
        const metadata = await saveFile(file.name, text);

        await addDocumentToStore(metadata.id, text, {
            filename: metadata.filename,
            uploadedAt: metadata.uploadedAt
        });

        return NextResponse.json({ success: true, metadata });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "No id provided" }, { status: 400 });
        }

        const deletedDoc = await deleteDocument(id);
        if (!deletedDoc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        await deleteDocumentFromStore(id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
