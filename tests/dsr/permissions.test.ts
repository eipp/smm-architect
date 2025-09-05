import { jest } from "@jest/globals";

// Mock database client before importing module under test
jest.mock("../../services/shared/database/client", () => ({
  withTenantContext: jest.fn(),
}));

// Mock heavy dependencies to avoid requiring external services
jest.mock("../../services/dsr/src/data-subject-rights-service", () => ({
  DataSubjectRightsService: class {},
  DSRRequest: class {},
}));

import * as dsrApi from "../../services/dsr/src/dsr-api";
import { withTenantContext } from "../../services/shared/database/client";

describe("verifyAdminPermission", () => {
  afterEach(() => {
    (withTenantContext as jest.Mock).mockReset();
  });

  it("allows admin roles", async () => {
    (withTenantContext as jest.Mock).mockImplementation(async (_t, fn) => {
      return fn({
        user: { findUnique: jest.fn().mockResolvedValue({ roles: ["admin"] }) },
      });
    });
    const result = await dsrApi.verifyAdminPermission("user1", "tenant1");
    expect(result).toBe(true);
  });

  it("denies non-admin roles", async () => {
    (withTenantContext as jest.Mock).mockImplementation(async (_t, fn) => {
      return fn({
        user: { findUnique: jest.fn().mockResolvedValue({ roles: ["user"] }) },
      });
    });
    const result = await dsrApi.verifyAdminPermission("user2", "tenant1");
    expect(result).toBe(false);
  });

  it("denies when role data is missing", async () => {
    (withTenantContext as jest.Mock).mockImplementation(async (_t, fn) => {
      return fn({ user: { findUnique: jest.fn().mockResolvedValue(null) } });
    });
    const result = await dsrApi.verifyAdminPermission("user3", "tenant1");
    expect(result).toBe(false);
  });
});

// Tests for getUserTenantRole mocking database access

describe("getUserTenantRole", () => {
  afterEach(() => {
    (withTenantContext as jest.Mock).mockReset();
  });

  it("returns role from database record", async () => {
    (withTenantContext as jest.Mock).mockImplementation(async (_t, fn) => {
      return fn({
        user: { findUnique: jest.fn().mockResolvedValue({ roles: ["admin"] }) },
      });
    });
    const role = await dsrApi.getUserTenantRole("user1", "tenant1");
    expect(role).toBe("admin");
  });

  it("returns null when user not found", async () => {
    (withTenantContext as jest.Mock).mockImplementation(async (_t, fn) => {
      return fn({ user: { findUnique: jest.fn().mockResolvedValue(null) } });
    });
    const role = await dsrApi.getUserTenantRole("userMissing", "tenant1");
    expect(role).toBeNull();
  });
});
