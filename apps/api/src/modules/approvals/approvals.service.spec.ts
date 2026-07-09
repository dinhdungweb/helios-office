import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ApprovalsService } from "./approvals.service";

describe("ApprovalsService", () => {
  let service: ApprovalsService;

  beforeEach(() => {
    service = new ApprovalsService();
  });

  it("returns pending approval tasks", () => {
    expect(service.findPending()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "pending"
        })
      ])
    );
  });

  it("records an approval decision", () => {
    expect(service.decide("apr-001", "approved")).toEqual(
      expect.objectContaining({
        id: "apr-001",
        status: "approved",
        decidedAt: expect.any(String)
      })
    );
  });

  it("rejects unknown approvals", () => {
    expect(() => service.decide("missing", "approved")).toThrow(NotFoundException);
  });

  it("rejects invalid decisions", () => {
    expect(() => service.decide("apr-001", "invalid" as never)).toThrow(BadRequestException);
  });
});
