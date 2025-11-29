import { extractText } from "unpdf";

export async function extractPdfText(buffer) {

    // ✅ Converter Buffer -> Uint8Array
    const uint8Array = new Uint8Array(buffer);

    const { text } = await extractText(uint8Array);

    return text;
}
