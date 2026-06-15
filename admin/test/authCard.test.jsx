// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AuthCard from "../../src/design-system/components/AuthCard";

describe("AuthCard", () => {
  it("renders title", () => {
    const { getByText } = render(<AuthCard title="Sign in"><div /></AuthCard>);
    expect(getByText("Sign in")).toBeTruthy();
  });

  it("renders subtitle when provided", () => {
    const { getByText } = render(<AuthCard title="T" subtitle="Sub"><div /></AuthCard>);
    expect(getByText("Sub")).toBeTruthy();
  });

  it("renders children", () => {
    const { getByText } = render(<AuthCard title="T"><span>child</span></AuthCard>);
    expect(getByText("child")).toBeTruthy();
  });

  it("renders footer when provided", () => {
    const { getByText } = render(<AuthCard title="T" footer={<span>footer text</span>}><div /></AuthCard>);
    expect(getByText("footer text")).toBeTruthy();
  });

  it("does not render footer element when not provided", () => {
    const { container } = render(<AuthCard title="T"><div /></AuthCard>);
    expect(container.querySelectorAll("[data-component='AuthCard'] > div").length).toBe(1);
  });

  it("renders data-component attribute", () => {
    const { container } = render(<AuthCard title="T"><div /></AuthCard>);
    expect(container.querySelector('[data-component="AuthCard"]')).toBeTruthy();
  });
});
