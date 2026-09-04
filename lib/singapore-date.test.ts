import { describe, expect, it } from "vitest";
import { getSingaporeDate } from "./singapore-date";
describe("Singapore date",()=>{it("rolls over at Singapore midnight",()=>{expect(getSingaporeDate(new Date("2026-09-04T15:59:59Z"))).toBe("2026-09-04");expect(getSingaporeDate(new Date("2026-09-04T16:00:00Z"))).toBe("2026-09-05")})});
