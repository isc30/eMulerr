import "@total-typescript/ts-reset"

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PUID: string;
            PGID: string;
            PORT: string;
            ED2K_PORT: string;
            PASSWORD?: string;
        }
    }
}
