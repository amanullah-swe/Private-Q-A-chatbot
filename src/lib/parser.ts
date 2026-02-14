import mammoth from 'mammoth';

const ALLOWED_EXTENSIONS = ['.txt', '.pdf', '.md', '.docx'];

export function getFileExtension(filename: string): string {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    return ext;
}

export function isAllowedFile(filename: string): boolean {
    return ALLOWED_EXTENSIONS.includes(getFileExtension(filename));
}

export function getFileTypeEmoji(filename: string): string {
    const ext = getFileExtension(filename);
    switch (ext) {
        case '.pdf': return '📕';
        case '.docx': return '📘';
        case '.md': return '📗';
        case '.txt': return '📄';
        default: return '📄';
    }
}

export async function parseFile(file: File): Promise<string> {
    const ext = getFileExtension(file.name);

    if (!isAllowedFile(file.name)) {
        throw new Error(`Unsupported file type: ${ext}. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }

    switch (ext) {
        case '.txt':
        case '.md':
            return await file.text();

        case '.pdf': {
            const buffer = Buffer.from(await file.arrayBuffer());
            // Dynamic import to avoid pdf-parse trying to open test files at build time
            const pdfParse = (await import('pdf-parse')).default;
            const data = await pdfParse(buffer);
            if (!data.text || data.text.trim().length === 0) {
                throw new Error('PDF appears to be empty or contains only images (no extractable text).');
            }
            return data.text;
        }

        case '.docx': {
            const buffer = Buffer.from(await file.arrayBuffer());
            const result = await mammoth.extractRawText({ buffer });
            if (!result.value || result.value.trim().length === 0) {
                throw new Error('DOCX appears to be empty or could not be parsed.');
            }
            return result.value;
        }

        default:
            throw new Error(`Unsupported file type: ${ext}`);
    }
}
