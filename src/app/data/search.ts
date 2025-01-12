import { amuleDoSearch, amuleGetStats } from "amule/amule"
import { toEd2kLink, toMagnetLink } from "~/links"
import { toEntries, groupBy, skipFalsy } from "~/utils/array"
import { logger } from "~/utils/logger"
import { sanitizeFilename, setReleaseGroup } from "~/utils/naming"
import { searchKnown, trackKnown } from "./known"

// Updated sanitizeFilename function
function sanitizeFilename(filename: string) {
    const specialCharMap: { [key: string]: string } = {
        // Add the special character mappings here
        "Ä": "A", "Á": "A", "À": "A", "Â": "A", "Æ": "A", "Å": "A", "Ã": "A", "Ä": "A", "Å": "A", "Ă": "A", "Ą": "A", "Â": "A", "Ǎ": "A", "É": "E", "È": "E", "Ê": "E", "Ë": "E", "Ė": "E", "Ę": "E", "Ȩ": "E", "Ē": "E", "Ĕ": "E", "Ě": "E", "Í": "I", "Ì": "I", "Î": "I", "Ï": "I", "Ǐ": "I", "Ĩ": "I", "Į": "I", "Ì": "I", "Ī": "I", "Ó": "O", "Ò": "O", "Ô": "O", "Ö": "O", "Ő": "O", "Œ": "O", "Ø": "O", "Ǒ": "O", "Õ": "O", "Ȍ": "O", "Ú": "U", "Ù": "U", "Û": "U", "Ü": "U", "Ű": "U", "Ǔ": "U", "Ũ": "U", "Ų": "U", "Ū": "U", "Ý": "Y", "Ŷ": "Y", "Ÿ": "Y",
        "ä": "a", "á": "a", "à": "a", "â": "a", "æ": "a", "å": "a", "ã": "a", "ä": "a", "å": "a", "ă": "a", "ą": "a", "â": "a", "ǎ": "a", "é": "e", "è": "e", "ê": "e", "ë": "e", "ė": "e", "ę": "e", "ȩ": "e", "ē": "e", "ĕ": "e", "ě": "e", "í": "i", "ì": "i", "î": "i", "ï": "i", "ǐ": "i", "ĩ": "i", "į": "i", "ì": "i", "ī": "i", "ó": "o", "ò": "o", "ô": "o", "ö": "o", "ő": "o", "œ": "o", "ø": "o", "ǒ": "o", "õ": "o", "ȍ": "o", "ú": "u", "ù": "u", "û": "u", "ü": "u", "ű": "u", "ǔ": "u", "ũ": "u", "ų": "u", "ū": "u", "ý": "y", "ŷ": "y", "ÿ": "y",
        "Ç": "C", "Ñ": "N", "Þ": "P", "ß": "ss", "Đ": "D", "Ď": "D", "Ň": "N", "Č": "C", "Ś": "S", "Š": "S", "Ž": "Z", "Ť": "T", "Ð": "D", "Ł": "L", "Ń": "N", "Ǹ": "N", "Ň": "N", "Ŋ": "N", "Ø": "O", "Ś": "S", "Ŝ": "S", "Š": "S", "Ś": "S", "Ź": "Z", "Ż": "Z", "Ž": "Z",
        "ç": "c", "ñ": "n", "þ": "p", "ß": "ss", "đ": "d", "ď": "d", "ň": "n", "č": "c", "ś": "s", "š": "s", "ž": "z", "ť": "t", "ð": "d", "ł": "l", "ń": "n", "ǹ": "n", "ň": "n", "ŋ": "n", "ø": "o", "ś": "s", "ŝ": "s", "š": "s", "ś": "s", "ź": "z", "ż": "z", "ž": "z",
        // Add more mappings as needed
        "'": ".", " ": "."
    };
    
    return filename.split('').map(char => specialCharMap[char] || char).join('');
}

export async function searchAndWaitForResults(q: string | undefined, ext?: string) {
    if (!q) {
        return []
    }

    const stats = await amuleGetStats()
    const [amuleResults, localResults] = await Promise.all([
        Promise.all([
            stats.serv_addr ? amuleDoSearch(q, ext, "global") : Promise.resolve([]),
            stats.kad_connected ? amuleDoSearch(q, ext, "kad") : Promise.resolve([]),
        ]).then((r) => r.flatMap((x) => x).map(postProcessResult)),
        searchKnown(q).then((x) => x.map(postProcessResult)),
    ])
    const allResults = [...amuleResults, ...localResults]

    // if the same hash+size, sum the sources
    const hashGroups = toEntries(groupBy(allResults, (f) => f.hash + f.size))
    hashGroups.forEach(([, results]) => {
        let sources = 0
        results.forEach((r) => {
            sources += r.sources
        })
        results.forEach((r) => {
            r.sources = sources
        })
    })

    // group same names
    const filteredResults = hashGroups
        .map(([, results]) =>
            toEntries(groupBy(results, (r) => r.name))
                .map(([, v]) => v[0])
                .filter(skipFalsy)
        )
        .flatMap((r) => r)

    trackKnown(amuleResults)
    logger.info(`Search '${q}' finished with ${filteredResults.length} results`)

    return filteredResults
}

function postProcessResult(
    r:
        | Awaited<ReturnType<typeof amuleDoSearch>>[number]
        | Awaited<ReturnType<typeof searchKnown>>[number]
) {
    const name = sanitizeFilename(setReleaseGroup(r.name))
    return {
        ...r,
        name,
        ed2kLink: toEd2kLink(r.hash, name, r.size),
        magnetLink: toMagnetLink(r.hash, name, r.size),
    }
}

type Query = {
    type: "AND" | "OR" | "NOT"
    nodes: QueryNode[]
}

type QueryNode = Query | string

// I wrote this at 1am, contemplating why the fuck did I think of local searches :)
function parseQuery(q: string): [QueryNode, string] {
    let modifier: "NOT" | null = null
    let current: Query = {
        type: "AND",
        nodes: [],
    }

    while (q.length > 0) {
        // end group
        if (q[0] === ")") {
            return [current, q.substring(1)]
        }

        // new group
        if (q[0] === "(") {
            const nested = parseQuery(q.substring(1).trim())
            current.nodes.push(nested[0])
            q = nested[1]
            continue
        }

        if (q.trim().startsWith("NOT")) {
            modifier = "NOT"
            q = q.substring(q.indexOf("NOT") + 3).trim()
            continue
        }

        if (q.trim().startsWith("OR")) {
            if (current.type !== "OR") {
                current = {
                    type: "OR",
                    nodes: current.nodes.length > 1 ? [current] : [current.nodes[0]!],
                }
            }
            q = q.substring(q.indexOf("OR") + 2).trim()
            continue
        }

        if (q.trim().startsWith("AND")) {
            if (current.type !== "AND") {
                current = {
                    type: "AND",
                    nodes: current.nodes.length > 1 ? [current] : [current.nodes[0]!],
                }
            }
            q = q.substring(q.indexOf("AND") + 3).trim()
            continue
        }

        // not a separator: keyword
        let str = ""
        while (
            q.length > 0 &&
            ![",", ";", ".", ":", "-", "_", "'", "/", "!", " ", "(", ")"].includes(
                q[0]!
            )
        ) {
            str += q[0]
            q = q.substring(1)
        }
        if (str) {
            switch (modifier) {
                case "NOT":
                    current.nodes.push({
                        type: "NOT",
                        nodes: [str],
                    })
                    break
                default:
                    current.nodes.push(str)
                    break
            }
            modifier = null
            continue
        }

        // its a separator, treat as AND
        if (current.type !== "AND" && current.nodes.length > 1) {
            current = {
                type: "AND",
                nodes: [current],
            }
        }
        q = q.substring(1)
    }

    return [current, ""]
}

// print('hola OR adios')
// print('hola adios')
// print('hola AND adios')
// print('hola AND adios bye')
// print('hola OR adios OR (juan AND NOT loco) wow OR NOT isc')
// print('hola OR (juan loco)')
// print('hola OR adios xd')
// print('hola OR adios OR xd')
// print('NOT loco')
// print('hey hola OR adios OR (juan AND NOT loco www) wow OR NOT isc')

// function print(q: string) {
//   console.log(q, JSON.stringify(parseQuery(q)[0], undefined, 2))
// }

export function testQuery(query: string, target: string) {
    const [q] = parseQuery(query)
    return testQueryImpl(q, target)
}

function testQueryImpl(query: QueryNode, target: string): boolean {
    if (typeof query === "string") {
        return target.toLowerCase().includes(query.toLowerCase())
    }

    if (query.type === "AND") {
        return query.nodes.every((n) => testQueryImpl(n, target))
    }

    if (query.type === "OR") {
        return query.nodes.some((n) => testQueryImpl(n, target))
    }

    if (query.type === "NOT") {
        return !query.nodes.every((n) => testQueryImpl(n, target))
    }

    return true
}
