import { nanoid as secureNanoid } from "nanoid";
import { nanoid as fallbackNanoid } from "nanoid/non-secure";

const selectGenerator = (): ((size?: number) => string) => {
  try {
    // Attempt to generate a short id to verify secure randomness is allowed.
    secureNanoid(4);
    return secureNanoid;
  } catch (error) {
    console.warn("Secure nanoid generation unavailable, falling back to non-secure generator.", error);
    return fallbackNanoid;
  }
};

const generator = selectGenerator();

export const generateId = (size = 8): string => generator(size);
