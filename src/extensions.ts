/** Lower-cases extensions and ensures a leading dot. */
export function normalizeExtensions(extensions: string[]): string[] {
    return extensions
        .filter(ext => typeof ext === "string" && ext.trim() !== "")
        .map(ext => {
            const lower = ext.trim().toLowerCase();
            return lower.startsWith(".") ? lower : `.${lower}`;
        });
}

/** Returns the matched extension, `""` when no filter is set, or `null` when nothing matches. */
export function matchExtension(fileName: string, extensions: string[]): string | null {
    if (extensions.length === 0) return "";
    const lower = fileName.toLowerCase();
    // Longest first so ".tar.gz" wins over ".gz".
    let best: string | null = null;
    for (const ext of extensions) {
        if (lower.endsWith(ext) && lower.length > ext.length && (best === null || ext.length > best.length))
            best = ext;
    }
    return best;
}
