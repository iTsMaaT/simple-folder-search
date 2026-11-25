import type { ScanOptions } from "./types";

export type CompiledRule = (fullPath: string, name: string, relative: string, isDirectory: boolean) => boolean;

export function compileIgnoreRules(ignore: ScanOptions["ignore"]): CompiledRule[] {
    if (ignore === undefined) return [];
    const rules = Array.isArray(ignore) ? ignore : [ignore];

    return rules.map((rule): CompiledRule => {
        if (typeof rule === "function") return (fullPath, _name, _relative, isDirectory) => rule(fullPath, isDirectory);
        if (rule instanceof RegExp) return (_fullPath, name, relative) => testRegExp(rule, name) || testRegExp(rule, relative);
        if (typeof rule === "string") {
            const regex = globToRegExp(rule.replace(/\\/g, "/").replace(/^\.?\//, "").replace(/\/$/, ""));
            // Patterns with a slash match the path relative to the root, others match the entry name.
            return rule.includes("/")
                ? (_fullPath, _name, relative) => regex.test(relative)
                : (_fullPath, name) => regex.test(name);
        }
        throw new Error("Ignore rules must be strings, regular expressions or functions.");
    });
}

function testRegExp(regex: RegExp, value: string): boolean {
    regex.lastIndex = 0; // global / sticky regexes are stateful
    return regex.test(value);
}

export function globToRegExp(glob: string): RegExp {
    let source = "";
    for (let i = 0; i < glob.length; i++) {
        const char = glob[i];
        if (char === "*") {
            if (glob[i + 1] === "*") {
                source += ".*";
                i++;
                if (glob[i + 1] === "/") i++;
            } else {
                source += "[^/]*";
            }
        } else if (char === "?") {
            source += "[^/]";
        } else {
            source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
        }
    }
    return new RegExp(`^${source}$`, process.platform === "win32" ? "i" : "");
}
