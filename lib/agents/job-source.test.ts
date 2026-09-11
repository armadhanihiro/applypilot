import {
  describe,
  expect,
  it,
} from "vitest";

import {
  extractJobId,
  getSourceName,
  isRelevantSearchResult,
} from "@/lib/agents/job-source";

describe("job source utilities", () => {
  describe("getSourceName", () => {
    it("extracts SEEK", () => {
      expect(
        getSourceName("au.seek.com")
      ).toBe("seek");
    });

    it("extracts LinkedIn", () => {
      expect(
        getSourceName(
          "www.linkedin.com"
        )
      ).toBe("linkedin");
    });

    it("extracts Greenhouse", () => {
      expect(
        getSourceName(
          "boards.greenhouse.io"
        )
      ).toBe("greenhouse");
    });

    it("extracts Lever", () => {
      expect(
        getSourceName(
          "jobs.lever.co"
        )
      ).toBe("lever");
    });

    it("extracts Workday", () => {
      expect(
        getSourceName(
          "company.myworkdayjobs.com"
        )
      ).toBe("myworkdayjobs");
    });
  });

  describe("extractJobId", () => {
    it("extracts numeric job IDs", () => {
      expect(
        extractJobId(
          "https://au.seek.com/job/94352688"
        )
      ).toBe("94352688");
    });

    it("extracts slug-based job IDs", () => {
      expect(
        extractJobId(
          "https://company.com/careers/software-engineer"
        )
      ).toBe("software-engineer");
    });
  });

  describe("isRelevantSearchResult", () => {
    it("accepts exact job ID match", () => {
      expect(
        isRelevantSearchResult(
          {
            title:
              "Software Developer",
            url:
              "https://example.com/jobs/94352688",
            snippet:
              "Job reference 94352688",
          },
          "94352688",
          "seek"
        )
      ).toBe(true);
    });

    it("accepts slug match with source signal", () => {
      expect(
        isRelevantSearchResult(
          {
            title:
              "Software Engineer | Acme",
            url:
              "https://careers.acme.com/software-engineer",
            snippet:
              "Acme is hiring a Software Engineer.",
          },
          "software-engineer",
          "acme"
        )
      ).toBe(true);
    });

    it("rejects unrelated job", () => {
      expect(
        isRelevantSearchResult(
          {
            title:
              "Senior Account Manager",
            url:
              "https://example.com/jobs/123",
            snippet:
              "Sales and account management role.",
          },
          "94352688",
          "seek"
        )
      ).toBe(false);
    });

    it("rejects similar slug from wrong source", () => {
      expect(
        isRelevantSearchResult(
          {
            title:
              "Software Engineer",
            url:
              "https://othercompany.com/jobs/software-engineer",
            snippet:
              "Software Engineer opening.",
          },
          "software-engineer",
          "acme"
        )
      ).toBe(false);
    });
  });
});