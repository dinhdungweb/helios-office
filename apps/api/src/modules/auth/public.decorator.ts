import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "helios:is_public";

// Opts a route or controller out of the global JwtAuthGuard. Use only for routes that are
// meant to be reachable without a user session or that authenticate by other means.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
