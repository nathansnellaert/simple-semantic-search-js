// src/index.js

function normalizeText(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

function getExtendedNeighbors(wordGraph, word, maxDepth) {
    const neighbors = new Map();
    const queue = [[word, 0]];

    while (queue.length > 0) {
        const [currentWord, depth] = queue.shift();
        if (depth > maxDepth || neighbors.has(currentWord)) continue;

        neighbors.set(currentWord, depth);
        if (wordGraph[currentWord]) {
            for (const neighbor of wordGraph[currentWord]) {
                queue.push([neighbor, depth + 1]);
            }
        }
    }

    return neighbors;
}

function weightedJaccardSimilarity(set1, set2) {
    let intersectionWeight = 0;
    let unionWeight = 0;

    for (const [word, depth] of set1) {
        const weight = depth === 0 ? 1 : 0.4;
        unionWeight += weight;
        if (set2.has(word)) {
            intersectionWeight += weight;
        }
    }

    for (const [word, depth] of set2) {
        if (!set1.has(word)) {
            const weight = depth === 0 ? 1 : 0.4;
            unionWeight += weight;
        }
    }

    return intersectionWeight / unionWeight;
}

class Search {
    constructor(wordGraph, maxDepth = 3) {
        this.wordGraph = wordGraph;
        this.maxDepth = maxDepth;
        this.index = [];
    }

    indexDocuments(docs) {
        this.index = docs.map(doc => ({
            text: doc,
            words: new Map(normalizeText(doc).split(' ').map(word => [word, 0]))
        }));
    }

    // noob placeholder implementation
    search(query, topK = 5) {
        const queryWords = new Map(normalizeText(query).split(' ').map(word => [word, 0]));
        const extendedQueryWords = new Map(queryWords);
        
        for (const [word] of queryWords) {
            const neighbors = getExtendedNeighbors(this.wordGraph, word, this.maxDepth);
            for (const [neighbor, depth] of neighbors) {
                if (!extendedQueryWords.has(neighbor) || extendedQueryWords.get(neighbor) > depth) {
                    extendedQueryWords.set(neighbor, depth);
                }
            }
        }
        
        const scores = this.index.map(doc => ({
            doc: doc.text,
            score: weightedJaccardSimilarity(extendedQueryWords, doc.words)
        }));

        scores.sort((a, b) => b.score - a.score);
        return scores.slice(0, topK).map(result => result.doc);
    }
}

async function load(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const decompressedData = await decompressGzip(arrayBuffer);
    const compressedGraph = JSON.parse(new TextDecoder().decode(decompressedData));
    
    const strings = compressedGraph.strings;
    
    const decompressedGraph = Object.fromEntries(
        Object.entries(compressedGraph.graph).map(([k, v]) => [
            strings[parseInt(k)],
            v.map(i => strings[i])
        ])
    );
    
    return new Search(decompressedGraph);
}

async function decompressGzip(arrayBuffer) {
    const ds = new DecompressionStream('gzip');
    const decompressedStream = new Response(arrayBuffer).body.pipeThrough(ds);
    return new Response(decompressedStream).arrayBuffer();
}


export { load };