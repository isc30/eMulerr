export async function concurrentForEach<T>(
    concurrency: number,
    items: T[],
    fn: (t: T) => Promise<void>
) {
    const missingItems = [...items]
    const tasks = []

    while (missingItems.length > 0 || tasks.length > 0) {
        while (tasks.length < concurrency && missingItems.length > 0) {
            const i = missingItems.shift()
            if (i) tasks.push(fn(i))
        }

        const p = await Promise.race(
            tasks.map((p, index) =>
                p.then(
                    (v) => ({ index, v }),
                    (err) => ({ index, err }),
                )
            )
        )
        tasks.splice(p.index, 1)

        if ('err' in p) {
            throw p.err
        }
    }
}
